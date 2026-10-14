import type { Card } from '../engine/cards';
import type { MatchState, TargetScore } from '../engine/match';
import { other, type PlayResult, type Seat } from '../engine/round';
import type { Move } from '../engine/rules';
import type { RoundBreakdown } from '../engine/scoring';

export type TurnSeconds = 0 | 15 | 30;

export interface RoomConfig {
  target: TargetScore;
  turnSeconds: TurnSeconds;
  /** Casual rooms allow the live pile inspector. */
  inspector: boolean;
}

export type ViewStatus = 'WAITING_FOR_OPPONENT' | 'IN_PROGRESS' | 'ROUND_END' | 'MATCH_OVER';

/** Wire-format card: data only, every client renders it with its own deck skin. */
export interface WireCard {
  suit: Card['suit'];
  rank: Card['rank'];
}

export interface LastPlay {
  seq: number;
  seat: Seat;
  card: string;
  captured: string[];
  scopa: boolean;
  leftover: string[];
  leftoverTo: Seat | null;
  timedOut?: boolean;
}

/** What one seat is allowed to see. The opponent's hand is only ever a count. */
export interface GameView {
  status: ViewStatus;
  you: Seat;
  names: [string, string];
  target: TargetScore;
  scores: [number, number];
  roundNumber: number;
  dealer: Seat;
  turn: Seat;
  table: string[];
  hand: string[];
  oppHandCount: number;
  deckCount: number;
  capturedCount: [number, number];
  scope: [number, number];
  /** Your scopa cards (to draw perpendicular in the pile). */
  scopaCards: [string[], string[]];
  /** Your own captured cards, only when the pile inspector is enabled. */
  myCaptured: string[] | null;
  lastPlay: LastPlay | null;
  breakdown: RoundBreakdown | null;
  winner: Seat | null;
  forfeitBy: Seat | null;
  turnDeadline: number | null;
  /** Sender's clock when the view was built, so clients can correct for clock skew. */
  serverNow: number;
  turnSeconds: TurnSeconds;
  connected: [boolean, boolean];
  afk: [boolean, boolean];
  pausedUntil: number | null;
  continueVotes: [boolean, boolean];
  rematchVotes: [boolean, boolean];
  inspector: boolean;
}

export function toLastPlay(seq: number, r: PlayResult, timedOut = false): LastPlay {
  return {
    seq,
    seat: r.seat,
    card: r.card.id,
    captured: r.captured.map((c) => c.id),
    scopa: r.scopa,
    leftover: r.leftover.map((c) => c.id),
    leftoverTo: r.leftoverTo,
    ...(timedOut ? { timedOut } : {}),
  };
}

export interface ViewExtras {
  names: [string, string];
  lastPlay: LastPlay | null;
  forfeitBy?: Seat | null;
  turnDeadline?: number | null;
  turnSeconds?: TurnSeconds;
  connected?: [boolean, boolean];
  afk?: [boolean, boolean];
  pausedUntil?: number | null;
  continueVotes?: [boolean, boolean];
  rematchVotes?: [boolean, boolean];
  inspector: boolean;
  now?: number;
}

export function buildView(m: MatchState, seat: Seat, x: ViewExtras): GameView {
  const r = m.round;
  const me = r.players[seat];
  const ids = (cs: readonly Card[]) => cs.map((c) => c.id);
  return {
    status: m.status,
    you: seat,
    names: x.names,
    target: m.target,
    scores: [m.scores[0], m.scores[1]],
    roundNumber: m.roundNumber,
    dealer: r.dealer,
    turn: r.turn,
    table: ids(r.table),
    hand: ids(me.hand),
    oppHandCount: r.players[other(seat)].hand.length,
    deckCount: r.deck.length,
    capturedCount: [r.players[0].captured.length, r.players[1].captured.length],
    scope: [r.players[0].scope, r.players[1].scope],
    scopaCards: [r.players[0].scopaCards.slice(), r.players[1].scopaCards.slice()],
    myCaptured: x.inspector ? ids(me.captured) : null,
    lastPlay: x.lastPlay,
    breakdown: m.status === 'IN_PROGRESS' ? null : m.lastBreakdown,
    winner: m.winner,
    forfeitBy: x.forfeitBy ?? null,
    turnDeadline: x.turnDeadline ?? null,
    serverNow: x.now ?? Date.now(),
    turnSeconds: x.turnSeconds ?? 0,
    connected: x.connected ?? [true, true],
    afk: x.afk ?? [false, false],
    pausedUntil: x.pausedUntil ?? null,
    continueVotes: x.continueVotes ?? [false, false],
    rematchVotes: x.rematchVotes ?? [false, false],
    inspector: x.inspector,
  };
}

// ------------------------------------------------------------------ messages

export const EMOTES = ['scopa', 'luck', 'mamma', 'nice', 'hello', 'gg'] as const;
export type EmoteId = (typeof EMOTES)[number];

export type ClientMsg =
  | { t: 'hello'; room: string; token?: string; name: string }
  | { t: 'play'; move: Move }
  | { t: 'continue' }
  | { t: 'rematch' }
  | { t: 'emote'; id: EmoteId }
  | { t: 'ping' };

export type ServerMsg =
  | { t: 'welcome'; seat: Seat; token: string; room: string; config: RoomConfig }
  | { t: 'waiting'; room: string; config: RoomConfig; you: Seat }
  | { t: 'state'; view: GameView }
  | { t: 'emote'; from: Seat; id: EmoteId }
  | { t: 'error'; code: 'room_not_found' | 'room_full' | 'illegal_move' | 'not_your_turn' | 'bad_message' }
  | { t: 'pong' };

export interface CreateRoomRequest {
  target: TargetScore;
  turnSeconds: TurnSeconds;
  inspector: boolean;
  name: string;
}

export interface CreateRoomResponse {
  room: string;
  token: string;
}

export const ROOM_ID_RE = /^[A-Za-z0-9]{6}$/;
