import type { Rng } from '../engine/rng';
import { pick } from '../engine/rng';
import { legalMoves, type Move } from '../engine/rules';
import { ids2cards, type AIObservation } from './observation';

/** Principiante: no memory; 70% grabs a random capture, 30% plays a random card. */
export function easyMove(obs: AIObservation, rng: Rng): Move {
  const moves = legalMoves(ids2cards(obs.hand), ids2cards(obs.table));
  const captures = moves.filter((m) => m.capture.length > 0);
  if (captures.length > 0 && rng() < 0.7) return pick(captures, rng);
  const trails = moves.filter((m) => m.capture.length === 0);
  return pick(trails.length > 0 ? trails : moves, rng);
}
