import type { Rng } from '../engine/rng';
import { legalMoves, type Move } from '../engine/rules';
import { scoreMove, type ScoredContext } from './heuristics';
import { ids2cards, type AIObservation } from './observation';

/** Esperto: heuristic utility scoring, remembers which sevens are gone, trails defensively. */
export function mediumMove(obs: AIObservation, rng: Rng): Move {
  const hand = ids2cards(obs.hand);
  const table = ids2cards(obs.table);
  const seen = new Set([...obs.hand, ...obs.table, ...obs.myCaptured, ...obs.oppCaptured]);
  const sevensOut = ['DENARI_7', 'COPPE_7', 'SPADE_7', 'BASTONI_7'].every((id) => seen.has(id));
  const ctx: ScoredContext = {
    hand,
    table,
    lastPlay: obs.deckCount === 0 && obs.oppHandCount === 0 && hand.length === 1,
    // Medium only tracks sevens; any other rank is assumed to be out there.
    rankThreat: (rank) => obs.oppHandCount > 0 && !(rank === 7 && sevensOut),
  };
  let best: Move[] = [];
  let bestScore = -Infinity;
  for (const m of legalMoves(hand, table)) {
    const s = scoreMove(m, ctx);
    if (s > bestScore + 1e-9) {
      best = [m];
      bestScore = s;
    } else if (Math.abs(s - bestScore) <= 1e-9) best.push(m);
  }
  return best[Math.floor(rng() * best.length)];
}
