import type { Rng } from './rng';
import { applyMove, dealRound, other, type PlayResult, type RoundState, type Seat } from './round';
import type { Move } from './rules';
import { scoreRound, type RoundBreakdown } from './scoring';

export type TargetScore = 11 | 16 | 21;
export const TARGET_SCORES: readonly TargetScore[] = [11, 16, 21];

export type MatchStatus = 'IN_PROGRESS' | 'ROUND_END' | 'MATCH_OVER';

export interface MatchState {
  target: TargetScore;
  scores: [number, number];
  roundNumber: number;
  round: RoundState;
  status: MatchStatus;
  lastBreakdown: RoundBreakdown | null;
  history: RoundBreakdown[];
  winner: Seat | null;
}

/** A player wins when at or above target and strictly ahead. Otherwise play continues in full rounds. */
export function matchWinner(scores: readonly [number, number], target: number): Seat | null {
  const [a, b] = scores;
  if (Math.max(a, b) < target || a === b) return null;
  return a > b ? 0 : 1;
}

export function newMatch(target: TargetScore, rng: Rng, firstDealer?: Seat): MatchState {
  const dealer: Seat = firstDealer ?? (rng() < 0.5 ? 0 : 1);
  return {
    target,
    scores: [0, 0],
    roundNumber: 1,
    round: dealRound(dealer, rng),
    status: 'IN_PROGRESS',
    lastBreakdown: null,
    history: [],
    winner: null,
  };
}

export function playMove(match: MatchState, move: Move): { match: MatchState; result: PlayResult } {
  if (match.status !== 'IN_PROGRESS') throw new Error('Match is not in progress');
  const { state, result } = applyMove(match.round, move);
  const next: MatchState = { ...match, round: state };
  if (state.over) {
    const breakdown = scoreRound(state.players, match.scores, match.roundNumber);
    next.scores = [breakdown.player1.newTotalScore, breakdown.player2.newTotalScore];
    next.lastBreakdown = breakdown;
    next.history = [...match.history, breakdown];
    next.winner = matchWinner(next.scores, match.target);
    next.status = next.winner === null ? 'ROUND_END' : 'MATCH_OVER';
  }
  return { match: next, result };
}

/** Start the next round; the deal alternates. */
export function nextRound(match: MatchState, rng: Rng): MatchState {
  if (match.status !== 'ROUND_END') throw new Error('Round has not ended');
  return {
    ...match,
    roundNumber: match.roundNumber + 1,
    round: dealRound(other(match.round.dealer), rng),
    status: 'IN_PROGRESS',
  };
}

/** Forfeit: the other seat wins immediately. */
export function forfeit(match: MatchState, loser: Seat): MatchState {
  return { ...match, status: 'MATCH_OVER', winner: other(loser) };
}

