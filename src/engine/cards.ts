export const SUITS = ['DENARI', 'COPPE', 'SPADE', 'BASTONI'] as const;
export type Suit = (typeof SUITS)[number];
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export interface Card {
  id: string; // e.g. "DENARI_7"
  suit: Suit;
  rank: Rank;
  primieraValue: number;
}

export const PRIMIERA_VALUES: Record<Rank, number> = {
  7: 21,
  6: 18,
  1: 16,
  5: 15,
  4: 14,
  3: 13,
  2: 12,
  8: 10,
  9: 10,
  10: 10,
};

export const cardId = (suit: Suit, rank: Rank): string => `${suit}_${rank}`;

export const FULL_DECK: readonly Card[] = Object.freeze(
  SUITS.flatMap((suit) =>
    RANKS.map((rank) => Object.freeze({ id: cardId(suit, rank), suit, rank, primieraValue: PRIMIERA_VALUES[rank] })),
  ),
);

const BY_ID = new Map(FULL_DECK.map((c) => [c.id, c]));

export function cardById(id: string): Card {
  const c = BY_ID.get(id);
  if (!c) throw new Error(`Unknown card id: ${id}`);
  return c;
}

export const isCardId = (id: unknown): id is string => typeof id === 'string' && BY_ID.has(id);

export const isSettebello = (c: Card): boolean => c.suit === 'DENARI' && c.rank === 7;

export const sumRanks = (cards: readonly Card[]): number => cards.reduce((s, c) => s + c.rank, 0);
