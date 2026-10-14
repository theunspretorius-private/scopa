import { describe, expect, it } from 'vitest';
import { cardById, FULL_DECK, captureOptions, legalMoves, isLegalMove, isMisdeal, dealRound, applyMove, mulberry32 } from '../src/engine';
import type { RoundState } from '../src/engine';

const C = (...ids: string[]) => ids.map(cardById);

describe('deck', () => {
  it('has 40 unique cards with primiera values', () => {
    expect(FULL_DECK).toHaveLength(40);
    expect(new Set(FULL_DECK.map((c) => c.id)).size).toBe(40);
    expect(cardById('SPADE_7').primieraValue).toBe(21);
    expect(cardById('COPPE_10').primieraValue).toBe(10);
  });
});

describe('captureOptions', () => {
  it('forces single-card capture when a same-rank card is on the table', () => {
    const opts = captureOptions(cardById('SPADE_7'), C('DENARI_7', 'COPPE_3', 'BASTONI_4'));
    expect(opts.map((o) => o.map((c) => c.id))).toEqual([['DENARI_7']]);
  });
  it('lists each single match when several exist', () => {
    expect(captureOptions(cardById('SPADE_5'), C('DENARI_5', 'COPPE_5'))).toHaveLength(2);
  });
  it('finds all sum combinations', () => {
    const opts = captureOptions(cardById('SPADE_7'), C('COPPE_3', 'BASTONI_4', 'DENARI_5', 'COPPE_2'));
    const keys = opts.map((o) => o.map((c) => c.id).sort().join('+')).sort();
    expect(keys).toEqual(['BASTONI_4+COPPE_3', 'COPPE_2+DENARI_5']);
  });
  it('finds 3-card sums', () => {
    const opts = captureOptions(cardById('SPADE_10'), C('COPPE_1', 'BASTONI_2', 'DENARI_7', 'COPPE_9'));
    const keys = opts.map((o) => o.map((c) => c.id).sort().join('+')).sort();
    expect(keys).toEqual(['BASTONI_2+COPPE_1+DENARI_7', 'COPPE_1+COPPE_9']);
  });
  it('returns nothing when no capture exists', () => {
    expect(captureOptions(cardById('SPADE_2'), C('COPPE_3', 'BASTONI_4'))).toEqual([]);
  });
});

describe('legal moves', () => {
  it('a capturing card may not trail', () => {
    const hand = C('SPADE_7', 'SPADE_1');
    const table = C('DENARI_7', 'COPPE_9');
    const moves = legalMoves(hand, table);
    expect(moves).toContainEqual({ cardId: 'SPADE_7', capture: ['DENARI_7'] });
    expect(moves).toContainEqual({ cardId: 'SPADE_1', capture: [] });
    expect(isLegalMove(hand, table, { cardId: 'SPADE_7', capture: [] })).toBe(false);
  });
});

describe('dealing', () => {
  it('deals 3 + 3 + 4 and never a 3-king table', () => {
    for (let seed = 0; seed < 300; seed++) {
      const r = dealRound(0, mulberry32(seed));
      expect(r.players[0].hand).toHaveLength(3);
      expect(r.players[1].hand).toHaveLength(3);
      expect(r.table).toHaveLength(4);
      expect(r.deck).toHaveLength(30);
      expect(isMisdeal(r.table)).toBe(false);
      expect(r.turn).toBe(1);
    }
  });
});

function fixedRound(partial: Partial<RoundState> & Pick<RoundState, 'players'>): RoundState {
  return { deck: [], table: [], dealer: 0, turn: 0, lastCapturer: null, over: false, ...partial };
}

describe('applyMove', () => {
  it('awards a scopa when the table is cleared mid-round', () => {
    const s = fixedRound({
      deck: C('COPPE_1', 'COPPE_2', 'COPPE_3', 'COPPE_4', 'COPPE_5', 'COPPE_6'),
      table: C('DENARI_3', 'BASTONI_4'),
      players: [
        { hand: C('SPADE_7', 'SPADE_1'), captured: [], scope: 0, scopaCards: [] },
        { hand: C('SPADE_2', 'SPADE_3'), captured: [], scope: 0, scopaCards: [] },
      ],
    });
    const { state, result } = applyMove(s, { cardId: 'SPADE_7', capture: ['DENARI_3', 'BASTONI_4'] });
    expect(result.scopa).toBe(true);
    expect(state.players[0].scope).toBe(1);
    expect(state.players[0].captured).toHaveLength(3);
    expect(state.turn).toBe(1);
  });

  it('does not award a scopa on the last play of the round, and sweeps leftovers to last capturer', () => {
    const s = fixedRound({
      table: C('DENARI_3', 'BASTONI_4'),
      turn: 1,
      players: [
        { hand: [], captured: [], scope: 0, scopaCards: [] },
        { hand: C('SPADE_7'), captured: [], scope: 0, scopaCards: [] },
      ],
    });
    const { state, result } = applyMove(s, { cardId: 'SPADE_7', capture: ['DENARI_3', 'BASTONI_4'] });
    expect(result.scopa).toBe(false);
    expect(result.roundOver).toBe(true);
    expect(state.players[1].scope).toBe(0);

    const s2 = fixedRound({
      table: C('DENARI_9'),
      turn: 1,
      lastCapturer: 0,
      players: [
        { hand: [], captured: [], scope: 0, scopaCards: [] },
        { hand: C('SPADE_1'), captured: [], scope: 0, scopaCards: [] },
      ],
    });
    const r2 = applyMove(s2, { cardId: 'SPADE_1', capture: [] });
    expect(r2.result.leftoverTo).toBe(0);
    expect(r2.state.players[0].captured.map((c) => c.id).sort()).toEqual(['DENARI_9', 'SPADE_1']);
    expect(r2.state.players[0].scope).toBe(0);
  });

  it('deals new hands when both are empty and stock remains', () => {
    const s = fixedRound({
      deck: C('COPPE_1', 'COPPE_2', 'COPPE_3', 'COPPE_4', 'COPPE_5', 'COPPE_6'),
      table: C('DENARI_9'),
      turn: 1,
      players: [
        { hand: [], captured: [], scope: 0, scopaCards: [] },
        { hand: C('SPADE_1'), captured: [], scope: 0, scopaCards: [] },
      ],
    });
    const { state, result } = applyMove(s, { cardId: 'SPADE_1', capture: [] });
    expect(result.dealt).toBe(true);
    expect(state.players[0].hand).toHaveLength(3);
    expect(state.players[1].hand).toHaveLength(3);
    expect(state.deck).toHaveLength(0);
  });

  it('rejects illegal moves', () => {
    const s = fixedRound({
      table: C('DENARI_7'),
      players: [
        { hand: C('SPADE_7'), captured: [], scope: 0, scopaCards: [] },
        { hand: C('SPADE_1'), captured: [], scope: 0, scopaCards: [] },
      ],
    });
    expect(() => applyMove(s, { cardId: 'SPADE_7', capture: [] })).toThrow();
    expect(() => applyMove(s, { cardId: 'SPADE_1', capture: [] })).toThrow();
  });
});
