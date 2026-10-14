import { FULL_DECK, cardById, type Card } from '../engine/cards';
import { other, type RoundState, type Seat } from '../engine/round';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export const DIFFICULTIES: readonly Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

/** Everything a player can legitimately know at their turn. Plain data, so it can cross a Worker boundary. */
export interface AIObservation {
  seat: Seat;
  dealer: Seat;
  hand: string[];
  table: string[];
  myCaptured: string[];
  oppCaptured: string[];
  myScope: number;
  oppScope: number;
  oppHandCount: number;
  deckCount: number;
  lastCapturer: Seat | null;
}

export function observe(round: RoundState, seat: Seat): AIObservation {
  const me = round.players[seat];
  const opp = round.players[other(seat)];
  return {
    seat,
    dealer: round.dealer,
    hand: me.hand.map((c) => c.id),
    table: round.table.map((c) => c.id),
    myCaptured: me.captured.map((c) => c.id),
    oppCaptured: opp.captured.map((c) => c.id),
    myScope: me.scope,
    oppScope: opp.scope,
    oppHandCount: opp.hand.length,
    deckCount: round.deck.length,
    lastCapturer: round.lastCapturer,
  };
}

export const ids2cards = (ids: readonly string[]): Card[] => ids.map(cardById);

/** Cards not visible to the observer: opponent's hand plus the stock. */
export function unseenCards(obs: AIObservation): Card[] {
  const seen = new Set([...obs.hand, ...obs.table, ...obs.myCaptured, ...obs.oppCaptured]);
  return FULL_DECK.filter((c) => !seen.has(c.id));
}
