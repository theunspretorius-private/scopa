import { isSettebello, sumRanks, type Card } from '../engine/cards';
import { captureOptions, type Move } from '../engine/rules';

export interface ScoredContext {
  hand: readonly Card[];
  table: readonly Card[];
  /** True when this play is the very last of the round (a sweep would not count as scopa). */
  lastPlay: boolean;
  /** Returns true if the opponent could plausibly hold a card of this rank. */
  rankThreat: (rank: number) => boolean;
}

/** W = Scope*100 + Settebello*80 + Sevens*30 + Coins*15 + CardCount*5 (spec §3.1, Medium). */
export function captureWeight(cards: readonly Card[], sweeps: boolean): number {
  let w = sweeps ? 100 : 0;
  for (const c of cards) {
    if (isSettebello(c)) w += 80;
    if (c.rank === 7) w += 30;
    if (c.suit === 'DENARI') w += 15;
    w += 5;
  }
  return w;
}

/** Does leaving `rest` on the table hand the opponent an easy scopa? */
export function leavesScopaRisk(rest: readonly Card[], ctx: ScoredContext): boolean {
  if (rest.length === 0 || ctx.lastPlay) return false;
  const s = sumRanks(rest);
  return s <= 10 && ctx.rankThreat(s);
}

/** Heuristic utility of a move (higher is better). */
export function scoreMove(move: Move, ctx: ScoredContext): number {
  const card = ctx.hand.find((c) => c.id === move.cardId)!;
  if (move.capture.length > 0) {
    const set = new Set(move.capture);
    const taken = ctx.table.filter((c) => set.has(c.id));
    const rest = ctx.table.filter((c) => !set.has(c.id));
    const sweeps = rest.length === 0 && !ctx.lastPlay;
    let w = captureWeight([card, ...taken], sweeps);
    if (leavesScopaRisk(rest, ctx)) w -= 40;
    return w;
  }
  // Trail: give away as little as possible.
  let w = -card.primieraValue / 2;
  if (card.suit === 'DENARI') w -= 10;
  if (isSettebello(card)) w -= 120;
  if (card.rank === 7) w -= 15;
  const rest = [...ctx.table, card];
  if (leavesScopaRisk(rest, ctx)) w -= 60;
  // Trailing a card the opponent can immediately pair is mildly bad.
  if (ctx.rankThreat(card.rank)) w -= 4;
  // Keep sums high: trailing into a table whose cards are hard to combine is good.
  if (captureOptions(card, ctx.table).length === 0 && sumRanks(rest) > 10) w += 3;
  return w;
}
