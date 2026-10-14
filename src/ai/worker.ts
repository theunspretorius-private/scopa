/// <reference lib="webworker" />
import { chooseMove, type AIObservation, type Difficulty } from './index';

interface Req {
  id: number;
  obs: AIObservation;
  difficulty: Difficulty;
  seed: number;
}

self.onmessage = (e: MessageEvent<Req>) => {
  const { id, obs, difficulty, seed } = e.data;
  try {
    (self as unknown as Worker).postMessage({ id, move: chooseMove(obs, difficulty, seed) });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String(err) });
  }
};
