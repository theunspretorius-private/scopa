import { SUITS, isSettebello, type Card, type Suit } from './cards';
import type { PlayerRound, Seat } from './round';

export interface PrimieraResult {
  score: number;
  cards: Card[];
  suitsCovered: number;
}

/** Best card per suit by primiera value, summed. */
export function primiera(cards: readonly Card[]): PrimieraResult {
  const best = new Map<Suit, Card>();
  for (const c of cards) {
    const b = best.get(c.suit);
    if (!b || c.primieraValue > b.primieraValue || (c.primieraValue === b.primieraValue && c.rank > b.rank)) best.set(c.suit, c);
  }
  const chosen = SUITS.map((s) => best.get(s)).filter((c): c is Card => !!c);
  return { score: chosen.reduce((s, c) => s + c.primieraValue, 0), cards: chosen, suitsCovered: chosen.length };
}

/** Returns the winning seat of the primiera, or null if tied. */
export function primieraWinner(a: PrimieraResult, b: PrimieraResult): Seat | null {
  const fullA = a.suitsCovered === 4;
  const fullB = b.suitsCovered === 4;
  if (fullA !== fullB) return fullA ? 0 : 1;
  if (a.score === b.score) return null;
  return a.score > b.score ? 0 : 1;
}

export interface PointBreakdown {
  carte: number;
  denari: number;
  settebello: number;
  primiera: number;
  scope: number;
}

export interface PlayerBreakdown {
  carteCount: number;
  denariCount: number;
  hasSettebello: boolean;
  primieraScore: number;
  primieraCards: string[];
  primieraSuits: number;
  scope: number;
  points: PointBreakdown;
  pointsEarnedThisRound: number;
  newTotalScore: number;
}

export interface RoundBreakdown {
  roundNumber: number;
  player1: PlayerBreakdown;
  player2: PlayerBreakdown;
}

const majority = (a: number, b: number): [number, number] => (a > b ? [1, 0] : b > a ? [0, 1] : [0, 0]);

/** Round points per seat, without totals. Used by the AI evaluation. */
export function roundPoints(players: readonly [PlayerRound, PlayerRound]): [number, number] {
  const [a, b] = players;
  const [ca, cb] = majority(a.captured.length, b.captured.length);
  const [da, db] = majority(countDenari(a.captured), countDenari(b.captured));
  const sa = a.captured.some(isSettebello) ? 1 : 0;
  const sb = b.captured.some(isSettebello) ? 1 : 0;
  const pw = primieraWinner(primiera(a.captured), primiera(b.captured));
  return [ca + da + sa + (pw === 0 ? 1 : 0) + a.scope, cb + db + sb + (pw === 1 ? 1 : 0) + b.scope];
}

export const countDenari = (cards: readonly Card[]): number => cards.filter((c) => c.suit === 'DENARI').length;

export function scoreRound(
  players: readonly [PlayerRound, PlayerRound],
  previousTotals: readonly [number, number],
  roundNumber: number,
): RoundBreakdown {
  const [a, b] = players;
  const pa = primiera(a.captured);
  const pb = primiera(b.captured);
  const pw = primieraWinner(pa, pb);
  const [ca, cb] = majority(a.captured.length, b.captured.length);
  const [da, db] = majority(countDenari(a.captured), countDenari(b.captured));

  const build = (p: PlayerRound, prim: PrimieraResult, carte: number, denari: number, seat: Seat, prev: number): PlayerBreakdown => {
    const points: PointBreakdown = {
      carte,
      denari,
      settebello: p.captured.some(isSettebello) ? 1 : 0,
      primiera: pw === seat ? 1 : 0,
      scope: p.scope,
    };
    const earned = points.carte + points.denari + points.settebello + points.primiera + points.scope;
    return {
      carteCount: p.captured.length,
      denariCount: countDenari(p.captured),
      hasSettebello: points.settebello === 1,
      primieraScore: prim.score,
      primieraCards: prim.cards.map((c) => c.id),
      primieraSuits: prim.suitsCovered,
      scope: p.scope,
      points,
      pointsEarnedThisRound: earned,
      newTotalScore: prev + earned,
    };
  };

  return {
    roundNumber,
    player1: build(a, pa, ca, da, 0, previousTotals[0]),
    player2: build(b, pb, cb, db, 1, previousTotals[1]),
  };
}
