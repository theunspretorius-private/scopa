import { isSettebello, sumRanks, type Card, type Suit } from '../engine/cards';
import { briscolaBeats, captureOptions, type Move } from '../engine/rules';

export interface ScoredContext {
  hand: readonly Card[];
  table: readonly Card[];
  /** True when this play is the very last of the round (a sweep would not count as scopa). */
  lastPlay: boolean;
  /** Returns true if the opponent could plausibly hold a card of this rank. */
  rankThreat: (rank: number) => boolean;
}

export interface BriscolaScoredContext {
  hand: readonly Card[];
  table: readonly Card[];
  trumpSuit: Suit;
  deckCount: number;
  trumpCard?: Card | null;
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

/** Heuristic utility of a Scopa move (higher is better). */
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

/** Heuristic utility of a Briscola move (higher is better). */
export function scoreBriscolaMove(move: Move, ctx: BriscolaScoredContext): number {
  const card = ctx.hand.find((c) => c.id === move.cardId)!;
  const isTrump = card.suit === ctx.trumpSuit;

  // Leading the trick
  if (ctx.table.length === 0) {
    if (card.briscolaValue >= 10) {
      return isTrump ? -28 - card.briscolaValue : -35 - card.briscolaValue;
    }
    if (isTrump) {
      return -12 - card.briscolaValue * 2 - card.briscolaStrength * 0.5;
    }
    if (card.briscolaValue === 0) {
      return 10 - card.briscolaStrength * 0.5;
    }
    // Small non-trump figure (Fante=2, Cavallo=3, Re=4)
    return 4 - card.briscolaValue;
  }

  // Following in the trick
  const lead = ctx.table[0];
  const wins = briscolaBeats(lead, card, ctx.trumpSuit);
  const trickPts = lead.briscolaValue + card.briscolaValue;
  const lastDrawBias =
    ctx.deckCount === 2 && ctx.trumpCard ? ctx.trumpCard.briscolaValue + 5 : 0;

  if (wins) {
    let w = trickPts * 2.2 - lastDrawBias;
    if (!isTrump) {
      // Same-suit overtake (strozzare): no trump spent!
      w += 14 - card.briscolaStrength * 0.3;
    } else if (lead.suit !== ctx.trumpSuit) {
      // Won by trumping
      w -= 9 + card.briscolaStrength * 0.8;
      if (card.briscolaValue >= 10 && lead.briscolaValue < 10) w -= 12;
      if (lead.briscolaValue === 0) w -= 15;
    } else {
      // Over-trumping a trump lead
      w -= 6 + card.briscolaStrength * 0.5;
    }
    return w;
  }

  // Losing the trick
  let w = -trickPts * 2.2 + lastDrawBias;
  w -= card.briscolaValue * 3;
  if (isTrump) w -= 25;
  else if (card.briscolaValue === 0) w += 6 - card.briscolaStrength * 0.5;
  return w;
}

