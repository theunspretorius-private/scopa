import { mulberry32 } from '../engine/rng';
import type { Move } from '../engine/rules';
import { easyMove } from './easy';
import { hardMove } from './hard';
import { mediumMove } from './medium';
import type { AIObservation, Difficulty } from './observation';

export * from './observation';

export function chooseMove(obs: AIObservation, difficulty: Difficulty, seed: number, timeMs = 700): Move {
  const rng = mulberry32(seed);
  switch (difficulty) {
    case 'EASY':
      return easyMove(obs, rng);
    case 'MEDIUM':
      return mediumMove(obs, rng);
    case 'HARD':
      return hardMove(obs, rng, { timeMs });
  }
}
