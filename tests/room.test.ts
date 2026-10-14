import { describe, expect, it } from 'vitest';
import { Room, GRACE_MS, type Clock } from '../server/room';
import { legalMoves, cardById } from '../src/engine';
import type { GameView, ServerMsg } from '../src/net/protocol';
import type { Seat } from '../src/engine';

class FakeClock implements Clock {
  t = 1_000_000;
  private timers = new Map<number, { at: number; fn: () => void }>();
  private next = 1;
  now = () => this.t;
  setTimeout = (fn: () => void, ms: number) => {
    const id = this.next++;
    this.timers.set(id, { at: this.t + ms, fn });
    return id;
  };
  clearTimeout = (h: unknown) => void this.timers.delete(h as number);
  advance(ms: number) {
    const end = this.t + ms;
    for (;;) {
      const due = [...this.timers.entries()].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      this.timers.delete(due[0]);
      this.t = due[1].at;
      due[1].fn();
    }
    this.t = end;
  }
}

function setup(turnSeconds: 0 | 15 | 30 = 30) {
  const clock = new FakeClock();
  const inbox: [ServerMsg[], ServerMsg[]] = [[], []];
  const room = new Room('ABC123', { target: 11, turnSeconds, inspector: false }, 'Ana', (s, m) => inbox[s].push(m), clock, 42);
  const host = room.join(room.hostToken, 'Ana');
  room.connect(0);
  const guest = room.join(undefined, 'Bo');
  if ('error' in guest || 'error' in host) throw new Error('join');
  room.connect(1);
  const view = (s: Seat): GameView => {
    const st = inbox[s].filter((m) => m.t === 'state').at(-1);
    return (st as { view: GameView }).view;
  };
  return { clock, room, inbox, view, guest };
}

describe('Room', () => {
  it('starts when both connect, masks the opponent hand, rejects a third player', () => {
    const { room, view } = setup();
    const v0 = view(0);
    const v1 = view(1);
    expect(v0.status).toBe('IN_PROGRESS');
    expect(v0.hand).toHaveLength(3);
    expect(v0.oppHandCount).toBe(3);
    expect(JSON.stringify(v0)).not.toContain(v1.hand[0]);
    expect(v0.myCaptured).toBeNull();
    expect(room.join(undefined, 'Cy')).toEqual({ error: 'room_full' });
  });

  it('validates turns and moves', () => {
    const { room, view } = setup();
    const turn = view(0).turn;
    const wrong = (1 - turn) as Seat;
    expect(room.play(wrong, { cardId: view(wrong).hand[0], capture: [] })).toEqual({ t: 'error', code: 'not_your_turn' });
    expect(room.play(turn, { cardId: view(wrong).hand[0], capture: [] })).toEqual({ t: 'error', code: 'illegal_move' });
    const v = view(turn);
    const move = legalMoves(v.hand.map(cardById), v.table.map(cardById))[0];
    expect(room.play(turn, move)).toBeNull();
    expect(view(turn).lastPlay?.card).toBe(move.cardId);
  });

  it('auto-plays on timeout and forfeits after three consecutive timeouts', () => {
    const { clock, view } = setup(15);
    const afkSeat = view(0).turn;
    clock.advance(15_000);
    expect(view(0).lastPlay?.timedOut).toBe(true);
    expect(view(0).afk[afkSeat]).toBe(true);
    // Other seat also times out; then afkSeat again twice more → 3rd timeout forfeits.
    clock.advance(15_000 * 4);
    expect(view(0).status).toBe('MATCH_OVER');
    expect(view(0).forfeitBy).not.toBeNull();
  });

  it('pauses on disconnect, resumes on reconnect, forfeits after the grace period', () => {
    const { clock, room, view, guest } = setup(30);
    room.disconnect(1);
    expect(view(0).pausedUntil).toBe(clock.now() + GRACE_MS);
    expect(view(0).turnDeadline).toBeNull();
    clock.advance(GRACE_MS - 1000);
    room.join(!('error' in guest) ? guest.token : '', 'Bo');
    room.connect(1);
    expect(view(0).pausedUntil).toBeNull();
    expect(view(0).status).toBe('IN_PROGRESS');
    room.disconnect(1);
    clock.advance(GRACE_MS + 1);
    expect(view(0).status).toBe('MATCH_OVER');
    expect(view(0).winner).toBe(0);
    expect(view(0).forfeitBy).toBe(1);
  });

  it('plays a full match through rounds and supports rematch', () => {
    const { room, view } = setup(0);
    let guard = 0;
    while (view(0).status !== 'MATCH_OVER' && guard++ < 2000) {
      const v0 = view(0);
      if (v0.status === 'ROUND_END') {
        expect(v0.breakdown).not.toBeNull();
        room.continueRound(0);
        room.continueRound(1);
        continue;
      }
      const v = view(v0.turn);
      const move = legalMoves(v.hand.map(cardById), v.table.map(cardById))[0];
      expect(room.play(v0.turn, move)).toBeNull();
    }
    expect(view(0).status).toBe('MATCH_OVER');
    room.rematch(0);
    expect(view(0).rematchVotes).toEqual([true, false]);
    room.rematch(1);
    expect(view(0).status).toBe('IN_PROGRESS');
    expect(view(0).scores).toEqual([0, 0]);
  });
});
