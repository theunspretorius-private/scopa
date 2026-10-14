import { cardSVG, backSVG } from './decks';
import { h } from './dom';
import { settings } from './settings';
import { cardById } from '../engine/cards';

const SUIT_NAMES = { DENARI: 'Denari', COPPE: 'Coppe', SPADE: 'Spade', BASTONI: 'Bastoni' } as const;

export function cardLabel(id: string): string {
  const c = cardById(id);
  return `${c.rank} ${SUIT_NAMES[c.suit]}`;
}

export function cardEl(id: string, extraClass = ''): HTMLElement {
  const el = h('div', {
    class: `card ${extraClass}${id === 'DENARI_7' ? ' settebello' : ''}`,
    'data-id': id,
    'aria-label': cardLabel(id),
    html: cardSVG(id, settings.deck, settings.showNumbers),
  });
  return el;
}

export function backEl(extraClass = ''): HTMLElement {
  return h('div', { class: `card back ${extraClass}`, 'aria-hidden': 'true', html: backSVG(settings.deck) });
}
