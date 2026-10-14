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
  DENARI: { main: '#d89b1c', accent: '#a6331a' },
  COPPE: { main: '#c22d22', accent: '#d89b1c' },
  SPADE: { main: '#255e99', accent: '#d89b1c' },
  BASTONI: { main: '#2e7d32', accent: '#8d531b' },
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
    bg: '#fcf8ec',
    ink: '#1c1611',
    stroke: 1.5,
    frame: '#bfa068',
    suit: ITALIAN_SUITS,
    robe: ['#be2b20', '#20578e', '#d89b1c'],
    skin: '#f5cd9e',
    gold: '#d89b1c',
    back: ['#8f1818', '#e5b854'],
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
    bg: '#faf6ea',
    ink: '#221912',
    stroke: 1.3,
    frame: '#8a6838',
    suit: {
      DENARI: { main: '#cf9420', accent: '#783116' },
      COPPE: { main: '#ad2920', accent: '#cf9420' },
      SPADE: { main: '#2c5382', accent: '#ad2920' },
      BASTONI: { main: '#4c6f2a', accent: '#783116' },
    },
    robe: ['#ad2920', '#2c5382', '#cf9420'],
    skin: '#f2cd9c',
    gold: '#cf9420',
    back: ['#163359', '#d4aa48'],
  },
  siciliane: {
    id: 'siciliane',
    name: 'Siciliane',
    region: 'Sicilia',
    french: false,
    doubleHeaded: false,
    curvedSwords: true,
    h: 152,
    bg: '#fef9e8',
    coinBg: '#fae4a7',
    ink: '#2d180b',
    stroke: 1.4,
    frame: '#c47d21',
    suit: {
      DENARI: { main: '#e0980f', accent: '#b8381d' },
      COPPE: { main: '#b8381d', accent: '#e0980f' },
      SPADE: { main: '#1f6f82', accent: '#e0980f' },
      BASTONI: { main: '#417d26', accent: '#a15313' },
    },
    robe: ['#b8381d', '#1f6f82', '#e0980f'],
    skin: '#ebba8e',
    gold: '#e0980f',
    back: ['#b8381d', '#f3c755'],
  },
  bergamasche: {
    id: 'bergamasche',
    name: 'Bergamasche',
    region: 'Bergamo',
    french: false,
    doubleHeaded: true,
    curvedSwords: false,
    h: 160,
    bg: '#f6eee0',
    ink: '#110b07',
    stroke: 1.8,
    frame: '#583618',
    suit: {
      DENARI: { main: '#bf7e0c', accent: '#63180c' },
      COPPE: { main: '#8f1414', accent: '#bf7e0c' },
      SPADE: { main: '#183363', accent: '#8f1414' },
      BASTONI: { main: '#254e17', accent: '#5e310d' },
    },
    robe: ['#8f1414', '#183363', '#254e17'],
    skin: '#e4b081',
    gold: '#bf7e0c',
    back: ['#301709', '#c48b1d'],
  },
  trevisane: {
    id: 'trevisane',
    name: 'Trevisane',
    region: 'Treviso',
    french: false,
    doubleHeaded: true,
    curvedSwords: false,
    h: 175,
    bg: '#fdfaf2',
    ink: '#1e1a14',
    stroke: 1.3,
    frame: '#6b7e4e',
    suit: {
      DENARI: { main: '#c99624', accent: '#702418' },
      COPPE: { main: '#a82c20', accent: '#c99624' },
      SPADE: { main: '#2e5d7d', accent: '#a82c20' },
      BASTONI: { main: '#56762c', accent: '#6f3d17' },
    },
    robe: ['#2e5d7d', '#a82c20', '#56762c'],
    skin: '#eecca4',
    gold: '#c99624',
    back: ['#224736', '#d6aa38'],
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
    ink: '#161616',
    stroke: 1.2,
    frame: '#8a95a0',
    suit: {
      DENARI: { main: '#c21028', accent: '#c21028' },
      COPPE: { main: '#c21028', accent: '#c21028' },
      SPADE: { main: '#161616', accent: '#161616' },
      BASTONI: { main: '#161616', accent: '#161616' },
    },
    robe: ['#c21028', '#1a468f', '#dba830'],
    skin: '#f2ceaa',
    gold: '#dba830',
    back: ['#1a468f', '#e6edf5'],
  },
};

export const DECK_ORDER: DeckId[] = ['napoletane', 'piacentine', 'milanesi', 'siciliane', 'bergamasche', 'trevisane'];

// ------------------------------------------------------------------ suit symbols (unit box ±1)

function suitSymbol(suit: Suit, d: DeckSkin, x: number, y: number, s: number, rot = 0): string {
  const { main, accent } = d.suit[suit];
  const sw = Math.max(0.08, (d.stroke * 0.65) / s);
  const g = (body: string) =>
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" stroke="${d.ink}" stroke-width="${sw.toFixed(3)}" stroke-linejoin="round" stroke-linecap="round">${body}</g>`;

  if (d.french) {
    const f = `fill="${main}" stroke="none"`;
    switch (suit) {
      case 'DENARI':
        // French Diamond (Carreaux) with beveled shine
        return g(
          `<path ${f} d="M0 -1 L.74 0 L0 1 L-.74 0 Z"/>` +
          `<path d="M0 -1 L.74 0 L0 1 Z" fill="#ffffff" opacity=".18" stroke="none"/>`,
        );
      case 'COPPE':
        // French Heart (Cœurs) with soft specular curve
        return g(
          `<path ${f} d="M0 .95 C-1.25 0 -.95 -1.05 0 -.4 C.95 -1.05 1.25 0 0 .95 Z"/>` +
          `<path d="M0 -.4 C.6 -1 .9 -.15 0 .95 Z" fill="#ffffff" opacity=".18" stroke="none"/>`,
        );
      case 'SPADE':
        // French Spade (Piques) with beveled highlight
        return g(
          `<path ${f} d="M0 -1 C1.15 -.1 .82 .74 .1 .36 L.28 .98 H-.28 L-.1 .36 C-.82 .74 -1.15 -.1 0 -1 Z"/>` +
          `<path d="M0 -1 C.82 -.1 .6 .65 .08 .36 L.24 .98 H0 Z" fill="#ffffff" opacity=".22" stroke="none"/>`,
        );
      case 'BASTONI':
        // French Club (Trèfles)
        return g(
          `<g ${f}>` +
          `<circle cy="-.46" r=".42"/>` +
          `<circle cx="-.44" cy=".12" r=".42"/>` +
          `<circle cx=".44" cy=".12" r=".42"/>` +
          `<path d="M-.12 0 L-.28 .98 H.28 L.12 0 Z"/>` +
          `</g>`,
        );
    }
  }

  switch (suit) {
    case 'DENARI': {
      // Renaissance minted gold coin: milled outer bead rim, radiant star petals, inner ring, and polished boss
      let star = '';
      for (let i = 0; i < 4; i++) {
        star += `<polygon points="0,-.68 .11,-.22 0,-.15 -.11,-.22" fill="${main}" stroke="none" transform="rotate(${i * 90})"/>` +
                `<polygon points="0,-.56 .09,-.18 0,-.12 -.09,-.18" fill="${main}" opacity=".9" stroke="none" transform="rotate(${i * 90 + 45})"/>`;
      }
      return g(
        `<circle r="1" fill="${main}"/>` +
        `<circle r=".86" fill="none" stroke="${accent}" stroke-width="${(sw * 0.4).toFixed(3)}" stroke-dasharray=".09 .12"/>` +
        `<circle r=".74" fill="${accent}"/>` +
        star +
        `<circle r=".22" fill="${main}"/>` +
        `<circle r=".11" fill="${accent}"/>` +
        `<circle cx="-.06" cy="-.06" r=".04" fill="#ffffff" opacity=".75" stroke="none"/>`,
      );
    }
    case 'COPPE': {
      // Renaissance baroque chalice: scalloped goblet bowl, jeweled upper rim, fluted stem, knop, and tiered pedestal base
      return g(
        // Goblet bowl
        `<path d="M-.72 -.85 H.72 C.68 -.08 0 .15 0 .15 C0 .15 -.68 -.08 -.72 -.85 Z" fill="${main}"/>` +
        // Bowl inner gold highlight
        `<path d="M-.45 -.75 Q0 -.05 .45 -.75" fill="none" stroke="${accent}" stroke-width="${(sw * 0.6).toFixed(3)}"/>` +
        // Upper rim & jewels
        `<path d="M-.78 -.85 H.78 V-.98 H-.78 Z" fill="${accent}"/>` +
        `<circle cx="-.42" cy="-.91" r=".05" fill="#ffffff" stroke="none"/>` +
        `<circle cx="0" cy="-.91" r=".06" fill="#ffffff" stroke="none"/>` +
        `<circle cx=".42" cy="-.91" r=".05" fill="#ffffff" stroke="none"/>` +
        // Stem and central knop
        `<rect x="-.1" y=".14" width=".2" height=".48" fill="${accent}"/>` +
        `<circle cx="0" cy=".38" r=".18" fill="${main}"/>` +
        `<circle cx="0" cy=".38" r=".08" fill="${accent}"/>` +
        // Tiered pedestal foot
        `<path d="M-.58 .92 Q0 .62 .58 .92 H-.58 Z" fill="${main}"/>` +
        `<rect x="-.64" y=".9" width="1.28" height=".12" rx=".04" fill="${accent}"/>`,
      );
    }
    case 'SPADE': {
      if (d.curvedSwords) {
        // Curved Italian scimitar: swept dual-tone steel blade, S-quillons, leather-bound hilt, gold pommel
        return g(
          `<path d="M-.14 .45 Q-.46 -.3 .24 -1 Q.02 -.2 .12 .45 Z" fill="#eef3f8"/>` +
          `<path d="M-.02 .42 Q-.22 -.25 .18 -.95 Q.08 -.15 .08 .42 Z" fill="#bac8d6" stroke="none"/>` +
          `<path d="M-.46 .46 C-.36 .36 -.1 .42 0 .46 C.1 .5 .36 .56 .46 .44" fill="none" stroke="${accent}" stroke-width="${(sw * 1.5).toFixed(3)}"/>` +
          `<rect x="-.08" y=".46" width=".16" height=".36" rx=".04" fill="${main}"/>` +
          `<circle cx="0" cy=".94" r=".11" fill="${accent}"/>`,
        );
      }
      // Straight knightly broadsword: dual-beveled steel blade with fuller, crossguard, grip, pommel
      return g(
        `<path d="M-.14 .45 V-.72 L0 -1 V.45 Z" fill="#ffffff"/>` +
        `<path d="M0 -1 L.14 -.72 V.45 H0 Z" fill="#b0c0d0"/>` +
        `<line x1="0" y1="-.82" x2="0" y2=".36" stroke="${d.ink}" stroke-width="${(sw * 0.5).toFixed(3)}" opacity=".6"/>` +
        `<rect x="-.46" y=".44" width=".92" height=".12" rx=".04" fill="${accent}"/>` +
        `<rect x="-.08" y=".54" width=".16" height=".32" rx=".03" fill="${main}"/>` +
        `<circle cx="0" cy=".96" r=".11" fill="${accent}"/>`,
      );
    }
    case 'BASTONI': {
      // Ceremonial knobby baton / cudgel with gold ferrule collars and fresh laurel leaves
      return g(
        `<path d="M-.26 -.9 C-.14 -1.02 .14 -1.02 .26 -.9 L.16 .92 C0 1.02 -.14 .98 -.22 .92 Z" fill="${main}"/>` +
        `<rect x="-.3" y="-.92" width=".6" height=".12" rx=".04" fill="${accent}"/>` +
        `<rect x="-.26" y=".82" width=".52" height=".12" rx=".04" fill="${accent}"/>` +
        `<path d="M-.2 -.4 C-.5 -.52 -.38 -.12 -.18 -.26" fill="#3d822f"/>` +
        `<path d="M.16 .04 C.48 -.08 .38 .32 .16 .16" fill="#3d822f"/>` +
        `<path d="M-.16 .42 C-.44 .3 -.34 .7 -.12 .5" fill="#3d822f"/>` +
        `<circle cx="-.06" cy="-.34" r=".07" fill="${accent}"/>` +
        `<circle cx=".05" cy=".12" r=".07" fill="${accent}"/>` +
        `<circle cx="-.04" cy=".5" r=".07" fill="${accent}"/>`,
      );
    }
  }
}

// ------------------------------------------------------------------ pips & figures

function pipLayout(n: number, h: number): [number, number][] {
  const top = h * 0.25;
  const mid = h * 0.5;
  const bot = h * 0.75;
  const L = 30;
  const R = 70;
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

/** Renaissance Tarocco/Scopa figure drawing (Fante = 8, Cavallo = 9, Re = 10) */
function figure(card: Card, d: DeckSkin, h: number, bust: boolean): string {
  const [r1, r2, r3] = d.robe;
  const ink = d.ink;
  const sw = d.stroke;
  const headY = bust ? h * 0.35 : h * 0.23;
  const headR = bust ? 11 : 9.5;
  const hx = card.rank === 9 && !bust ? 58 : 50;

  // Elaborate headwear
  const hat = (() => {
    if (card.rank === 10) {
      // Majestic 5-pointed fleuron crown with jewels and velvet cap
      return (
        `<path d="M${hx - 13} ${headY - headR + 3} Q${hx} ${headY - headR - 10} ${hx + 13} ${headY - headR + 3} Z" fill="${r2}" stroke="${ink}" stroke-width="${sw * 0.6}"/>` +
        `<path d="M${hx - 14} ${headY - headR + 3} L${hx - 12} ${headY - headR - 11} L${hx - 6} ${headY - headR - 4} L${hx} ${headY - headR - 14} L${hx + 6} ${headY - headR - 4} L${hx + 12} ${headY - headR - 11} L${hx + 14} ${headY - headR + 3} Z" fill="${d.gold}" stroke="${ink}" stroke-width="${sw * 0.7}"/>` +
        `<circle cx="${hx - 12}" cy="${headY - headR - 11}" r="1.5" fill="#fff"/>` +
        `<circle cx="${hx}" cy="${headY - headR - 14}" r="1.8" fill="#d23c2d"/>` +
        `<circle cx="${hx + 12}" cy="${headY - headR - 11}" r="1.5" fill="#fff"/>` +
        `<rect x="${hx - 13}" y="${headY - headR + 2}" width="26" height="3" rx="1.5" fill="${r1}" stroke="${ink}" stroke-width="${sw * 0.5}"/>`
      );
    }
    if (card.rank === 9) {
      // Cavalier hat / crested helmet with flowing ostrich plume
      return (
        `<path d="M${hx - 13} ${headY - headR + 3} Q${hx} ${headY - headR - 14} ${hx + 14} ${headY - headR + 1} Z" fill="${r3}" stroke="${ink}" stroke-width="${sw * 0.7}"/>` +
        `<path d="M${hx - 12} ${headY - headR + 2} Q${hx + 8} ${headY - headR - 18} ${hx + 18} ${headY - headR - 6}" fill="none" stroke="${r1}" stroke-width="${sw * 2}" stroke-linecap="round"/>` +
        `<circle cx="${hx - 5}" cy="${headY - headR + 1}" r="2" fill="${d.gold}" stroke="${ink}" stroke-width="${sw * 0.5}"/>`
      );
    }
    // Fante: Renaissance slashed velvet beret tilted with sweeping feather
    return (
      `<ellipse cx="${hx - 3}" cy="${headY - headR + 2}" rx="14" ry="5.5" fill="${r2}" stroke="${ink}" stroke-width="${sw * 0.7}"/>` +
      `<path d="M${hx + 6} ${headY - headR} Q${hx + 16} ${headY - headR - 12} ${hx + 20} ${headY - headR - 2}" fill="none" stroke="${r1}" stroke-width="${sw * 1.8}" stroke-linecap="round"/>` +
      `<circle cx="${hx + 5}" cy="${headY - headR + 1}" r="2.2" fill="${d.gold}" stroke="${ink}" stroke-width="${sw * 0.5}"/>`
    );
  })();

  // Wavy Renaissance hair
  const hair = (() => {
    if (card.rank === 10) {
      // King's trimmed beard and noble side curls
      return (
        `<path d="M${hx - 10} ${headY} Q${hx - 13} ${headY + 8} ${hx - 8} ${headY + 13}" fill="none" stroke="${ink}" stroke-width="${sw * 1.2}"/>` +
        `<path d="M${hx + 10} ${headY} Q${hx + 13} ${headY + 8} ${hx + 8} ${headY + 13}" fill="none" stroke="${ink}" stroke-width="${sw * 1.2}"/>` +
        `<path d="M${hx - 7} ${headY + 4} Q${hx} ${headY + 16} ${hx + 7} ${headY + 4} Q${hx} ${headY + 7} ${hx - 7} ${headY + 4} Z" fill="#7a4b22" stroke="${ink}" stroke-width="${sw * 0.6}"/>`
      );
    }
    if (card.rank === 9) {
      return (
        `<path d="M${hx - 10} ${headY} Q${hx - 13} ${headY + 8} ${hx - 6} ${headY + 12}" fill="none" stroke="${ink}" stroke-width="${sw * 1.2}"/>` +
        `<path d="M${hx + 9} ${headY} Q${hx + 12} ${headY + 8} ${hx + 6} ${headY + 12}" fill="none" stroke="${ink}" stroke-width="${sw * 1.2}"/>`
      );
    }
    // Fante's youthful flowing shoulder curls
    return (
      `<path d="M${hx - 10} ${headY - 2} Q${hx - 14} ${headY + 6} ${hx - 9} ${headY + 14}" fill="none" stroke="${ink}" stroke-width="${sw * 1.4}" stroke-linecap="round"/>` +
      `<path d="M${hx + 10} ${headY - 2} Q${hx + 14} ${headY + 6} ${hx + 9} ${headY + 14}" fill="none" stroke="${ink}" stroke-width="${sw * 1.4}" stroke-linecap="round"/>`
    );
  })();

  // Detailed noble facial features
  const face =
    // Head shape
    `<circle cx="${hx}" cy="${headY}" r="${headR}" fill="${d.skin}" stroke="${ink}" stroke-width="${sw * 0.7}"/>` +
    // Almond eyes with pupils and brows
    `<path d="M${hx - 6} ${headY - 1} Q${hx - 3.5} ${headY - 3} ${hx - 1} ${headY - 1}" fill="none" stroke="${ink}" stroke-width="${sw * 0.6}"/>` +
    `<circle cx="${hx - 3.5}" cy="${headY - 0.5}" r="1" fill="${ink}"/>` +
    `<path d="M${hx + 1} ${headY - 1} Q${hx + 3.5} ${headY - 3} ${hx + 6} ${headY - 1}" fill="none" stroke="${ink}" stroke-width="${sw * 0.6}"/>` +
    `<circle cx="${hx + 3.5}" cy="${headY - 0.5}" r="1" fill="${ink}"/>` +
    // Classical nose
    `<path d="M${hx} ${headY - 1} L${hx + 1} ${headY + 3.5} L${hx - 1} ${headY + 3.5}" fill="none" stroke="${ink}" stroke-width="${sw * 0.5}"/>` +
    // Noble mouth
    `<path d="M${hx - 3} ${headY + 6} Q${hx} ${headY + 7.5} ${hx + 3} ${headY + 6}" fill="none" stroke="${ink}" stroke-width="${sw * 0.6}"/>` +
    hair +
    hat;

  if (bust) {
    const shoulderY = headY + headR + 3;
    const body =
      // Doublet and mantle
      `<path d="M12 ${h} Q15 ${shoulderY} 50 ${shoulderY} Q85 ${shoulderY} 88 ${h} Z" fill="${r1}" stroke="${ink}" stroke-width="${sw}"/>` +
      `<path d="M34 ${shoulderY + 1} L50 ${h - 2} L66 ${shoulderY + 1}" fill="${r2}" stroke="${ink}" stroke-width="${sw * 0.6}"/>` +
      // Golden chain of knighthood
      `<path d="M28 ${shoulderY + 6} Q50 ${shoulderY + 22} 72 ${shoulderY + 6}" fill="none" stroke="${d.gold}" stroke-width="${sw * 1.4}" stroke-dasharray="2.5 3"/>` +
      `<circle cx="50" cy="${shoulderY + 20}" r="3.2" fill="${d.gold}" stroke="${ink}" stroke-width="${sw * 0.6}"/>` +
      // Center dividing filigree ribbon
      `<rect x="12" y="${h - 6}" width="76" height="6" fill="${d.gold}" stroke="${ink}" stroke-width="${sw * 0.7}"/>` +
      `<circle cx="50" cy="${h - 3}" r="2" fill="${r1}"/>`;
    return body + face + suitSymbol(card.suit, d, 76, shoulderY + 14, 8.5);
  }

  if (card.rank === 9) {
    // Knight on caparisoned charger (Cavallo)
    const by = h * 0.68;
    const horse =
      `<g stroke="${ink}" stroke-width="${sw}" fill="#f4f1e8">` +
      // Legs
      `<path d="M22 ${by + 10} L18 ${by + 36} M34 ${by + 12} L36 ${by + 36} M64 ${by + 12} L62 ${by + 36} M76 ${by + 10} L80 ${by + 36}" fill="none" stroke-width="${sw * 1.1}"/>` +
      // Torso
      `<ellipse cx="50" cy="${by}" rx="31" ry="16"/>` +
      // Arched neck & noble head
      `<path d="M22 ${by - 4} Q12 ${by - 32} 20 ${by - 40} L32 ${by - 36} Q28 ${by - 22} 36 ${by - 10} Z"/>` +
      `<circle cx="21" cy="${by - 34}" r="1.3" fill="${ink}"/>` +
      // Flowing tail
      `<path d="M79 ${by - 4} Q94 0 86 ${by + 28}" fill="none" stroke-width="${sw * 1.4}"/>` +
      `</g>` +
      // Embroidered saddle blanket / barding
      `<path d="M24 ${by - 6} Q50 ${by + 5} 76 ${by - 6} L72 ${by + 12} Q50 ${by + 20} 28 ${by + 12} Z" fill="${r2}" stroke="${ink}" stroke-width="${sw * 0.7}"/>` +
      `<path d="M28 ${by + 10} H72" stroke="${d.gold}" stroke-width="${sw * 1.2}"/>`;

    const rider =
      // Torso & armor
      `<path d="M${hx - 10} ${headY + headR} L${hx + 10} ${headY + headR} L${hx + 12} ${by - 6} L${hx - 12} ${by - 6} Z" fill="${r1}" stroke="${ink}" stroke-width="${sw}"/>` +
      `<path d="M${hx - 6} ${by - 8} L${hx - 4} ${by + 14}" stroke="${d.gold}" stroke-width="${sw * 2.2}"/>`;
    return horse + rider + face + suitSymbol(card.suit, d, 82, headY + 16, 8.5);
  }

  // Single-headed Fante or Re standing
  const bodyTop = headY + headR;
  const isKing = card.rank === 10;
  const wide = isKing ? 32 : 24;
  const robe =
    // Royal tunic / robe
    `<path d="M${50 - 13} ${bodyTop} H${50 + 13} L${50 + wide} ${h * 0.85} H${50 - wide} Z" fill="${r1}" stroke="${ink}" stroke-width="${sw}"/>` +
    // Golden embroidered center hem
    `<path d="M50 ${bodyTop} V${h * 0.85}" stroke="${d.gold}" stroke-width="${sw * 2.4}"/>` +
    `<path d="M${50 - 16} ${h * 0.52} H${50 + 16}" stroke="${r2}" stroke-width="${sw * 2.2}"/>`;

  const cape = isKing
    ? // King's ermine mantle draped over shoulders
      `<path d="M${50 - 15} ${bodyTop + 2} Q${50 - 44} ${h * 0.6} ${50 - 34} ${h * 0.85} H${50 - 24} Z" fill="${r2}" stroke="${ink}" stroke-width="${sw * 0.8}"/>` +
      `<path d="M${50 + 15} ${bodyTop + 2} Q${50 + 44} ${h * 0.6} ${50 + 34} ${h * 0.85} H${50 + 24} Z" fill="${r2}" stroke="${ink}" stroke-width="${sw * 0.8}"/>` +
      `<circle cx="28" cy="${h * 0.6}" r="1.5" fill="#fff"/><circle cx="72" cy="${h * 0.6}" r="1.5" fill="#fff"/>`
    : '';

  // Legs & royal scepter
  const legs = `<path d="M42 ${h * 0.85} V${h * 0.94} M58 ${h * 0.85} V${h * 0.94}" stroke="${ink}" stroke-width="${sw * 2}"/>`;
  const scepter = isKing
    ? `<line x1="26" y1="${h * 0.38}" x2="22" y2="${h * 0.78}" stroke="${d.gold}" stroke-width="${sw * 2.2}" stroke-linecap="round"/>` +
      `<circle cx="26" cy="${h * 0.38}" r="3.2" fill="${d.gold}" stroke="${ink}" stroke-width="${sw * 0.6}"/>`
    : '';

  return cape + robe + legs + scepter + face + suitSymbol(card.suit, d, 75, h * 0.46, 9.5);
}

function mask(x: number, y: number, d: DeckSkin): string {
  // Neapolitan Mascherone caricature mask (3 of Bastoni & 5 of Spade)
  return (
    `<g transform="translate(${x} ${y})" stroke="${d.ink}" stroke-width="1.1" stroke-linejoin="round">` +
    `<ellipse rx="9.5" ry="10.5" fill="#f0c698"/>` +
    `<circle cx="-3.5" cy="-2" r="2.2" fill="#ffffff"/>` +
    `<circle cx="3.5" cy="-2" r="2.2" fill="#ffffff"/>` +
    `<circle cx="-3.5" cy="-2" r=".95" fill="${d.ink}"/>` +
    `<circle cx="3.5" cy="-2" r=".95" fill="${d.ink}"/>` +
    `<path d="M-6 4 Q0 1 6 4" fill="none" stroke="#802816" stroke-width="2.2" stroke-linecap="round"/>` +
    `<path d="M0 -1 L-1.5 3.5 H1.5 Z" fill="#d27c5a"/>` +
    `<path d="M-9 -6 Q0 -16 9 -6" fill="none" stroke="#802816" stroke-width="2.2"/>` +
    `</g>`
  );
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

  // Card paper base with rounded corners and double hairline frame with corner filigree
  parts.push(`<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="8" fill="${bg}" stroke="${d.frame}" stroke-width="1.8"/>`);
  parts.push(`<rect x="5.5" y="5.5" width="${W - 11}" height="${H - 11}" rx="5" fill="none" stroke="${d.frame}" stroke-width="0.75" opacity=".7"/>`);

  // Corner ornamental filigree florets
  const cornerFlourish = (cx: number, cy: number, rot: number) =>
    `<g transform="translate(${cx} ${cy}) rotate(${rot})" stroke="${d.frame}" stroke-width="0.7" fill="none" opacity=".65">` +
    `<path d="M0 8 C0 3 3 0 8 0"/>` +
    `<circle cx="5" cy="5" r="1" fill="${d.frame}"/>` +
    `</g>`;
  parts.push(
    cornerFlourish(6, 6, 0),
    cornerFlourish(W - 6, 6, 90),
    cornerFlourish(W - 6, H - 6, 180),
    cornerFlourish(6, H - 6, 270),
  );

  if (c.rank <= 7) {
    const isAce = c.rank === 1;

    // Grand Ace of Denari / Ace of Suits
    if (isAce && c.suit === 'DENARI') {
      // Grand Sun / Imperial Medallion for Ace of Coins
      parts.push(
        `<circle cx="50" cy="${H / 2}" r="35" fill="none" stroke="${d.gold}" stroke-width="1.2" stroke-dasharray="3 3" opacity=".8"/>` +
        `<circle cx="50" cy="${H / 2}" r="38" fill="none" stroke="${d.frame}" stroke-width="0.6" opacity=".5"/>`,
      );
      parts.push(suitSymbol(c.suit, d, 50, H / 2, 28));
    } else if (isAce) {
      parts.push(`<circle cx="50" cy="${H / 2}" r="34" fill="none" stroke="${d.suit[c.suit].main}" stroke-width="1" stroke-dasharray="2 3" opacity=".5"/>`);
      parts.push(suitSymbol(c.suit, d, 50, H / 2, 24));
    } else {
      const s = c.rank >= 6 ? 10.5 : 12;
      for (const [x, y] of pipLayout(c.rank, H)) {
        // For Settebello (7 of Denari), enlarge and decorate center coin
        if (isSettebello(c) && x === 50 && y === (H * 0.25 + H * 0.5) / 2 - 3) {
          parts.push(
            `<circle cx="${x}" cy="${y}" r="17" fill="none" stroke="${d.gold}" stroke-width="1.2" stroke-dasharray="2 2" opacity=".9"/>`,
          );
          parts.push(suitSymbol(c.suit, d, x, y, 14.5));
        } else {
          parts.push(suitSymbol(c.suit, d, x, y, s));
        }
      }
    }

    // Regional grotesque masks
    if (d.masks && ((c.suit === 'BASTONI' && c.rank === 3) || (c.suit === 'SPADE' && c.rank === 5))) {
      parts.push(mask(c.rank === 3 ? 74 : 50, c.rank === 3 ? H / 2 : H * 0.38, d));
    }

    // Regional mottoes on Aces
    if (isAce && d.mottoes) {
      parts.push(
        `<text x="50" y="${H - 14}" text-anchor="middle" font-family="'Cinzel', Georgia, serif" font-style="italic" font-weight="600" font-size="5.5" fill="${d.ink}" letter-spacing="0.2">${esc(d.mottoes[c.suit])}</text>`,
      );
    }
  } else {
    // Face figures (8, 9, 10)
    const clip = `fc${uid++}`;
    if (d.doubleHeaded) {
      const half = H / 2;
      const top = figure(c, d, half, true);
      parts.push(`<clipPath id="${clip}"><rect x="7" y="7" width="${W - 14}" height="${half - 7}" rx="3"/></clipPath>`);
      parts.push(`<g clip-path="url(#${clip})">${top}</g>`);
      parts.push(`<g transform="rotate(180 50 ${half})"><g clip-path="url(#${clip})">${top}</g></g>`);
      parts.push(`<line x1="7" y1="${half}" x2="${W - 7}" y2="${half}" stroke="${d.frame}" stroke-width="${d.stroke}"/>`);
    } else {
      parts.push(`<clipPath id="${clip}"><rect x="7" y="7" width="${W - 14}" height="${H - 24}" rx="3"/></clipPath>`);
      parts.push(`<g clip-path="url(#${clip})">${figure(c, d, H - 18, false)}</g>`);
      parts.push(
        `<text x="50" y="${H - 8}" text-anchor="middle" font-family="'Cinzel', Georgia, serif" font-weight="700" font-size="8.5" letter-spacing="1.5" fill="${d.ink}">${FACE_NAMES[c.rank][d.french ? 1 : 0]}</text>`,
      );
    }
  }

  // Refined luxury index corner badges (High-readability for mobile)
  if (showNumbers) {
    const badge = (x: number, y: number, rot: number) => {
      const rankStr = c.rank === 1 ? '1' : c.rank === 8 ? '8' : c.rank === 9 ? '9' : c.rank === 10 ? '10' : String(c.rank);
      return (
        `<g transform="rotate(${rot} ${x + 10} ${y + 13})">` +
        `<rect x="${x}" y="${y}" width="20" height="26" rx="5" fill="#181512" stroke="${d.gold}" stroke-width="0.9" opacity=".94"/>` +
        `<text x="${x + 10}" y="${y + 14}" text-anchor="middle" font-family="'Cinzel', Georgia, serif" font-weight="800" font-size="12" fill="#ffffff">${rankStr}</text>` +
        suitSymbol(c.suit, d, x + 10, y + 20, 3) +
        `</g>`
      );
    };
    parts.push(badge(3, 3, 0), badge(W - 23, H - 29, 180));
  }

  // Settebello radiant glint star
  if (isSettebello(c)) {
    parts.push(
      `<g class="sb-star">` +
      `<circle cx="${W - 14}" cy="14" r="10" fill="#fffbe8" stroke="#c99a18" stroke-width="1.3"/>` +
      `<path transform="translate(${W - 14} 14) scale(6.5)" d="M0 -1 L.24 -.35 .92 -.31 .42 .15 .55 .82 0 .48 -.55 .82 -.42 .15 -.92 -.31 -.24 -.35 Z" fill="#e5aa00"/>` +
      `</g>`,
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
  const W = 100;
  const H = d.h;

  const svg =
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    `<defs>` +
    // Ornate diamond damask lattice pattern
    `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
    `<rect width="14" height="14" fill="${a}"/>` +
    `<rect x="0" y="0" width="14" height="2" fill="${b}" opacity=".28"/>` +
    `<rect x="0" y="0" width="2" height="14" fill="${b}" opacity=".28"/>` +
    `<polygon points="7,2 12,7 7,12 2,7" fill="${b}" opacity=".35"/>` +
    `<circle cx="7" cy="7" r="1.4" fill="${a}"/>` +
    `</pattern>` +
    `</defs>` +
    // Crisp white outer card stock border
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="8" fill="#ffffff" stroke="${b}" stroke-width="1.5"/>` +
    // Inner patterned field
    `<rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="5" fill="url(#${id})" stroke="${b}" stroke-width="1.5"/>` +
    // Inner gold hairline frame
    `<rect x="9" y="9" width="${W - 18}" height="${H - 18}" rx="4" fill="none" stroke="${b}" stroke-width="0.8" opacity=".7"/>` +
    // Central heraldic gold medallion
    `<circle cx="${W / 2}" cy="${H / 2}" r="19" fill="${a}" stroke="${b}" stroke-width="2.2"/>` +
    `<circle cx="${W / 2}" cy="${H / 2}" r="16" fill="none" stroke="${b}" stroke-width="0.8" stroke-dasharray="2 2" opacity=".8"/>` +
    `<text x="${W / 2}" y="${H / 2 + 7.5}" text-anchor="middle" font-family="'Cinzel', Georgia, serif" font-weight="900" font-size="21" fill="${b}" letter-spacing="1">S</text>` +
    `</svg>`;

  cache.set(key, svg);
  return svg;
}

export const deckAspect = (deckId: DeckId): string => `100 / ${DECKS[deckId].h}`;
