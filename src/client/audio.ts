import { settings } from './settings';

/**
 * Procedural audio (no asset downloads): card slides, capture snaps, the scopa "broom" sweep,
 * and a gentle mandolin-style tremolo loop for background music.
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
  tick: () => settings.sound && tone(1100, 0.03, 0.08, 'square'),
  pop: () => settings.sound && tone(660, 0.07, 0.12, 'sine'),
};

// ------------------------------------------------------------------ music

let musicTimer: number | null = null;
let musicGain: GainNode | null = null;
let step = 0;

// A simple I–IV–V–I progression in D major, played as mandolin tremolo + guitar bass.
const PROG = [
  [293.66, 369.99, 440.0],
  [392.0, 493.88, 587.33],
  [440.0, 554.37, 659.25],
  [293.66, 369.99, 440.0],
];

function musicTick() {
  const c = ac();
  if (!c || !musicGain) return;
  const chord = PROG[Math.floor(step / 8) % PROG.length];
  const beat = step % 8;
  if (beat === 0) tone(chord[0] / 2, 1.2, 0.18, 'sine', 0, musicGain);
  const note = chord[[0, 1, 2, 1, 2, 1, 0, 1][beat]] * (beat === 4 ? 2 : 1);
  for (let k = 0; k < 3; k++) tone(note, 0.09, 0.06, 'sawtooth', k * 0.06, musicGain);
  step++;
}

export function syncMusic() {
  const c = ac();
  if (!c) return;
  const want = settings.music && c.state === 'running' && document.visibilityState === 'visible';
  if (want && musicTimer === null) {
    musicGain = c.createGain();
    musicGain.gain.value = 0.25;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    musicGain.connect(lp).connect(master!);
    musicTimer = window.setInterval(musicTick, 330);
  } else if (!want && musicTimer !== null) {
    clearInterval(musicTimer);
    musicTimer = null;
    musicGain?.disconnect();
    musicGain = null;
  }
}

document.addEventListener('visibilitychange', syncMusic);
