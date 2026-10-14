import { settings, updateSettings } from './settings';

/**
 * Procedural sound effects (card slides, capture snaps, the scopa "broom" sweep) plus a
 * background music playlist that cycles through the tracks in /music.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function ac(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.7;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

/** Browsers only allow audio after a user gesture. */
export function unlockAudio() {
  const c = ac();
  if (c && c.state === 'suspended') void c.resume();
  unlocked = true;
  syncMusic();
}

function noise(dur: number, freq: number, q: number, gain: number, sweepTo?: number, delay = 0) {
  const c = ac();
  if (!c || !settings.sound || !noiseBuf) return;
  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

function tone(freq: number, dur: number, gain: number, type: OscillatorType = 'triangle', delay = 0, dest?: AudioNode) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest ?? master!);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  slide: () => noise(0.18, 2200, 0.8, 0.35, 900),
  deal: () => [0, 0.07, 0.14].forEach((d) => noise(0.09, 2600, 1, 0.2, 1400, d)),
  snap: () => {
    noise(0.06, 3200, 1.5, 0.6);
    if (settings.sound) tone(180, 0.08, 0.25, 'sine');
  },
  broom: () => {
    noise(0.45, 600, 0.6, 0.5, 4000);
    noise(0.4, 900, 0.6, 0.4, 5000, 0.22);
  },
  fanfare: () => {
    if (!settings.sound) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 0.18, 'triangle', i * 0.11));
  },
  /** A bright coin-shower arpeggio for winning the 7 of Coins; a falling sigh when the opponent does. */
  settebello: (mine: boolean) => {
    if (!settings.sound) return;
    if (mine) {
      [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.5, 0.16, 'triangle', i * 0.08));
      [2637, 3136, 2349, 3520, 2794, 3951].forEach((f, i) => tone(f, 0.12, 0.06, 'sine', 0.45 + i * 0.06));
      [523, 659, 784].forEach((f) => tone(f, 0.9, 0.1, 'sine', 0.45));
    } else {
      [659, 622, 587, 554].forEach((f, i) => tone(f, 0.32, 0.14, 'triangle', i * 0.16));
      tone(277, 0.7, 0.12, 'sine', 0.64);
    }
  },
  tick: () => settings.sound && tone(1100, 0.03, 0.08, 'square'),
  pop: () => settings.sound && tone(660, 0.07, 0.12, 'sine'),
};

// ------------------------------------------------------------------ music

const TRACKS = ['/music/settebello.mp3', '/music/afternoon-in-the-square.mp3', '/music/settebello-2.mp3'];
const MUSIC_VOLUME = 0.35;

let player: HTMLAudioElement | null = null;
let track = 0;
let unlocked = false;
let held = false;

/** Keep the music silent while something else (the intro video) is playing. */
export function holdMusic(hold: boolean) {
  held = hold;
  // Releasing the hold (intro finished) starts the music straight away. If the browser
  // still blocks audio, play() fails quietly and the first tap starts it instead.
  if (!hold) unlocked = true;
  syncMusic();
}

function musicPlayer(): HTMLAudioElement {
  if (player) return player;
  player = new Audio(TRACKS[track]);
  player.preload = 'auto';
  player.volume = MUSIC_VOLUME;
  // When a track finishes, move on to the next one and wrap around.
  player.addEventListener('ended', () => {
    track = (track + 1) % TRACKS.length;
    player!.src = TRACKS[track];
    syncMusic();
  });
  return player;
}

export function syncMusic() {
  if (unlocked) ac(); // keep sound effects unlocked with the same gesture
  const want = settings.music && unlocked && !held && document.visibilityState === 'visible';
  if (want) {
    const p = musicPlayer();
    if (p.paused) void p.play().catch(() => {});
  } else player?.pause();
}

/** Mute/unmute the music; returns the new state. */
export function toggleMusic(): boolean {
  updateSettings({ music: !settings.music });
  unlocked = true;
  syncMusic();
  return settings.music;
}

export const musicIcon = (): string => (settings.music ? '🔊' : '🔇');

document.addEventListener('visibilitychange', syncMusic);
