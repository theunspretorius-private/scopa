import { randomBytes } from 'node:crypto';
import { forfeit, newMatch, nextRound, playMove, type MatchState } from '../src/engine/match';
import { legalMoves, type Move } from '../src/engine/rules';
import { mulberry32, randomSeed, pick, type Rng } from '../src/engine/rng';
import { other, type Seat } from '../src/engine/round';
import { buildView, toLastPlay, type EmoteId, type LastPlay, type RoomConfig, type ServerMsg } from '../src/net/protocol';

export const GRACE_MS = 60_000;
export const ROUND_END_AUTO_MS = 15_000;
export const MAX_TIMEOUTS = 3;

export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as NodeJS.Timeout),
};

interface SeatInfo {
  token: string;
  name: string;
  connected: boolean;
  timeouts: number;
  afk: boolean;
  graceDeadline: number | null;
  graceTimer: unknown;
}

export const newToken = (): string => randomBytes(18).toString('base64url');

export type JoinResult = { seat: Seat; token: string } | { error: 'room_full' };

/**
 * Server-authoritative match room. Owns shuffling, dealing, validation and timers.
 * Each seat only ever receives its own view (see buildView): the other hand and the stock are masked.
 */
export class Room {
  readonly seats: [SeatInfo | null, SeatInfo | null];
  match: MatchState | null = null;
  lastActivity: number;
  private seq = 0;
  private lastPlay: LastPlay | null = null;
  private forfeitBy: Seat | null = null;
  private turnDeadline: number | null = null;
  private turnTimer: unknown = null;
  private roundEndTimer: unknown = null;
  private continueVotes: [boolean, boolean] = [false, false];
  private rematchVotes: [boolean, boolean] = [false, false];
  private lastEmote: [number, number] = [0, 0];
  private readonly rng: Rng;

  constructor(
    readonly id: string,
    readonly config: RoomConfig,
    hostName: string,
    private readonly send: (seat: Seat, msg: ServerMsg) => void,
    private readonly clock: Clock = realClock,
    seed: number = randomSeed(),
  ) {
    this.rng = mulberry32(seed);
    this.seats = [this.makeSeat(hostName), null];
    this.lastActivity = clock.now();
  }

  get hostToken(): string {
    return this.seats[0]!.token;
  }

  private makeSeat(name: string): SeatInfo {
    return { token: newToken(), name, connected: false, timeouts: 0, afk: false, graceDeadline: null, graceTimer: null };
  }

  join(token: string | undefined, name: string): JoinResult {
    this.touch();
    for (const seat of [0, 1] as Seat[]) {
      const s = this.seats[seat];
      if (s && token && s.token === token) {
        if (name) s.name = name;
        return { seat, token: s.token };
      }
    }
    if (!this.seats[1]) {
      this.seats[1] = this.makeSeat(name || 'Player 2');
      return { seat: 1, token: this.seats[1].token };
    }
    return { error: 'room_full' };
  }

  connect(seat: Seat): void {
    const s = this.seats[seat]!;
    s.connected = true;
    this.touch();
    if (s.graceTimer) this.clock.clearTimeout(s.graceTimer);
    s.graceTimer = null;
    s.graceDeadline = null;
    if (!this.match && this.seats[1]?.connected && this.seats[0]?.connected) this.startMatch();
    else this.syncPause();
    this.broadcast();
  }

  disconnect(seat: Seat): void {
    const s = this.seats[seat];
    if (!s) return;
    s.connected = false;
    this.touch();
    if (this.match && this.match.status !== 'MATCH_OVER') {
      s.graceDeadline = this.clock.now() + GRACE_MS;
      s.graceTimer = this.clock.setTimeout(() => {
        s.graceTimer = null;
        if (!s.connected && this.match && this.match.status !== 'MATCH_OVER') this.doForfeit(seat);
      }, GRACE_MS);
    }
    this.syncPause();
    this.broadcast();
  }

  get connectedCount(): number {
    return this.seats.filter((s) => s?.connected).length;
  }

  private get paused(): boolean {
    return this.seats.some((s) => s && !s.connected);
  }

  private get pausedUntil(): number | null {
    const ds = this.seats.map((s) => s?.graceDeadline).filter((d): d is number => d != null);
    return ds.length ? Math.min(...ds) : null;
  }

  /** Stop the turn clock while someone is reconnecting; restart it fresh once everyone is back. */
  private syncPause(): void {
    if (!this.match || this.match.status !== 'IN_PROGRESS') return;
    if (this.paused) this.stopTurnTimer();
    else if (this.turnTimer === null) this.startTurnTimer();
  }

  private startMatch(): void {
    this.match = newMatch(this.config.target, this.rng, undefined, this.config.game ?? 'scopa');
    this.seq++;
    this.lastPlay = null;
    this.forfeitBy = null;
    this.continueVotes = [false, false];
    this.rematchVotes = [false, false];
    for (const s of this.seats) if (s) Object.assign(s, { timeouts: 0, afk: false });
    this.syncPause();
  }

  private startTurnTimer(): void {
    this.stopTurnTimer();
    if (!this.config.turnSeconds || !this.match || this.match.status !== 'IN_PROGRESS' || this.paused) return;
    const ms = this.config.turnSeconds * 1000;
    this.turnDeadline = this.clock.now() + ms;
    this.turnTimer = this.clock.setTimeout(() => {
      this.turnTimer = null;
      this.onTimeout();
    }, ms);
  }

  private stopTurnTimer(): void {
    if (this.turnTimer !== null) this.clock.clearTimeout(this.turnTimer);
    this.turnTimer = null;
    this.turnDeadline = null;
  }

  private onTimeout(): void {
    const m = this.match;
    if (!m || m.status !== 'IN_PROGRESS') return;
    const seat = m.round.turn;
    const s = this.seats[seat]!;
    s.timeouts += 1;
    s.afk = true;
    if (s.timeouts >= MAX_TIMEOUTS) return this.doForfeit(seat);
    const r = m.round;
    this.advance(pick(legalMoves(r.players[seat].hand, r.table, m.game), this.rng), true);
  }

  play(seat: Seat, move: Move): ServerMsg | null {
    this.touch();
    const m = this.match;
    if (!m || m.status !== 'IN_PROGRESS' || m.round.turn !== seat) return { t: 'error', code: 'not_your_turn' };
    if (this.paused) return { t: 'error', code: 'not_your_turn' };
    try {
      const s = this.seats[seat]!;
      this.advance(move, false);
      s.timeouts = 0;
      s.afk = false;
      this.broadcast();
      return null;
    } catch {
      return { t: 'error', code: 'illegal_move' };
    }
  }

  private advance(move: Move, timedOut: boolean): void {
    const { match, result } = playMove(this.match!, move); // throws on illegal
    this.match = match;
    this.lastPlay = toLastPlay(++this.seq, result, timedOut);
    this.stopTurnTimer();
    if (match.status === 'ROUND_END') {
      this.continueVotes = [false, false];
      this.roundEndTimer = this.clock.setTimeout(() => this.startNextRound(), ROUND_END_AUTO_MS);
    } else if (match.status === 'MATCH_OVER') {
      this.rematchVotes = [false, false];
    } else {
      this.startTurnTimer();
    }
    if (timedOut) this.broadcast();
  }

  private startNextRound(): void {
    if (this.roundEndTimer) this.clock.clearTimeout(this.roundEndTimer);
    this.roundEndTimer = null;
    if (!this.match || this.match.status !== 'ROUND_END') return;
    this.match = nextRound(this.match, this.rng);
    this.lastPlay = null;
    this.seq++;
    this.syncPause();
    this.broadcast();
  }

  continueRound(seat: Seat): void {
    if (this.match?.status !== 'ROUND_END') return;
    this.continueVotes[seat] = true;
    if (this.continueVotes[0] && this.continueVotes[1]) this.startNextRound();
    else this.broadcast();
  }

  rematch(seat: Seat): void {
    if (this.match?.status !== 'MATCH_OVER') return;
    this.rematchVotes[seat] = true;
    if (this.rematchVotes[0] && this.rematchVotes[1] && this.seats[0]?.connected && this.seats[1]?.connected) this.startMatch();
    this.broadcast();
  }

  emote(seat: Seat, id: EmoteId): void {
    const now = this.clock.now();
    if (now - this.lastEmote[seat] < 1000) return;
    this.lastEmote[seat] = now;
    if (this.seats[other(seat)]?.connected) this.send(other(seat), { t: 'emote', from: seat, id });
  }

  private doForfeit(loser: Seat): void {
    if (!this.match) return;
    this.stopTurnTimer();
    if (this.roundEndTimer) this.clock.clearTimeout(this.roundEndTimer);
    this.roundEndTimer = null;
    this.match = forfeit(this.match, loser);
    this.forfeitBy = loser;
    this.rematchVotes = [false, false];
    for (const s of this.seats) {
      if (s?.graceTimer) this.clock.clearTimeout(s.graceTimer);
      if (s) Object.assign(s, { graceTimer: null, graceDeadline: null });
    }
    this.broadcast();
  }

  broadcast(): void {
    for (const seat of [0, 1] as Seat[]) {
      const s = this.seats[seat];
      if (!s?.connected) continue;
      if (!this.match) {
        this.send(seat, { t: 'waiting', room: this.id, config: this.config, you: seat });
        continue;
      }
      this.send(seat, {
        t: 'state',
        view: buildView(this.match, seat, {
          names: [this.seats[0]?.name ?? '', this.seats[1]?.name ?? ''],
          lastPlay: this.lastPlay,
          forfeitBy: this.forfeitBy,
          turnDeadline: this.turnDeadline,
          turnSeconds: this.config.turnSeconds,
          connected: [!!this.seats[0]?.connected, !!this.seats[1]?.connected],
          afk: [!!this.seats[0]?.afk, !!this.seats[1]?.afk],
          pausedUntil: this.match.status === 'MATCH_OVER' ? null : this.pausedUntil,
          continueVotes: [...this.continueVotes],
          rematchVotes: [...this.rematchVotes],
          inspector: this.config.inspector,
          now: this.clock.now(),
        }),
      });
    }
  }

  private touch(): void {
    this.lastActivity = this.clock.now();
  }

  dispose(): void {
    this.stopTurnTimer();
    if (this.roundEndTimer) this.clock.clearTimeout(this.roundEndTimer);
    for (const s of this.seats) if (s?.graceTimer) this.clock.clearTimeout(s.graceTimer);
  }
}
