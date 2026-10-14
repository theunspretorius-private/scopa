import { chooseMove, type AIObservation, type Difficulty } from '../ai';
import type { Move } from '../engine/rules';
import { randomSeed } from '../engine/rng';

let worker: Worker | null = null;
let workerBroken = false;
let nextId = 1;
const pending = new Map<number, { resolve: (m: Move) => void; fallback: () => void }>();

function getWorker(): Worker | null {
  if (worker || workerBroken) return worker;
  try {
    worker = new Worker(new URL('../ai/worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; move?: Move; error?: string }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.move) p.resolve(e.data.move);
      else p.fallback();
    };
    worker.onerror = () => {
      workerBroken = true;
      worker?.terminate();
      worker = null;
      for (const p of pending.values()) p.fallback();
      pending.clear();
    };
  } catch {
    workerBroken = true;
  }
  return worker;
}

/** Runs the AI off the main thread so animations stay smooth while the Maestro thinks. */
export function requestAIMove(obs: AIObservation, difficulty: Difficulty): Promise<Move> {
  const seed = randomSeed();
  return new Promise((resolve) => {
    const fallback = () => resolve(chooseMove(obs, difficulty, seed, 400));
    const w = getWorker();
    if (!w) return fallback();
    const id = nextId++;
    pending.set(id, { resolve, fallback });
    w.postMessage({ id, obs, difficulty, seed });
  });
}
