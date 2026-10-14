import { describe, expect, it } from 'vitest';
import { cardById, dealRound, applyMove, isLegalMove, mulberry32, roundPoints, other } from '../src/engine';
import type { RoundState, Seat } from '../src/engine';
import { chooseMove, observe, type Difficulty } from '../src/ai';
import { solveEndgame } from '../src/ai/hard';

const C = (...ids: string[]) => ids.map(cardById);

function playRound(seed: number, diffs: [Difficulty, Difficulty], timeMs = 30): RoundState {
  const rng = mulberry32(seed);
  let s = dealRound(0, rng);
  let n = 0;
  while (!s.over) {
    const seat = s.turn;
    const obs = observe(s, seat);
    const m = chooseMove(obs, diffs[seat], seed * 1000 + n++, timeMs);
    expect(isLegalMove(s.players[seat].hand, s.table, m)).toBe(true);
    s = applyMove(s, m).state;
  }
  return s;
}

describe('AI', () => {
  it('every difficulty only produces legal moves', () => {
    for (const d of ['EASY', 'MEDIUM', 'HARD'] as Difficulty[]) playRound(7, [d, d], 15);
  });

  it('medium takes a scopa when available', () => {
    const s: RoundState = {
      deck: C('COPPE_1', 'COPPE_2', 'COPPE_3', 'COPPE_4', 'COPPE_5', 'COPPE_6'),
      table: C('DENARI_3', 'BASTONI_4'),
      dealer: 1,
      turn: 0,
      lastCapturer: null,
      over: false,
      players: [
        { hand: C('SPADE_7', 'SPADE_3', 'DENARI_4'), captured: [], scope: 0, scopaCards: [] },
        { hand: C('SPADE_2', 'SPADE_1', 'SPADE_6'), captured: [], scope: 0, scopaCards: [] },
      ],
    };
    const m = chooseMove(observe(s, 0), 'MEDIUM', 1);
    expect(m).toEqual({ cardId: 'SPADE_7', capture: ['DENARI_3', 'BASTONI_4'] });
  });

  it('endgame solver finds the forced settebello block', () => {
    // AI (seat 0) holds 7 of cups and 2 of swords; settebello is on the table. Must take it now.
    const s: RoundState = {
      deck: [],
      table: C('DENARI_7', 'BASTONI_9'),
      dealer: 1,
      turn: 0,
      lastCapturer: null,
      over: false,
      players: [
        { hand: C('COPPE_7', 'SPADE_2'), captured: [], scope: 0, scopaCards: [] },
        { hand: C('SPADE_7', 'BASTONI_1'), captured: [], scope: 0, scopaCards: [] },
      ],
    };
    const obs = observe(s, 0);
    const { move } = solveEndgame(obs, C('SPADE_7', 'BASTONI_1'));
    expect(move).toEqual({ cardId: 'COPPE_7', capture: ['DENARI_7'] });
  });

  it('hard beats easy over a series of rounds', () => {
    let diff = 0;
    for (let seed = 1; seed <= 16; seed++) {
      const hardSeat: Seat = (seed % 2) as Seat;
      const diffs: [Difficulty, Difficulty] = hardSeat === 0 ? ['HARD', 'EASY'] : ['EASY', 'HARD'];
      const s = playRound(seed, diffs, 25);
      const pts = roundPoints(s.players);
      diff += pts[hardSeat] - pts[other(hardSeat)];
    }
    expect(diff).toBeGreaterThan(0);
  }, 60_000);
});
