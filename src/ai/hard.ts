import { cardById, type Card } from '../engine/cards';
import { shuffle, type Rng } from '../engine/rng';
import { applyMove, other, type RoundState, type Seat } from '../engine/round';
import { legalMoves, type Move } from '../engine/rules';
import { briscolaRoundPoints, roundPoints } from '../engine/scoring';
import { scoreBriscolaMove, scoreMove, type BriscolaScoredContext, type ScoredContext } from './heuristics';
import { ids2cards, unseenCards, type AIObservation } from './observation';

export interface HardOptions {
  /** Wall-clock budget for the Monte Carlo search. */
  timeMs?: number;
  maxIterations?: number;
  now?: () => number;
}

const ROLLOUT_EPSILON = 0.12;
const UCB_C = 2.5; // rewards are round-point differentials, roughly in [-6, 6]

/**
 * Maestro.
 * - Perfect card counting: unseen = 40 − (hand ∪ table ∪ both capture piles).
 * - In Briscola, the face-up trump card at the bottom of the stock is also known.
 * - When the stock is empty the unseen cards are exactly the opponent's hand, so the rest of the
 *   round (≤ 6 cards) is solved with full-depth minimax + alpha-beta.
 * - Otherwise: determinized Monte Carlo search — each iteration samples a consistent opponent hand
 *   and stock order, picks a root move by UCB1, and plays out the round with a heuristic policy.
 */
export function hardMove(obs: AIObservation, rng: Rng, opts: HardOptions = {}): Move {
  const game = obs.game ?? 'scopa';
  const hand = ids2cards(obs.hand);
  const table = ids2cards(obs.table);
  const moves = legalMoves(hand, table, game);
  if (moves.length === 1) return moves[0];

  const unseen = unseenCards(obs);
  if (obs.deckCount === 0) return solveEndgame(obs, unseen).move;
  return monteCarlo(obs, unseen, moves, rng, opts);
}

function buildState(obs: AIObservation, oppHand: Card[], deck: Card[]): RoundState {
  const me = obs.seat;
  const players: RoundState['players'] = [
    { hand: [], captured: [], scope: 0, scopaCards: [] },
    { hand: [], captured: [], scope: 0, scopaCards: [] },
  ];
  players[me] = { hand: ids2cards(obs.hand), captured: ids2cards(obs.myCaptured), scope: obs.myScope, scopaCards: [] };
  players[other(me)] = { hand: oppHand, captured: ids2cards(obs.oppCaptured), scope: obs.oppScope, scopaCards: [] };
  const trumpCard = obs.trumpCard ? cardById(obs.trumpCard) : null;
  return {
    game: obs.game ?? 'scopa',
    deck,
    table: ids2cards(obs.table),
    players,
    dealer: obs.dealer,
    turn: me,
    lastCapturer: obs.lastCapturer,
    over: false,
    trumpCard,
    trumpSuit: obs.trumpSuit ?? trumpCard?.suit ?? null,
  };
}

const diffFor = (state: RoundState, me: Seat): number => {
  if (state.game === 'briscola') {
    const [a, b] = briscolaRoundPoints(state.players);
    const myPts = me === 0 ? a : b;
    const oppPts = me === 0 ? b : a;
    const winBonus = myPts > 60 ? 3 : myPts === 60 ? 0 : -3;
    return (myPts - oppPts) / 20 + winBonus;
  }
  const [a, b] = roundPoints(state.players);
  return me === 0 ? a - b : b - a;
};

// ---------------------------------------------------------------- endgame: minimax

export function solveEndgame(obs: AIObservation, unseen: Card[]): { move: Move; value: number } {
  const game = obs.game ?? 'scopa';
  const root = buildState(obs, unseen.slice(0, obs.oppHandCount), []);
  const me = obs.seat;
  let best: Move | null = null;
  let bestVal = -Infinity;
  let alpha = -Infinity;
  for (const m of orderMoves(root, legalMoves(root.players[me].hand, root.table, game))) {
    const v = alphabeta(applyMove(root, m).state, me, alpha, Infinity);
    if (v > bestVal) {
      bestVal = v;
      best = m;
    }
    alpha = Math.max(alpha, v);
  }
  return { move: best!, value: bestVal };
}

function alphabeta(state: RoundState, me: Seat, alpha: number, beta: number): number {
  if (state.over) return diffFor(state, me);
  const game = state.game ?? 'scopa';
  const moves = orderMoves(state, legalMoves(state.players[state.turn].hand, state.table, game));
  if (state.turn === me) {
    let v = -Infinity;
    for (const m of moves) {
      v = Math.max(v, alphabeta(applyMove(state, m).state, me, alpha, beta));
      alpha = Math.max(alpha, v);
      if (alpha >= beta) break;
    }
    return v;
  }
  let v = Infinity;
  for (const m of moves) {
    v = Math.min(v, alphabeta(applyMove(state, m).state, me, alpha, beta));
    beta = Math.min(beta, v);
    if (alpha >= beta) break;
  }
  return v;
}

/** Captures first (bigger first) — better pruning. */
const orderMoves = (_s: RoundState, moves: Move[]): Move[] => moves.slice().sort((a, b) => b.capture.length - a.capture.length);

// ---------------------------------------------------------------- mid-game: determinized MC

function monteCarlo(obs: AIObservation, unseen: Card[], moves: Move[], rng: Rng, opts: HardOptions): Move {
  const now = opts.now ?? (() => Date.now());
  const deadline = now() + (opts.timeMs ?? 700);
  const maxIter = opts.maxIterations ?? 6000;
  const n = new Array<number>(moves.length).fill(0);
  const sum = new Array<number>(moves.length).fill(0);
  const me = obs.seat;
  const isBriscola = obs.game === 'briscola';
  const knownTrump = isBriscola && obs.deckCount > 0 && obs.trumpCard ? cardById(obs.trumpCard) : null;
  const pool = knownTrump ? unseen.filter((c) => c.id !== knownTrump.id) : unseen;

  let iter = 0;
  for (; iter < maxIter; iter++) {
    if ((iter & 31) === 0 && iter >= moves.length * 4 && now() > deadline) break;
    const sample = shuffle(pool, rng);
    const oppHand = sample.slice(0, obs.oppHandCount);
    const deck = knownTrump ? [...sample.slice(obs.oppHandCount), knownTrump] : sample.slice(obs.oppHandCount);
    const root = buildState(obs, oppHand, deck);

    // UCB1 at the root.
    let i = -1;
    if (iter < moves.length) i = iter;
    else {
      let bestU = -Infinity;
      const logN = Math.log(iter);
      for (let k = 0; k < moves.length; k++) {
        const u = sum[k] / n[k] + UCB_C * Math.sqrt(logN / n[k]);
        if (u > bestU) {
          bestU = u;
          i = k;
        }
      }
    }
    let state = applyMove(root, moves[i]).state;
    while (!state.over) state = applyMove(state, rolloutPolicy(state, rng)).state;
    n[i] += 1;
    sum[i] += diffFor(state, me);
  }

  // Most-visited child; ties broken by mean.
  let best = 0;
  for (let k = 1; k < moves.length; k++) {
    if (n[k] > n[best] || (n[k] === n[best] && sum[k] / n[k] > sum[best] / n[best])) best = k;
  }
  return moves[best];
}

/** Fast greedy policy with a little noise; sees only its own hand and the table. */
export function rolloutPolicy(state: RoundState, rng: Rng): Move {
  const game = state.game ?? 'scopa';
  const seat = state.turn;
  const hand = state.players[seat].hand;
  const moves = legalMoves(hand, state.table, game);
  if (moves.length === 1 || rng() < ROLLOUT_EPSILON) return moves[Math.floor(rng() * moves.length)];

  if (game === 'briscola') {
    const bCtx: BriscolaScoredContext = {
      hand,
      table: state.table,
      trumpSuit: state.trumpSuit ?? state.trumpCard?.suit ?? 'DENARI',
      deckCount: state.deck.length,
      trumpCard: state.trumpCard,
    };
    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      const s = scoreBriscolaMove(m, bCtx);
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    }
    return best;
  }

  const oppCards = state.players[other(seat)].hand.length;
  const ctx: ScoredContext = {
    hand,
    table: state.table,
    lastPlay: state.deck.length === 0 && oppCards === 0 && hand.length === 1,
    rankThreat: () => oppCards > 0 || state.deck.length > 0,
  };
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const s = scoreMove(m, ctx);
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }
  return best;
}

