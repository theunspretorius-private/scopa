import type { Card } from './cards';

/** A move: play `cardId`; `capture` lists the table card ids taken (empty = trail). */
export interface Move {
  cardId: string;
  capture: string[];
}

/**
 * All legal ways `card` can capture from `table`.
 * Single-card priority: if any table card has the same rank, only single-card captures are legal.
 * Otherwise every combination of 2+ table cards whose ranks sum to the played rank.
 */
export function captureOptions(card: Card, table: readonly Card[]): Card[][] {
  const singles = table.filter((t) => t.rank === card.rank);
  if (singles.length > 0) return singles.map((s) => [s]);

  const out: Card[][] = [];
  const acc: Card[] = [];
  const dfs = (start: number, remaining: number) => {
    for (let i = start; i < table.length; i++) {
      const r = table[i].rank;
      if (r > remaining) continue;
      acc.push(table[i]);
      if (r === remaining) {
        if (acc.length >= 2) out.push(acc.slice());
      } else {
        dfs(i + 1, remaining - r);
      }
      acc.pop();
    }
  };
  dfs(0, card.rank);
  return out;
}

/** Every legal move for a hand. A card that can capture must capture; it may never trail. */
export function legalMoves(hand: readonly Card[], table: readonly Card[]): Move[] {
  const moves: Move[] = [];
  for (const card of hand) {
    const opts = captureOptions(card, table);
    if (opts.length === 0) moves.push({ cardId: card.id, capture: [] });
    else for (const o of opts) moves.push({ cardId: card.id, capture: o.map((c) => c.id) });
  }
  return moves;
}

export function sameIdSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x)) && s.size === b.length;
}

export function isLegalMove(hand: readonly Card[], table: readonly Card[], move: Move): boolean {
  const card = hand.find((c) => c.id === move.cardId);
  if (!card) return false;
  const opts = captureOptions(card, table);
  if (opts.length === 0) return move.capture.length === 0;
  return opts.some((o) =>
    sameIdSet(
      o.map((c) => c.id),
      move.capture,
    ),
  );
}
