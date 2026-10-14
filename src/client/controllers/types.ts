import type { Difficulty } from '../../ai/observation';
import type { Seat } from '../../engine/round';
import type { Move } from '../../engine/rules';
import type { EmoteId, GameView, RoomConfig } from '../../net/protocol';

export type ConnStatus =
  | { kind: 'ok' }
  | { kind: 'connecting' }
  | { kind: 'reconnecting' }
  | { kind: 'waiting'; room: string; config: RoomConfig }
  | { kind: 'error'; code: string };

export interface GameController {
  readonly kind: 'local' | 'online';
  readonly difficulty: Difficulty | null;
  readonly view: GameView | null;
  subscribe(fn: (view: GameView) => void): () => void;
  onEmote(fn: (from: Seat, id: EmoteId) => void): void;
  onStatus(fn: (s: ConnStatus) => void): void;
  play(move: Move): void;
  continueRound(): void;
  rematch(): void;
  emote(id: EmoteId): void;
  dispose(): void;
}

export class Emitter<T extends unknown[]> {
  private fns = new Set<(...a: T) => void>();
  on(fn: (...a: T) => void): () => void {
    this.fns.add(fn);
    return () => this.fns.delete(fn);
  }
  emit(...a: T) {
    this.fns.forEach((f) => f(...a));
  }
  clear() {
    this.fns.clear();
  }
}
