import type { Difficulty } from '../ai/observation';
import type { TargetScore } from '../engine/match';
import type { TurnSeconds } from '../net/protocol';
import { detectLang, type Lang } from './i18n';

export type DeckId = 'napoletane' | 'piacentine' | 'siciliane' | 'bergamasche' | 'trevisane' | 'milanesi';

export interface Settings {
  lang: Lang;
  deck: DeckId;
  showNumbers: boolean;
  sound: boolean;
  music: boolean;
  haptics: boolean;
  emotesMuted: boolean;
  name: string;
  lastDifficulty: Difficulty;
  lastTarget: TargetScore;
  lastTurnSeconds: TurnSeconds;
  lastInspector: boolean;
}

export interface Stats {
  wins: number;
  losses: number;
  winsByDifficulty: Record<Difficulty, number>;
  onlineWins: number;
}

const KEY = 'scopa.settings.v1';
const STATS_KEY = 'scopa.stats.v1';

const defaults = (): Settings => ({
  lang: detectLang(),
  deck: 'napoletane',
  showNumbers: true, // ON by default for new users
  sound: true,
  music: false,
  haptics: true,
  emotesMuted: false,
  name: '',
  lastDifficulty: 'MEDIUM',
  lastTarget: 11,
  lastTurnSeconds: 30,
  lastInspector: true,
});

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable: settings just won't persist */
  }
}

export const settings: Settings = load(KEY, defaults());
export const stats: Stats = load(STATS_KEY, { wins: 0, losses: 0, winsByDifficulty: { EASY: 0, MEDIUM: 0, HARD: 0 }, onlineWins: 0 });

const listeners = new Set<() => void>();
export const onSettingsChange = (fn: () => void) => listeners.add(fn);

export function updateSettings(patch: Partial<Settings>) {
  Object.assign(settings, patch);
  save(KEY, settings);
  listeners.forEach((fn) => fn());
}

/** Deck unlocks (spec §4.2). */
export function isDeckUnlocked(id: DeckId): boolean {
  if (id === 'bergamasche') return stats.wins >= 3;
  if (id === 'trevisane') return stats.winsByDifficulty.HARD >= 1;
  return true;
}

/** Records a finished match and returns any decks that became unlocked. */
export function recordResult(won: boolean, difficulty: Difficulty | null): DeckId[] {
  const before = (['bergamasche', 'trevisane'] as DeckId[]).filter(isDeckUnlocked);
  if (won) {
    stats.wins++;
    if (difficulty) stats.winsByDifficulty[difficulty]++;
    else stats.onlineWins++;
  } else stats.losses++;
  save(STATS_KEY, stats);
  return (['bergamasche', 'trevisane'] as DeckId[]).filter((d) => isDeckUnlocked(d) && !before.includes(d));
}

// Online seat tokens, so a dropped connection can resume the same seat.
export const roomToken = {
  get: (room: string) => {
    try {
      return localStorage.getItem(`scopa.token.${room}`) ?? undefined;
    } catch {
      return undefined;
    }
  },
  set: (room: string, token: string) => {
    try {
      localStorage.setItem(`scopa.token.${room}`, token);
    } catch {
      /* ignore */
    }
  },
};
