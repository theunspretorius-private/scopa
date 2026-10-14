import { FULL_DECK, type Card } from './cards';
import { shuffle, type Rng } from './rng';
import { isLegalMove, type Move } from './rules';

export type Seat = 0 | 1;
export const other = (s: Seat): Seat => (s === 0 ? 1 : 0);

export interface PlayerRound {
  hand: Card[];
  captured: Card[];
  scope: number;
  /** Ids of the cards that made a scopa (shown face-up, perpendicular in the pile). */
  scopaCards: string[];
}

export interface RoundState {
  deck: Card[];
  table: Card[];
  players: [PlayerRound, PlayerRound];
  dealer: Seat;
  turn: Seat;
  lastCapturer: Seat | null;
  over: boolean;
}

export interface PlayResult {
  seat: Seat;
  card: Card;
  captured: Card[];
  scopa: boolean;
  /** New hands were dealt after this play. */
  dealt: boolean;
  roundOver: boolean;
  /** Table cards awarded to the last capturer at the end of the round. */
  leftover: Card[];
  leftoverTo: Seat | null;
}

export const HAND_SIZE = 3;
export const TABLE_SIZE = 4;

const emptyPlayer = (): PlayerRound => ({ hand: [], captured: [], scope: 0, scopaCards: [] });

/** A table with three or four Kings is a misdeal and is re-dealt. */
export const isMisdeal = (table: readonly Card[]): boolean => table.filter((c) => c.rank === 10).length >= 3;

export function dealRound(dealer: Seat, rng: Rng): RoundState {
  for (;;) {
    const deck = shuffle(FULL_DECK, rng);
    const players: [PlayerRound, PlayerRound] = [emptyPlayer(), emptyPlayer()];
    const first = other(dealer);
    dealHands(deck, players, first);
    const table = deck.splice(0, TABLE_SIZE);
    if (isMisdeal(table)) continue;
    return { deck, table, players, dealer, turn: first, lastCapturer: null, over: false };
  }
}

function dealHands(deck: Card[], players: [PlayerRound, PlayerRound], first: Seat) {
  // Dealt one at a time, alternating, starting with the non-dealer.
  for (let i = 0; i < HAND_SIZE; i++) {
    players[first].hand.push(deck.shift()!);
    players[other(first)].hand.push(deck.shift()!);
  }
}

const clonePlayer = (p: PlayerRound): PlayerRound => ({
  hand: p.hand.slice(),
  captured: p.captured.slice(),
  scope: p.scope,
  scopaCards: p.scopaCards.slice(),
});

export const cloneRound = (s: RoundState): RoundState => ({
  ...s,
  deck: s.deck.slice(),
  table: s.table.slice(),
  players: [clonePlayer(s.players[0]), clonePlayer(s.players[1])],
});

/** Apply a move for the player whose turn it is. Returns a new state; the input is not mutated. */
export function applyMove(state: RoundState, move: Move): { state: RoundState; result: PlayResult } {
  if (state.over) throw new Error('Round is over');
  const seat = state.turn;
  const me = state.players[seat];
  if (!isLegalMove(me.hand, state.table, move)) throw new Error('Illegal move');

  const s = cloneRound(state);
  const p = s.players[seat];
  const card = p.hand.find((c) => c.id === move.cardId)!;
  p.hand = p.hand.filter((c) => c !== card);

  const captureSet = new Set(move.capture);
  const captured = s.table.filter((c) => captureSet.has(c.id));
  let scopa = false;

  if (captured.length > 0) {
    s.table = s.table.filter((c) => !captureSet.has(c.id));
    p.captured.push(card, ...captured);
    s.lastCapturer = seat;
    const lastPlayOfRound = s.deck.length === 0 && s.players[0].hand.length === 0 && s.players[1].hand.length === 0;
    if (s.table.length === 0 && !lastPlayOfRound) {
      scopa = true;
      p.scope += 1;
      p.scopaCards.push(card.id);
    }
  } else {
    s.table.push(card);
  }

  s.turn = other(seat);
  let dealt = false;
  let leftover: Card[] = [];
  let leftoverTo: Seat | null = null;

  if (s.players[0].hand.length === 0 && s.players[1].hand.length === 0) {
    if (s.deck.length > 0) {
      dealHands(s.deck, s.players, other(s.dealer));
      dealt = true;
    } else {
      s.over = true;
      if (s.table.length > 0 && s.lastCapturer !== null) {
        leftover = s.table;
        leftoverTo = s.lastCapturer;
        s.players[s.lastCapturer].captured.push(...leftover);
        s.table = [];
      }
    }
  }

  return { state: s, result: { seat, card, captured, scopa, dealt, roundOver: s.over, leftover, leftoverTo } };
}
