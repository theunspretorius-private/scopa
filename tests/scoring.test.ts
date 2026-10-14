import { describe, expect, it } from 'vitest';
import { cardById, primiera, primieraWinner, scoreRound, matchWinner, newMatch, playMove, nextRound, legalMoves, mulberry32 } from '../src/engine';
import type { PlayerRound } from '../src/engine';

const C = (...ids: string[]) => ids.map(cardById);
const P = (captured: string[], scope = 0): PlayerRound => ({ hand: [], captured: C(...captured), scope, scopaCards: [] });

describe('primiera', () => {
  it('picks the best card per suit', () => {
    const r = primiera(C('DENARI_7', 'DENARI_6', 'COPPE_1', 'SPADE_10', 'BASTONI_6'));
    expect(r.score).toBe(21 + 16 + 10 + 18);
    expect(r.suitsCovered).toBe(4);
  });
  it('a player missing a suit loses to a player with all four', () => {
    const full = primiera(C('DENARI_10', 'COPPE_10', 'SPADE_10', 'BASTONI_10'));
    const missing = primiera(C('DENARI_7', 'COPPE_7', 'SPADE_7'));
    expect(primieraWinner(missing, full)).toBe(1);
  });
  it('nobody wins when both players are missing a suit', () => {
    expect(primieraWinner(primiera(C('DENARI_7')), primiera(C('COPPE_6')))).toBe(null);
    expect(primieraWinner(primiera(C('DENARI_7')), primiera(C('COPPE_7')))).toBe(null);
  });
  it('equal full totals tie', () => {
    const a = primiera(C('DENARI_7', 'COPPE_7', 'SPADE_7', 'BASTONI_7'));
    const b = primiera(C('DENARI_10', 'COPPE_7', 'SPADE_7', 'BASTONI_7', 'DENARI_7'));
    expect(primieraWinner(a, primiera(C('DENARI_6', 'COPPE_7', 'SPADE_7', 'BASTONI_7')))).toBe(0);
    expect(primieraWinner(a, b)).toBe(null);
  });
});

describe('scoreRound', () => {
  it('scores the spec example categories', () => {
    const all = [
      'DENARI_7', 'DENARI_6', 'DENARI_5', 'DENARI_4', 'DENARI_3', 'DENARI_2',
      'COPPE_7', 'SPADE_7', 'BASTONI_6', 'COPPE_1', 'COPPE_2', 'COPPE_3', 'COPPE_4',
      'SPADE_1', 'SPADE_2', 'SPADE_3', 'SPADE_4', 'BASTONI_1', 'BASTONI_2', 'BASTONI_3', 'BASTONI_4',
    ];
    const p1 = P(all, 2);
    const rest = ['DENARI_1', 'DENARI_8', 'DENARI_9', 'DENARI_10', 'COPPE_5', 'COPPE_6', 'COPPE_8', 'COPPE_9', 'COPPE_10',
      'SPADE_5', 'SPADE_6', 'SPADE_8', 'SPADE_9', 'SPADE_10', 'BASTONI_5', 'BASTONI_7', 'BASTONI_8', 'BASTONI_9', 'BASTONI_10'];
    const p2 = P(rest, 1);
    const b = scoreRound([p1, p2], [4, 3], 2);
    expect(b.player1.carteCount).toBe(21);
    expect(b.player1.points).toEqual({ carte: 1, denari: 1, settebello: 1, primiera: 1, scope: 2 });
    expect(b.player1.pointsEarnedThisRound).toBe(6);
    expect(b.player1.newTotalScore).toBe(10);
    expect(b.player2.points).toEqual({ carte: 0, denari: 0, settebello: 0, primiera: 0, scope: 1 });
    expect(b.player2.newTotalScore).toBe(4);
  });
  it('20-20 cards and 5-5 coins award nothing', () => {
    const ids = ['DENARI', 'COPPE', 'SPADE', 'BASTONI'].flatMap((s) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => `${s}_${r}`));
    const a = ids.filter((_, i) => i % 2 === 0);
    const b = ids.filter((_, i) => i % 2 === 1);
    const r = scoreRound([P(a), P(b)], [0, 0], 1);
    expect(r.player1.points.carte + r.player2.points.carte).toBe(0);
    expect(r.player1.points.denari + r.player2.points.denari).toBe(0);
  });
});

describe('match', () => {
  it('needs target and a lead', () => {
    expect(matchWinner([11, 10], 11)).toBe(0);
    expect(matchWinner([11, 11], 11)).toBe(null);
    expect(matchWinner([10, 9], 11)).toBe(null);
    expect(matchWinner([12, 14], 11)).toBe(1);
  });

  it('plays full random matches to completion with 40 cards accounted for each round', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = mulberry32(seed);
      let m = newMatch(11, rng);
      let rounds = 0;
      while (m.status !== 'MATCH_OVER') {
        if (m.status === 'ROUND_END') {
          expect(m.round.players[0].captured.length + m.round.players[1].captured.length).toBe(40);
          m = nextRound(m, rng);
          rounds++;
          continue;
        }
        const r = m.round;
        const moves = legalMoves(r.players[r.turn].hand, r.table);
        m = playMove(m, moves[Math.floor(rng() * moves.length)]).match;
      }
      expect(m.winner).not.toBe(null);
      expect(Math.max(...m.scores)).toBeGreaterThanOrEqual(11);
      expect(rounds).toBeLessThan(40);
    }
  });
});
