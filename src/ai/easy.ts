import type { Rng } from '../engine/rng';
import { pick } from '../engine/rng';
import { briscolaBeats, legalMoves, type Move } from '../engine/rules';
import { ids2cards, type AIObservation } from './observation';

/** Principiante: no memory; makes frequent mistakes in both Scopa and Briscola. */
export function easyMove(obs: AIObservation, rng: Rng): Move {
  const game = obs.game ?? 'scopa';
  const hand = ids2cards(obs.hand);
  const table = ids2cards(obs.table);
  const moves = legalMoves(hand, table, game);
  if (game === 'briscola') {
    if (table.length === 1 && obs.trumpSuit && rng() < 0.55) {
      const lead = table[0];
      const winning = hand.filter((c) => briscolaBeats(lead, c, obs.trumpSuit!));
      if (winning.length > 0 && lead.briscolaValue > 0) {
        return { cardId: pick(winning, rng).id, capture: [] };
      }
    }
    return pick(moves, rng);
  }
  const captures = moves.filter((m) => m.capture.length > 0);
  if (captures.length > 0 && rng() < 0.7) return pick(captures, rng);
  const trails = moves.filter((m) => m.capture.length === 0);
  return pick(trails.length > 0 ? trails : moves, rng);
}

