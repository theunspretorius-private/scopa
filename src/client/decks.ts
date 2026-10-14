import { cardById, isSettebello, type Card, type Suit } from '../engine/cards';
import type { DeckId } from './settings';

/**
 * Regional deck skins. Cards travel over the network as data ids only; each client draws them
 * with its own locally selected skin (spec §4.1). All art is procedural SVG — no image assets.
 */
export interface DeckSkin {
  id: DeckId;
  name: string;
  region: string;
  french: boolean;
  doubleHeaded: boolean;
  curvedSwords: boolean;
  /** viewBox height (width is always 100). */
  h: number;
  bg: string;
  coinBg?: string;
  ink: string;
  stroke: number;
  frame: string;
  suit: Record<Suit, { main: string; accent: string }>;
  robe: [string, string, string];
  skin: string;
  gold: string;
  back: [string, string];
  masks?: boolean;
  mottoes?: Record<Suit, string>;
}

const ITALIAN_SUITS = {
  DENARI: { main: '#e2a72e', accent: '#b8432f' },
  COPPE: { main: '#d23c2d', accent: '#e2a72e' },
  SPADE: { main: '#2d6fb0', accent: '#e2a72e' },
  BASTONI: { main: '#3f8a3a', accent: '#a3622b' },
};

export const DECKS: Record<DeckId, DeckSkin> = {
  napoletane: {
    id: 'napoletane',
    name: 'Napoletane',
    region: 'Napoli',
    french: false,
    doubleHeaded: false,
    curvedSwords: true,
    h: 160,
    bg: '#fffaf0',
    ink: '#1d1a17',
    stroke: 1.6,
    frame: '#c8b48a',
    suit: ITALIAN_SUITS,
    robe: ['#d23c2d', '#2d6fb0', '#e2a72e'],
    skin: '#f6d1a8',
    gold: '#e2a72e',
    back: ['#9c1f1f', '#d9a441'],
    masks: true,
  },
  piacentine: {
    id: 'piacentine',
    name: 'Piacentine',
    region: 'Piacenza',
    french: false,
    doubleHeaded: true,
    curvedSwords: false,
    h: 160,
    bg: '#fbf7ee',
    ink: '#2a2118',
    stroke: 1.2,
    frame: '#8a6b3c',
    suit: {
      DENARI: { main: '#d9a22b', accent: '#7f3b1d' },
      COPPE: { main: '#b8322a', accent: '#d9a22b' },
      SPADE: { main: '#3a5f8f', accent: '#b8322a' },
      BASTONI: { main: '#5b7d33', accent: '#7f3b1d' },
    },
    robe: ['#b8322a', '#3a5f8f', '#d9a22b'],
    skin: '#f3d4b4',
    gold: '#d9a22b',
    back: ['#1f3c66', '#c9a64a'],
  },
  siciliane: {
    id: 'siciliane',
    name: 'Siciliane',
    region: 'Sicilia',
    french: false,
    doubleHeaded: false,
    curvedSwords: true,
    h: 150,
    bg: '#fff8e8',
    coinBg: '#f3d48a',
    ink: '#3b2414',
    stroke: 1.5,
    frame: '#d08a2c',
    suit: {
      DENARI: { main: '#e8a317', accent: '#c4442a' },
      COPPE: { main: '#c4442a', accent: '#e8a317' },
      SPADE: { main: '#2b7a8c', accent: '#e8a317' },
      BASTONI: { main: '#4d8c2f', accent: '#b5651d' },
    },
    robe: ['#c4442a', '#2b7a8c', '#e8a317'],
    skin: '#eec39a',
    gold: '#e8a317',
    back: ['#c4442a', '#f0c75e'],
  },
  bergamasche: {
    id: 'bergamasche',
    name: 'Bergamasche',
    region: 'Bergamo',
    french: false,
    doubleHeaded: true,
    curvedSwords: false,
    h: 160,
    bg: '#f6efe0',
    ink: '#120c08',
    stroke: 2.4,
    frame: '#5a3b20',
    suit: {
      DENARI: { main: '#c98a12', accent: '#6b1f12' },
      COPPE: { main: '#9b1b1b', accent: '#c98a12' },
      SPADE: { main: '#1e3d73', accent: '#9b1b1b' },
      BASTONI: { main: '#2f5d1e', accent: '#6b3a12' },
    },
    robe: ['#9b1b1b', '#1e3d73', '#2f5d1e'],
    skin: '#e8b98f',
    gold: '#c98a12',
    back: ['#3b1d0e', '#c98a12'],
  },
  trevisane: {
    id: 'trevisane',
    name: 'Trevisane',
    region: 'Treviso',
    french: false,
    doubleHeaded: true,
    curvedSwords: false,
    h: 180,
    bg: '#fdf9f1',
    ink: '#24201a',
    stroke: 1.3,
    frame: '#7a8c5b',
    suit: {
      DENARI: { main: '#d6a531', accent: '#7c2f22' },
      COPPE: { main: '#b5372b', accent: '#d6a531' },
      SPADE: { main: '#3b6d8f', accent: '#b5372b' },
      BASTONI: { main: '#6a8c3b', accent: '#7c4a22' },
    },
    robe: ['#3b6d8f', '#b5372b', '#6a8c3b'],
    skin: '#f2d2b0',
    gold: '#d6a531',
    back: ['#2f5a47', '#d6a531'],
    mottoes: {
      DENARI: 'Chi gioca per bisogno perde per necessità',
      COPPE: 'Bevi e lassa bever',
      SPADE: 'Non ti fidar di me se il cuor ti manca',
      BASTONI: 'Gioca pulito',
    },
  },
  milanesi: {
    id: 'milanesi',
    name: 'Milanesi',
    region: 'Milano',
    french: true,
    doubleHeaded: true,
    curvedSwords: false,
    h: 160,
    bg: '#ffffff',
    ink: '#1a1a1a',
    stroke: 1.2,
    frame: '#9aa3ad',
    suit: {
      DENARI: { main: '#c8102e', accent: '#c8102e' },
      COPPE: { main: '#c8102e', accent: '#c8102e' },
      SPADE: { main: '#1a1a1a', accent: '#1a1a1a' },
      BASTONI: { main: '#1a1a1a', accent: '#1a1a1a' },
    },
    robe: ['#c8102e', '#1f4e9c', '#e3b23c'],
    skin: '#f4d3b5',
    gold: '#e3b23c',
    back: ['#1f4e9c', '#e9eef5'],
  },
};

export const DECK_ORDER: DeckId[] = ['napoletane', 'piacentine', 'milanesi', 'siciliane', 'bergamasche', 'trevisane'];

// ------------------------------------------------------------------ suit symbols (unit box ±1)

function suitSymbol(suit: Suit, d: DeckSkin, x: number, y: number, s: number, rot = 0): string {
  const { main, accent } = d.suit[suit];
  const sw = (d.stroke * 0.7) / s;
  const g = (body: string) =>
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" stroke="${d.ink}" stroke-width="${sw.toFixed(3)}" stroke-linejoin="round">${body}</g>`;

  if (d.french) {
    const f = `fill="${main}" stroke="none"`;
    switch (suit) {
      case 'DENARI':
        return g(`<path ${f} d="M0-1 L.72 0 L0 1 L-.72 0Z"/>`);
      case 'COPPE':
        return g(`<path ${f} d="M0 .92 C-1.25 0-.95-1.05 0-.42 C.95-1.05 1.25 0 0 .92Z"/>`);
      case 'SPADE':
        return g(`<path ${f} d="M0-1 C1.15-.1.85.78.12.36 L.32.98 H-.32 L-.12.36 C-.85.78-1.15-.1 0-1Z"/>`);
      case 'BASTONI':
        return g(
          `<g ${f}><circle cy="-.48" r=".4"/><circle cx="-.46" cy=".12" r=".4"/><circle cx=".46" cy=".12" r=".4"/><path d="M-.1 0 L-.3 .98 H.3 L.1 0Z"/></g>`,
        );
    }
  }

  switch (suit) {
    case 'DENARI': {
      let petals = '';
      for (let i = 0; i < 8; i++) petals += `<ellipse rx=".1" ry=".26" cy="-.42" transform="rotate(${i * 45})" fill="${main}" stroke="none"/>`;
      return g(
        `<circle r="1" fill="${main}"/><circle r=".76" fill="${accent}"/>${petals}<circle r=".2" fill="${main}"/><circle r=".07" fill="${d.ink}" stroke="none"/>`,
      );
    }
    case 'COPPE':
      return g(
        `<path fill="${main}" d="M-.78-.9 H.78 Q.74-.05 0 .14 Q-.74-.05-.78-.9Z"/><rect x="-.82" y="-.98" width="1.64" height=".18" rx=".06" fill="${accent}"/><rect x="-.11" y=".12" width=".22" height=".5" fill="${accent}"/><ellipse cy=".26" rx=".22" ry=".09" fill="${main}"/><ellipse cy=".74" rx=".58" ry=".2" fill="${main}"/>`,
      );
    case 'SPADE': {
      const blade = d.curvedSwords
        ? `<path fill="#dfe6ee" d="M-.12.5 Q-.42-.3.18-1 Q.02-.25.14.5Z"/>`
        : `<path fill="#dfe6ee" d="M-.13.5 V-.78 L0-1 L.13-.78 V.5Z"/><path d="M0-.85 V.45" stroke-width="${(sw * 0.6).toFixed(3)}"/>`;
      return g(
        `${blade}<rect x="-.48" y=".46" width=".96" height=".13" rx=".06" fill="${main}"/><rect x="-.09" y=".59" width=".18" height=".3" fill="${accent}"/><circle cy=".95" r=".1" fill="${main}"/>`,
      );
    }
    case 'BASTONI':
      return g(
        `<path fill="${main}" d="M-.4-.92 Q0-1.12.4-.92 L.18.95 Q0 1.04-.18.95Z"/><circle cx="-.24" cy="-.42" r=".1" fill="${accent}"/><circle cx=".2" cy="-.02" r=".09" fill="${accent}"/><circle cx="-.13" cy=".42" r=".08" fill="${accent}"/><path d="M-.12-.85 Q0-.9.1-.85" fill="none" stroke="${accent}"/>`,
      );
  }
}

// ------------------------------------------------------------------ pips & figures

function pipLayout(n: number, h: number): [number, number][] {
  const top = h * 0.25;
  const mid = h * 0.5;
  const bot = h * 0.75;
  const L = 31;
  const R = 69;
  const C = 50;
  switch (n) {
    case 1:
      return [[C, mid]];
    case 2:
      return [[C, top], [C, bot]];
    case 3:
      return [[C, top - 4], [C, mid], [C, bot + 4]];
    case 4:
      return [[L, top], [R, top], [L, bot], [R, bot]];
    case 5:
      return [[L, top], [R, top], [C, mid], [L, bot], [R, bot]];
    case 6:
      return [[L, top - 4], [R, top - 4], [L, mid], [R, mid], [L, bot + 4], [R, bot + 4]];
    default:
      return [[L, top - 6], [R, top - 6], [C, (top + mid) / 2 - 3], [L, mid], [R, mid], [L, bot + 6], [R, bot + 6]];
  }
}

/** A stylized figure filling a 100×h box. `bust` draws just head and shoulders (double-headed decks). */
function figure(card: Card, d: DeckSkin, h: number, bust: boolean): string {
  const [r1, r2, r3] = d.robe;
  const ink = d.ink;
  const sw = d.stroke;
  const headY = bust ? h * 0.36 : h * 0.24;
  const headR = bust ? 11 : 9;
  const hx = card.rank === 9 ? 56 : 50;
  const hat = (() => {
    if (card.rank === 10)
      return `<path d="M${hx - 12} ${headY - headR + 2} l3 -12 l5 7 l4 -10 l4 10 l5 -7 l3 12z" fill="${d.gold}" stroke="${ink}" stroke-width="${sw * 0.7}"/>`;
    if (card.rank === 9)
      return `<path d="M${hx - 11} ${headY - headR + 3} q11 -16 22 0z" fill="${r3}" stroke="${ink}" stroke-width="${sw * 0.7}"/><path d="M${hx + 8} ${headY - headR} q8 -10 14 -6" fill="none" stroke="${r1}" stroke-width="${sw * 1.6}"/>`;
    return `<ellipse cx="${hx - 2}" cy="${headY - headR + 2}" rx="13" ry="5" fill="${r2}" stroke="${ink}" stroke-width="${sw * 0.7}"/><path d="M${hx + 8} ${headY - headR} l9 -6" stroke="${r1}" stroke-width="${sw * 1.4}"/>`;
  })();
  const beard = card.rank === 10 ? `<path d="M${hx - 7} ${headY + 3} q7 14 14 0z" fill="#8b5a2b" stroke="${ink}" stroke-width="${sw * 0.5}"/>` : '';
  const face = `<circle cx="${hx}" cy="${headY}" r="${headR}" fill="${d.skin}" stroke="${ink}" stroke-width="${sw * 0.7}"/><circle cx="${hx - 3.5}" cy="${headY - 1}" r="1" fill="${ink}"/><circle cx="${hx + 3.5}" cy="${headY - 1}" r="1" fill="${ink}"/><path d="M${hx - 3} ${headY + 4} q3 2 6 0" fill="none" stroke="${ink}" stroke-width="${sw * 0.5}"/>${beard}${hat}`;

  if (bust) {
    const shoulderY = headY + headR + 2;
    const body = `<path d="M14 ${h} Q16 ${shoulderY} 50 ${shoulderY} Q84 ${shoulderY} 86 ${h}Z" fill="${r1}" stroke="${ink}" stroke-width="${sw}"/><path d="M38 ${shoulderY + 1} L50 ${h} L62 ${shoulderY + 1}" fill="${r2}" stroke="${ink}" stroke-width="${sw * 0.6}"/><path d="M14 ${h - 6} H86" stroke="${r3}" stroke-width="${sw * 2}"/>`;
    return body + face + suitSymbol(card.suit, d, 76, shoulderY + 14, 9);
  }

  if (card.rank === 9) {
    // Knight on horseback.
    const by = h * 0.68;
    const horse = `<g stroke="${ink}" stroke-width="${sw}" fill="#f2efe6"><path d="M24 ${by + 10} l-4 26 M36 ${by + 12} l2 24 M64 ${by + 12} l-2 24 M76 ${by + 10} l5 26" fill="none"/><ellipse cx="50" cy="${by}" rx="30" ry="15"/><path d="M22 ${by - 4} Q12 ${by - 30} 20 ${by - 38} L30 ${by - 34} Q28 ${by - 22} 34 ${by - 10}Z"/><circle cx="21" cy="${by - 32}" r="1.2" fill="${ink}"/><path d="M78 ${by - 4} q14 6 8 26" fill="none"/></g><path d="M24 ${by - 6} Q50 ${by + 4} 76 ${by - 6} L72 ${by + 8} Q50 ${by + 16} 28 ${by + 8}Z" fill="${r2}" stroke="${ink}" stroke-width="${sw * 0.6}"/>`;
    const rider = `<path d="M${hx - 10} ${headY + headR} L${hx + 10} ${headY + headR} L${hx + 12} ${by - 6} L${hx - 12} ${by - 6}Z" fill="${r1}" stroke="${ink}" stroke-width="${sw}"/><path d="M${hx - 6} ${by - 8} l-4 18" stroke="${r3}" stroke-width="${sw * 3}"/>`;
    return horse + rider + face + suitSymbol(card.suit, d, 80, headY + 16, 9);
  }

  const bodyTop = headY + headR;
  const wide = card.rank === 10 ? 30 : 22;
  const robe = `<path d="M${50 - 12} ${bodyTop} H${50 + 12} L${50 + wide} ${h * 0.86} H${50 - wide}Z" fill="${r1}" stroke="${ink}" stroke-width="${sw}"/><path d="M50 ${bodyTop} V${h * 0.86}" stroke="${r3}" stroke-width="${sw * 2.2}"/><path d="M${50 - 15} ${h * 0.52} H${50 + 15}" stroke="${r2}" stroke-width="${sw * 2.5}"/>`;
  const legs = `<path d="M42 ${h * 0.86} v8 M58 ${h * 0.86} v8" stroke="${ink}" stroke-width="${sw * 2}"/>`;
  const cape = card.rank === 10 ? `<path d="M${50 - 14} ${bodyTop + 2} Q${50 - 40} ${h * 0.6} ${50 - 32} ${h * 0.86} H${50 - 22}Z" fill="${r2}" stroke="${ink}" stroke-width="${sw * 0.7}"/>` : '';
  return cape + robe + legs + face + suitSymbol(card.suit, d, 74, h * 0.46, 10);
}

function mask(x: number, y: number, d: DeckSkin): string {
  // The grotesque mascheroni of the Neapolitan 3 of Clubs and 5 of Swords.
  return `<g transform="translate(${x} ${y})" stroke="${d.ink}" stroke-width="1"><ellipse rx="9" ry="10" fill="#f0c9a0"/><circle cx="-3.5" cy="-2" r="2" fill="#fff"/><circle cx="3.5" cy="-2" r="2" fill="#fff"/><circle cx="-3.5" cy="-2" r=".9" fill="${d.ink}"/><circle cx="3.5" cy="-2" r=".9" fill="${d.ink}"/><path d="M-6 4 q6 -3 12 0" fill="#7a2a1a"/><path d="M0 -1 l-1.5 4 h3z" fill="#d88a6a"/><path d="M-9 -6 q9 -9 18 0" fill="none" stroke="#7a2a1a" stroke-width="2"/></g>`;
}

const FACE_NAMES: Record<number, [string, string]> = { 8: ['FANTE', 'J'], 9: ['CAVALLO', 'Q'], 10: ['RE', 'K'] };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// ------------------------------------------------------------------ public API

const cache = new Map<string, string>();
let uid = 0;

export function cardSVG(id: string, deckId: DeckId, showNumbers: boolean): string {
  const key = `${deckId}|${id}|${showNumbers}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const d = DECKS[deckId];
  const c = cardById(id);
  const W = 100;
  const H = d.h;
  const bg = c.suit === 'DENARI' && d.coinBg ? d.coinBg : d.bg;
  const parts: string[] = [];
  parts.push(`<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="7" fill="${bg}" stroke="${d.frame}" stroke-width="2"/>`);
  parts.push(`<rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="4" fill="none" stroke="${d.frame}" stroke-width="0.8" opacity=".7"/>`);

  if (c.rank <= 7) {
    const big = c.rank === 1;
    const s = big ? 25 : c.rank >= 6 ? 10 : 11.5;
    if (big) parts.push(`<circle cx="50" cy="${H / 2}" r="36" fill="none" stroke="${d.suit[c.suit].main}" stroke-width="1" stroke-dasharray="2 3" opacity=".6"/>`);
    for (const [x, y] of pipLayout(c.rank, H)) parts.push(suitSymbol(c.suit, d, x, y, s));
    if (d.masks && ((c.suit === 'BASTONI' && c.rank === 3) || (c.suit === 'SPADE' && c.rank === 5))) {
      parts.push(mask(c.rank === 3 ? 76 : 50, c.rank === 3 ? H / 2 : H * 0.38, d));
    }
    if (big && d.mottoes) {
      parts.push(
        `<text x="50" y="${H - 16}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="6" fill="${d.ink}">${esc(d.mottoes[c.suit])}</text>`,
      );
    }
  } else {
    const clip = `fc${uid++}`;
    if (d.doubleHeaded) {
      const half = H / 2;
      const top = figure(c, d, half, true);
      parts.push(`<clipPath id="${clip}"><rect x="8" y="8" width="${W - 16}" height="${half - 8}"/></clipPath>`);
      parts.push(`<g clip-path="url(#${clip})">${top}</g>`);
      parts.push(`<g transform="rotate(180 50 ${half})"><g clip-path="url(#${clip})">${top}</g></g>`);
      parts.push(`<path d="M8 ${half} H${W - 8}" stroke="${d.ink}" stroke-width="${d.stroke}"/>`);
    } else {
      parts.push(`<clipPath id="${clip}"><rect x="8" y="8" width="${W - 16}" height="${H - 26}"/></clipPath>`);
      parts.push(`<g clip-path="url(#${clip})">${figure(c, d, H - 18, false)}</g>`);
      parts.push(
        `<text x="50" y="${H - 9}" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="9" letter-spacing="1" fill="${d.ink}">${FACE_NAMES[c.rank][d.french ? 1 : 0]}</text>`,
      );
    }
  }

  if (showNumbers) {
    const badge = (x: number, y: number, rot: number) =>
      `<g transform="rotate(${rot} ${x + 9} ${y + 10})"><rect x="${x}" y="${y}" width="18" height="20" rx="4" fill="#111" opacity=".88"/><text x="${x + 9}" y="${y + 15}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="14" fill="#fff">${c.rank}</text></g>`;
    parts.push(badge(3, 3, 0), badge(W - 21, H - 23, 180));
  }
  if (isSettebello(c)) {
    parts.push(
      `<g class="sb-star"><circle cx="${W - 13}" cy="13" r="9" fill="#fff6c8" stroke="#c99a18" stroke-width="1.2"/><path transform="translate(${W - 13} 13) scale(6)" d="M0-1 L.29-.4 .95-.31 .47.15 .59.81 0 .5-.59.81-.47.15-.95-.31-.29-.4Z" fill="#e0a800"/></g>`,
    );
  }

  const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${parts.join('')}</svg>`;
  cache.set(key, svg);
  return svg;
}

export function backSVG(deckId: DeckId): string {
  const key = `${deckId}|back`;
  const hit = cache.get(key);
  if (hit) return hit;
  const d = DECKS[deckId];
  const [a, b] = d.back;
  const id = `bk${deckId}`;
  const svg = `<svg viewBox="0 0 100 ${d.h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="${a}"/><rect width="4" height="10" fill="${b}" opacity=".35"/></pattern></defs><rect x="1" y="1" width="98" height="${d.h - 2}" rx="7" fill="${a}" stroke="#fff" stroke-width="3"/><rect x="7" y="7" width="86" height="${d.h - 14}" rx="4" fill="url(#${id})"/><circle cx="50" cy="${d.h / 2}" r="17" fill="${a}" stroke="${b}" stroke-width="2.5"/><text x="50" y="${d.h / 2 + 7}" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="20" fill="${b}">S</text></svg>`;
  cache.set(key, svg);
  return svg;
}

export const deckAspect = (deckId: DeckId): string => `100 / ${DECKS[deckId].h}`;
