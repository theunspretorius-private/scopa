import { observe, type Difficulty } from '../../ai/observation';
import { newMatch, nextRound, playMove, type MatchState, type TargetScore } from '../../engine/match';
import { mulberry32, randomSeed } from '../../engine/rng';
import type { Seat } from '../../engine/round';
import type { GameType, Move } from '../../engine/rules';
import { buildView, toLastPlay, type EmoteId, type GameView, type LastPlay } from '../../net/protocol';
import { requestAIMove } from '../aiClient';
import { t } from '../i18n';
import { Emitter, type ConnStatus, type GameController } from './types';

const HUMAN: Seat = 0;
const AI: Seat = 1;
/** Leave time for the previous play's animation before the computer moves. */
const AI_MIN_DELAY = 950;

export class LocalController implements GameController {
  readonly kind = 'local' as const;
  private match: MatchState;
  private rng = mulberry32(randomSeed());
  private lastPlay: LastPlay | null = null;
  private seq = 0;
  private views = new Emitter<[GameView]>();
  private emotes = new Emitter<[Seat, EmoteId]>();
  private disposed = false;
  private thinking = false;
  view: GameView | null = null;

  constructor(
    readonly difficulty: Difficulty,
    private readonly target: TargetScore,
    private readonly playerName: string,
    readonly game: GameType = 'scopa',
  ) {
    this.match = newMatch(target, this.rng, undefined, game);
    queueMicrotask(() => this.publish());
  }

  private get names(): [string, string] {
    return [this.playerName || t('you'), `${t('computer')} · ${t(this.difficulty)}`];
  }

  subscribe(fn: (v: GameView) => void) {
    const off = this.views.on(fn);
    if (this.view) fn(this.view);
    return off;
  }
  onEmote(fn: (from: Seat, id: EmoteId) => void) {
    this.emotes.on(fn);
  }
  onStatus(_fn: (s: ConnStatus) => void) {}

  private publish() {
    if (this.disposed) return;
    this.view = buildView(this.match, HUMAN, {
      names: this.names,
      lastPlay: this.lastPlay,
      inspector: this.difficulty !== 'HARD',
    });
    this.views.emit(this.view);
    this.maybeAITurn();
  }

  private maybeAITurn() {
    if (this.thinking || this.match.status !== 'IN_PROGRESS' || this.match.round.turn !== AI) return;
    this.thinking = true;
    const started = Date.now();
    const round = this.match.round;
    void requestAIMove(observe(round, AI), this.difficulty).then((move) => {
      const wait = Math.max(0, AI_MIN_DELAY - (Date.now() - started));
      setTimeout(() => {
        this.thinking = false;
        if (this.disposed || this.match.round !== round) return;
        this.apply(move);
      }, wait);
    });
  }

  private apply(move: Move) {
    const { match, result } = playMove(this.match, move);
    this.match = match;
    this.lastPlay = toLastPlay(++this.seq, result);
    if (this.game === 'briscola') {
      if (result.trickPoints && result.trickPoints >= 11) {
        if (result.trickWinner === AI && this.rng() < 0.35) {
          setTimeout(() => this.emotes.emit(AI, 'nice'), 900);
        } else if (result.trickWinner === HUMAN && result.trickPoints >= 20 && this.rng() < 0.45) {
          setTimeout(() => this.emotes.emit(AI, 'mamma'), 900);
        }
      }
    } else if (result.scopa) {
      const chance = result.seat === AI ? 0.45 : 0.3;
      if (this.rng() < chance) setTimeout(() => this.emotes.emit(AI, result.seat === AI ? 'scopa' : 'mamma'), 900);
    } else if (result.seat === HUMAN && result.captured.some((c) => c.id === 'DENARI_7') && this.rng() < 0.5) {
      setTimeout(() => this.emotes.emit(AI, 'luck'), 900);
    }
    this.publish();
  }

  play(move: Move) {
    if (this.match.status !== 'IN_PROGRESS' || this.match.round.turn !== HUMAN) return;
    this.apply(move); // throws on illegal — UI only offers legal moves
  }

  continueRound() {
    if (this.match.status !== 'ROUND_END') return;
    this.match = nextRound(this.match, this.rng);
    this.lastPlay = null;
    this.publish();
  }

  rematch() {
    if (this.match.status !== 'MATCH_OVER') return;
    this.match = newMatch(this.target, this.rng, undefined, this.game);
    this.lastPlay = null;
    this.publish();
  }

  emote(id: EmoteId) {
    // The computer answers in kind, occasionally.
    if (id === 'hello' || id === 'gg') setTimeout(() => this.emotes.emit(AI, id), 1200);
  }

  dispose() {
    this.disposed = true;
    this.views.clear();
    this.emotes.clear();
  }
}

