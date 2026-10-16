import { cardById } from '../../engine/cards';
import type { Seat } from '../../engine/round';
import { captureOptions, type Move } from '../../engine/rules';
import { primiera } from '../../engine/scoring';
import { EMOTES, type EmoteId, type GameView } from '../../net/protocol';
import { currentTrack, musicIcon, sfx, skipTrack, toggleMusic } from '../audio';
import { backEl, cardEl } from '../cardEl';
import type { ConnStatus, GameController } from '../controllers/types';
import { DECKS } from '../decks';
import { h, sleep, toast } from '../dom';
import { t } from '../i18n';
import { haptic } from '../native';
import { recordResult, settings } from '../settings';

const SETTEBELLO = 'DENARI_7';

export interface GameNav {
  home(): void;
  rules(): void;
}

interface Selection {
  cardId: string;
  options: string[][];
  chosen: string[];
}

interface Frame {
  table: string[];
  hand: string[];
  oppHand: number;
  captured: [number, number];
  scope: [number, number];
  scopaCards: [string[], string[]];
  deck: number;
  turn: Seat;
}

const frameOf = (v: GameView): Frame => ({
  table: v.table,
  hand: v.hand,
  oppHand: v.oppHandCount,
  captured: v.capturedCount,
  scope: v.scope,
  scopaCards: v.scopaCards,
  deck: v.deckCount,
  turn: v.turn,
});

const other = (s: Seat): Seat => (s === 0 ? 1 : 0);

export function gameScreen(root: HTMLElement, ctrl: GameController, nav: GameNav): () => void {
  // ---------------------------------------------------------------- skeleton
  const oppName = h('span', { class: 'p-name' });
  const oppScore = h('span', { class: 'p-score' });
  const oppHand = h('div', { class: 'opp-hand' });
  const oppPile = h('div', { class: 'pile opp' });
  const oppTimer = h('div', { class: 'timer' });
  const oppBubble = h('div', { class: 'bubble opp', 'aria-live': 'polite' });
  const menuBtn = h('button', { class: 'icon-btn', 'aria-label': 'Menu', onclick: () => openMenu() }, '☰');
  const oppBar = h(
    'header',
    { class: 'bar opp-bar' },
    menuBtn,
    h('div', { class: 'p-info' }, h('div', { class: 'p-line' }, oppName, oppScore), oppHand),
    oppPile,
    oppTimer,
    oppBubble,
  );

  const deckEl = h('div', { class: 'deck-stack' });
  const tableEl = h('div', { class: 'table-grid', role: 'list' });
  const banner = h('div', { class: 'banner', 'aria-live': 'assertive' });
  const status = h('div', { class: 'turn-status', 'aria-live': 'polite' });
  const felt = h('main', { class: 'felt' }, deckEl, tableEl, banner, status);

  const actionText = h('span', null);
  const actionBar = h(
    'div',
    { class: 'action-bar' },
    actionText,
    h('button', { class: 'btn small ghost', onclick: () => cancelSelection() }, t('cancel')),
  );

  const handEl = h('section', { class: 'hand', 'aria-label': t('you') });

  const meName = h('span', { class: 'p-name' });
  const meScore = h('span', { class: 'p-score' });
  const mePile = h('button', { class: 'pile me', onclick: () => openInspector() });
  const meTimer = h('div', { class: 'timer' });
  const meBubble = h('div', { class: 'bubble me', 'aria-live': 'polite' });
  const skipMusicBtn = h(
    'button',
    {
      class: 'icon-btn music-skip-btn game-skip-btn',
      'aria-label': t('nextTrack'),
      title: t('nextTrack'),
      onclick: () => {
        const trk = skipTrack();
        sfx.tick();
        toast(`🎵 ${trk.title}`);
      },
    },
    '⏭',
  );
  const emoteBtn = h('button', { class: 'icon-btn', 'aria-label': 'Emotes', onclick: () => openEmotes() }, '💬');
  const meBar = h('footer', { class: 'bar me-bar' }, h('div', { class: 'p-line' }, meName, meScore), mePile, skipMusicBtn, emoteBtn, meTimer, meBubble);

  const connEl = h('div', { class: 'conn hidden' });
  const overlay = h('div', { class: 'overlay hidden' });

  const screen = h('div', { class: 'screen game' }, oppBar, felt, actionBar, handEl, meBar, connEl, overlay);
  root.replaceChildren(screen);

  // ---------------------------------------------------------------- state
  let shown: GameView | null = null;
  let frame: Frame | null = null;
  const queue: GameView[] = [];
  let busy = false;
  let awaiting = false;
  let sel: Selection | null = null;
  let overlayKind: string | null = null;
  let recorded = false;
  let disposed = false;
  let clockOffset = 0;
  let prevTableIds = new Set<string>();
  let prevHandIds = new Set<string>();
  let prevOppCount = 0;
  let tickTimer: number | null = null;

  // ---------------------------------------------------------------- rendering

  function renderBars(v: GameView, f: Frame) {
    const me = v.you;
    const op = other(me);
    oppName.textContent = v.names[op] + (v.afk[op] ? ` · ${t('afk')}` : '') + (v.connected[op] ? '' : ' ⚠︎');
    meName.textContent = v.names[me] || t('you');
    oppScore.textContent = `${v.scores[op]}`;
    meScore.textContent = `${v.scores[me]} / ${v.target}`;
    oppScore.title = meScore.title = t('targetScore');

    const backs: HTMLElement[] = [];
    for (let i = 0; i < f.oppHand; i++) backs.push(backEl(i >= prevOppCount ? 'mini deal-in' : 'mini'));
    oppHand.replaceChildren(...backs);
    prevOppCount = f.oppHand;

    renderPile(oppPile, f.captured[op], f.scopaCards[op]);
    renderPile(mePile, f.captured[me], f.scopaCards[me]);
    mePile.disabled = !v.inspector;

    deckEl.replaceChildren(f.deck > 0 ? backEl('stack') : h('div', { class: 'card ghost' }), h('span', { class: 'count' }, String(f.deck)));
    deckEl.title = t('deck');

    oppBar.classList.toggle('active', v.status === 'IN_PROGRESS' && f.turn === op);
    meBar.classList.toggle('active', v.status === 'IN_PROGRESS' && f.turn === me);
  }

  function renderPile(el: HTMLElement, count: number, scopaCards: string[]) {
    const kids: HTMLElement[] = [];
    kids.push(count > 0 ? backEl('mini pile-back') : h('div', { class: 'card mini ghost' }));
    scopaCards.slice(-3).forEach((id, i) => {
      const c = cardEl(id, 'mini scopa-mark');
      c.style.setProperty('--i', String(i));
      kids.push(c);
    });
    kids.push(h('span', { class: 'count' }, `${count}`));
    if (scopaCards.length) kids.push(h('span', { class: 'scopa-count', title: t('scope') }, `🧹${scopaCards.length}`));
    el.replaceChildren(...kids);
    el.setAttribute('aria-label', `${t('pile')}: ${count} ${t('cards')}, ${t('scope')}: ${scopaCards.length}`);
  }

  function renderTable(ids: string[], opts: { taken?: Set<string>; incoming?: string; from?: 'me' | 'opp' } = {}) {
    const glow = new Set<string>();
    const chosen = new Set(sel?.chosen ?? []);
    if (sel) for (const o of remainingOptions(sel)) o.forEach((id) => glow.add(id));
    const cards = ids.map((id, i) => {
      const cls: string[] = ['on-table'];
      if (opts.taken?.has(id)) cls.push('taken');
      if (opts.incoming === id) cls.push('incoming', `from-${opts.from}`);
      else if (!prevTableIds.has(id) && !opts.incoming) cls.push('deal-in');
      if (sel) cls.push(chosen.has(id) ? 'chosen' : glow.has(id) ? 'glow' : 'dim');
      const el = cardEl(id, cls.join(' '));
      el.style.setProperty('--d', `${i * 70}ms`);
      el.setAttribute('role', 'listitem');
      el.addEventListener('click', () => onTableTap(id));
      return el;
    });
    tableEl.replaceChildren(...cards);
    tableEl.dataset.count = String(ids.length);
    prevTableIds = new Set(ids);
  }

  function renderHand(ids: string[], v: GameView) {
    const n = ids.length;
    const mine = canAct(v);
    const cards = ids.map((id, i) => {
      const off = i - (n - 1) / 2;
      const cls = ['in-hand'];
      if (!prevHandIds.has(id)) cls.push('deal-in');
      if (sel?.cardId === id) cls.push('selected');
      if (mine) cls.push('playable');
      const el = cardEl(id, cls.join(' '));
      el.style.setProperty('--rot', `${off * 7}deg`);
      el.style.setProperty('--lift', `${Math.abs(off) * 8}px`);
      el.style.setProperty('--d', `${i * 90}ms`);
      el.tabIndex = mine ? 0 : -1;
      el.setAttribute('role', 'button');
      attachDrag(el, id);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onHandTap(id);
        }
      });
      return el;
    });
    handEl.replaceChildren(...cards);
    if (ids.some((id) => !prevHandIds.has(id)) && ids.length) sfx.deal();
    prevHandIds = new Set(ids);
  }

  function renderStatus(v: GameView) {
    let s = '';
    if (v.status === 'IN_PROGRESS') s = v.turn === v.you ? t('yourTurn') : t('theirTurn', { name: v.names[other(v.you)] });
    status.textContent = s;
    status.classList.toggle('mine', v.status === 'IN_PROGRESS' && v.turn === v.you);
    actionBar.classList.toggle('show', !!sel);
    actionText.textContent = t('chooseCapture');
  }

  function renderTimers(v: GameView) {
    for (const el of [oppTimer, meTimer]) {
      el.replaceChildren();
      el.classList.remove('run');
    }
    if (!v.turnDeadline || v.status !== 'IN_PROGRESS' || v.pausedUntil) return;
    const el = v.turn === v.you ? meTimer : oppTimer;
    const remaining = v.turnDeadline - v.serverNow - (Date.now() - receivedAt);
    const total = v.turnSeconds * 1000;
    const fill = h('i');
    fill.style.setProperty('--from', String(Math.max(0, Math.min(1, remaining / total))));
    fill.style.animationDuration = `${Math.max(0, remaining)}ms`;
    el.append(fill);
    el.classList.add('run');
  }

  function renderFull(v: GameView, f: Frame = frameOf(v), tableOpts?: Parameters<typeof renderTable>[1]) {
    frame = f;
    renderBars(v, f);
    renderTable(f.table, tableOpts);
    renderHand(f.hand, v);
    renderStatus(v);
    renderTimers(v);
    renderPause(v);
  }

  // ---------------------------------------------------------------- transitions

  let receivedAt = Date.now();

  async function transition(prev: GameView | null, v: GameView) {
    const lp = v.lastPlay;
    const isNewPlay = lp && prev && prev.status === 'IN_PROGRESS' && lp.seq !== prev.lastPlay?.seq;
    if (!isNewPlay || !frame) {
      if (prev && v.roundNumber !== prev.roundNumber) {
        prevTableIds = new Set();
        prevHandIds = new Set();
        prevOppCount = 0;
        showBanner(t('newRound', { n: v.roundNumber, name: v.names[v.dealer] }), 'info', 1600);
      }
      renderFull(v);
      return;
    }

    const mine = lp.seat === v.you;
    const from = mine ? 'me' : 'opp';
    const before = frame;
    const tableWithCard = [...before.table, lp.card];
    const stage: Frame = {
      ...before,
      table: tableWithCard,
      hand: mine ? before.hand.filter((id) => id !== lp.card) : before.hand,
      oppHand: mine ? before.oppHand : Math.max(0, before.oppHand - 1),
    };
    if (lp.timedOut && mine) toast(t('timedOut'));

    // 1. The card lands on the felt; captured cards light up.
    sel = null;
    renderBars(v, stage);
    renderHand(stage.hand, v);
    renderTable(stage.table, { taken: new Set(lp.captured), incoming: lp.card, from });
    sfx.slide();
    haptic('light');
    await sleep(lp.captured.length ? 620 : 380);

    // 2. Capture: everything slides into the capturer's pile.
    let after = tableWithCard;
    if (lp.captured.length) {
      if ([lp.card, ...lp.captured].includes(SETTEBELLO)) await celebrateSettebello(mine, v.names[lp.seat]);
      const sweepCls = mine ? 'sweep-me' : 'sweep-opp';
      for (const id of [lp.card, ...lp.captured]) tableEl.querySelector(`[data-id="${id}"]`)?.classList.add(sweepCls);
      sfx.snap();
      haptic('medium');
      if (lp.scopa) {
        sfx.broom();
        haptic('heavy');
        showBanner(t('scopa'), 'scopa', 1500);
        await sleep(500);
        sfx.fanfare();
      }
      await sleep(lp.scopa ? 900 : 420);
      const taken = new Set([lp.card, ...lp.captured]);
      after = tableWithCard.filter((id) => !taken.has(id));
    }

    // 3. End of round: leftovers go to the last capturer.
    if (lp.leftover.length && lp.leftoverTo !== null) {
      renderTable(after, { taken: new Set(lp.leftover) });
      showBanner(t('lastTake'), 'info', 1300);
      await sleep(700);
      if (lp.leftover.includes(SETTEBELLO)) {
        await celebrateSettebello(lp.leftoverTo === v.you, v.names[lp.leftoverTo]);
      }
      const cls = lp.leftoverTo === v.you ? 'sweep-me' : 'sweep-opp';
      tableEl.querySelectorAll('.card').forEach((el) => el.classList.add(cls));
      sfx.snap();
      await sleep(600);
      after = [];
    }

    prevTableIds = new Set(after);
    renderFull(v);
  }

  /** The 7 of Coins is worth a point on its own: stop the show and make a proper fuss. */
  async function celebrateSettebello(mine: boolean, name: string) {
    tableEl.querySelector(`[data-id="${SETTEBELLO}"]`)?.classList.add('sb-taken');
    const coins = Array.from({ length: 18 }, (_, i) =>
      h('span', {
        class: 'sb-coin',
        style: `--a:${(i * 360) / 18 + Math.random() * 12}deg;--d:${110 + Math.random() * 90}px;--s:${0.6 + Math.random() * 0.6};--t:${Math.random() * 0.25}s`,
      }),
    );
    const overlay = h(
      'div',
      { class: `sb-moment ${mine ? 'mine' : 'theirs'}`, role: 'status', 'aria-live': 'assertive' },
      h('div', { class: 'sb-rays' }),
      ...coins,
      h('div', { class: 'sb-card' }, cardEl(SETTEBELLO)),
      h('div', { class: 'sb-title' }, t('settebello') + '!'),
      h('div', { class: 'sb-sub' }, mine ? t('settebelloYours') : t('settebelloTheirs', { name })),
    );
    felt.append(overlay);
    sfx.settebello(mine);
    haptic('heavy');
    window.setTimeout(() => haptic('heavy'), 220);
    await sleep(1900);
    overlay.classList.add('out');
    await sleep(320);
    overlay.remove();
  }

  function showBanner(text: string, kind: 'scopa' | 'info', ms: number) {
    banner.textContent = text;
    banner.className = `banner show ${kind}`;
    window.setTimeout(() => {
      if (banner.textContent === text) banner.className = 'banner';
    }, ms);
  }

  async function pump() {
    if (busy) return;
    busy = true;
    while (queue.length && !disposed) {
      const v = queue.shift()!;
      receivedAt = Date.now();
      clockOffset = v.serverNow - receivedAt;
      const prev = shown;
      shown = v;
      awaiting = false;
      await transition(prev, v);
      afterRender(prev, v);
    }
    busy = false;
    if (shown) renderHand(shown.hand, shown); // re-enable input now that animations are done
  }

  function afterRender(prev: GameView | null, v: GameView) {
    if (v.status === 'ROUND_END') openRoundEnd(v);
    else if (v.status === 'MATCH_OVER') openMatchOver(v, prev);
    else if (overlayKind === 'round' || overlayKind === 'match') closeOverlay();
  }

  // ---------------------------------------------------------------- input

  function canAct(v: GameView | null = shown): boolean {
    return !!v && !busy && !awaiting && v.status === 'IN_PROGRESS' && v.turn === v.you && !v.pausedUntil && !overlayKind;
  }

  const remainingOptions = (s: Selection) => s.options.filter((o) => s.chosen.every((c) => o.includes(c)));

  function commit(move: Move) {
    sel = null;
    awaiting = true;
    actionBar.classList.remove('show');
    ctrl.play(move);
  }

  function onHandTap(id: string) {
    if (!canAct()) return;
    if (sel?.cardId === id) return cancelSelection();
    const opts = captureOptions(cardById(id), shown!.table.map(cardById)).map((o) => o.map((c) => c.id));
    if (opts.length === 0) return commit({ cardId: id, capture: [] });
    if (opts.length === 1) return commit({ cardId: id, capture: opts[0] });
    // Multi-sum: the card hovers, valid table cards glow, the rest dim.
    sel = { cardId: id, options: opts, chosen: [] };
    haptic('light');
    sfx.pop();
    refreshSelection();
  }

  function onTableTap(id: string) {
    if (!sel || !canAct()) return;
    if (sel.chosen.includes(id)) {
      sel.chosen = sel.chosen.filter((c) => c !== id);
      return refreshSelection();
    }
    const next = [...sel.chosen, id];
    let remaining = sel.options.filter((o) => next.every((c) => o.includes(c)));
    if (remaining.length === 0) {
      // Not compatible with what was picked so far: start over from this card.
      remaining = sel.options.filter((o) => o.includes(id));
      if (remaining.length === 0) return;
      sel.chosen = [id];
    } else sel.chosen = next;
    if (remaining.length === 1) return commit({ cardId: sel.cardId, capture: remaining[0] });
    refreshSelection();
  }

  function cancelSelection() {
    sel = null;
    refreshSelection();
  }

  function refreshSelection() {
    if (!shown || !frame) return;
    renderTable(frame.table);
    renderHand(frame.hand, shown);
    renderStatus(shown);
  }

  /** Tap-to-play plus drag-and-drop onto the felt (or onto a specific table card). */
  function attachDrag(el: HTMLElement, id: string) {
    let startX = 0;
    let startY = 0;
    let dragging = false;
    let pointer: number | null = null;
    let ghost: HTMLElement | null = null;

    el.addEventListener('pointerdown', (e) => {
      if (!canAct()) return;
      pointer = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      dragging = false;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (pointer !== e.pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragging && Math.hypot(dx, dy) > 10) {
        dragging = true;
        const r = el.getBoundingClientRect();
        ghost = el.cloneNode(true) as HTMLElement;
        ghost.className = 'card drag-ghost';
        ghost.style.width = `${r.width}px`;
        ghost.style.left = `${r.left}px`;
        ghost.style.top = `${r.top}px`;
        document.body.append(ghost);
        el.classList.add('dragging');
      }
      if (dragging && ghost) {
        ghost.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 30}deg)`;
        const over = document.elementsFromPoint(e.clientX, e.clientY);
        felt.classList.toggle('drop-target', over.includes(felt));
      }
    });
    const end = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      pointer = null;
      felt.classList.remove('drop-target');
      ghost?.remove();
      ghost = null;
      el.classList.remove('dragging');
      if (!dragging) {
        if (e.type === 'pointerup') onHandTap(id);
        return;
      }
      dragging = false;
      if (e.type !== 'pointerup') return;
      const over = document.elementsFromPoint(e.clientX, e.clientY);
      if (!over.includes(felt)) return;
      const target = over.find((x) => x instanceof HTMLElement && x.classList.contains('on-table')) as HTMLElement | undefined;
      onHandTap(id);
      if (sel && sel.cardId === id && target?.dataset.id) onTableTap(target.dataset.id);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  // ---------------------------------------------------------------- overlays

  function openOverlay(kind: string, content: HTMLElement, dismissable = true) {
    overlayKind = kind;
    overlay.replaceChildren(content);
    overlay.className = `overlay show ${kind}`;
    overlay.onclick = dismissable ? (e) => e.target === overlay && closeOverlay() : null;
  }

  function closeOverlay() {
    overlayKind = null;
    overlay.className = 'overlay hidden';
    overlay.replaceChildren();
    if (shown) renderHand(shown.hand, shown);
  }

  function musicBtn() {
    const label = () => `${musicIcon()} ${t('music')}`;
    const b = h('button', { class: 'btn ghost', 'aria-pressed': String(settings.music) }, label());
    b.addEventListener('click', () => {
      b.setAttribute('aria-pressed', String(toggleMusic()));
      b.textContent = label();
    });
    return b;
  }

  function skipBtn(onSkip?: () => void) {
    const b = h('button', { class: 'btn ghost', 'aria-label': t('nextTrack'), title: t('nextTrack') }, `⏭ ${t('nextTrack')}`);
    b.addEventListener('click', () => {
      const trk = skipTrack();
      sfx.tick();
      toast(`🎵 ${trk.title}`);
      onSkip?.();
    });
    return b;
  }

  function openMenu() {
    const quit = () => {
      if (shown?.status === 'MATCH_OVER' || confirm(t('quitConfirm'))) nav.home();
    };
    const trackLabel = h('p', { class: 'muted menu-track-name' }, `🎵 ${currentTrack().title}`);
    const mBtn = musicBtn();
    const sBtn = skipBtn(() => {
      mBtn.setAttribute('aria-pressed', String(settings.music));
      mBtn.textContent = `${musicIcon()} ${t('music')}`;
      trackLabel.textContent = `🎵 ${currentTrack().title}`;
    });
    openOverlay(
      'menu',
      h(
        'div',
        { class: 'sheet' },
        h('h2', null, 'Scopa'),
        h('button', { class: 'btn', onclick: () => closeOverlay() }, t('continue')),
        h('button', { class: 'btn ghost', onclick: () => nav.rules() }, t('howToPlay')),
        h('div', { class: 'row' }, mBtn, sBtn),
        trackLabel,
        h('button', { class: 'btn danger', onclick: quit }, t('quit')),
      ),
    );
  }

  function openInspector() {
    const v = shown;
    if (!v?.inspector || !v.myCaptured) return;
    const cards = v.myCaptured.map(cardById);
    const p = primiera(cards);
    const coins = cards.filter((c) => c.suit === 'DENARI').length;
    const row = (k: string, val: string) => h('div', { class: 'stat-row' }, h('span', null, k), h('b', null, val));
    openOverlay(
      'inspector',
      h(
        'div',
        { class: 'sheet drawer' },
        h('h2', null, t('myPile')),
        row(t('carte'), `${cards.length}`),
        row(t('coinsCount'), `${coins}`),
        row(t('settebello'), cards.some((c) => c.id === 'DENARI_7') ? `✓ ${t('yes')}` : t('no')),
        row(t('primiera'), `${p.score}${p.suitsCovered < 4 ? ` (${p.suitsCovered}/4)` : ''}`),
        h('div', { class: 'mini-row' }, ...p.cards.map((c) => cardEl(c.id, 'thumb'))),
        h('button', { class: 'btn', onclick: () => closeOverlay() }, t('continue')),
      ),
    );
  }

  function openEmotes() {
    openOverlay(
      'emotes',
      h(
        'div',
        { class: 'sheet drawer emote-grid' },
        ...EMOTES.map((id) =>
          h(
            'button',
            {
              class: 'btn ghost',
              onclick: () => {
                ctrl.emote(id);
                showBubble(meBubble, id);
                closeOverlay();
              },
            },
            t(`emote_${id}` as 'emote_scopa'),
          ),
        ),
      ),
    );
  }

  function showBubble(el: HTMLElement, id: EmoteId) {
    el.textContent = t(`emote_${id}` as 'emote_scopa');
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    sfx.pop();
  }

  function breakdownTable(v: GameView): HTMLElement {
    const b = v.breakdown!;
    const me = v.you === 0 ? b.player1 : b.player2;
    const op = v.you === 0 ? b.player2 : b.player1;
    const rows: [string, string, number, string, number][] = [
      [t('carte'), `${me.carteCount}`, me.points.carte, `${op.carteCount}`, op.points.carte],
      [t('denari'), `${me.denariCount}`, me.points.denari, `${op.denariCount}`, op.points.denari],
      [t('settebello'), me.hasSettebello ? '✦' : '–', me.points.settebello, op.hasSettebello ? '✦' : '–', op.points.settebello],
      [t('primiera'), `${me.primieraScore}`, me.points.primiera, `${op.primieraScore}`, op.points.primiera],
      [t('scope'), `${me.scope}`, me.points.scope, `${op.scope}`, op.points.scope],
    ];
    const pt = (n: number) => h('td', { class: n ? 'pt win' : 'pt' }, n ? `+${n}` : '');
    return h(
      'table',
      { class: 'score-table' },
      h('thead', null, h('tr', null, h('th'), h('th', { colspan: 2 }, v.names[v.you] || t('you')), h('th', { colspan: 2 }, v.names[other(v.you)]))),
      h(
        'tbody',
        null,
        ...rows.map((r, i) =>
          h('tr', { style: `--i:${i}` }, h('th', null, r[0]), h('td', null, r[1]), pt(r[2]), h('td', null, r[3]), pt(r[4])),
        ),
        h(
          'tr',
          { class: 'sum', style: `--i:${rows.length}` },
          h('th', null, t('total')),
          h('td', { colspan: 2 }, h('b', null, `${me.newTotalScore}`), ` (+${me.pointsEarnedThisRound})`),
          h('td', { colspan: 2 }, h('b', null, `${op.newTotalScore}`), ` (+${op.pointsEarnedThisRound})`),
        ),
      ),
    );
  }

  function openRoundEnd(v: GameView) {
    const voted = v.continueVotes[v.you];
    const content = h(
      'div',
      { class: 'sheet scoreboard' },
      h('h2', null, t('roundOver', { n: v.roundNumber })),
      breakdownTable(v),
      h('p', { class: 'muted' }, `${t('targetScore')}: ${v.target}`),
      voted
        ? h('p', { class: 'muted' }, t('waitingOpp'))
        : h(
            'button',
            {
              class: 'btn primary',
              onclick: () => {
                ctrl.continueRound();
                if (ctrl.kind === 'online') openRoundEnd({ ...v, continueVotes: v.you === 0 ? [true, v.continueVotes[1]] : [v.continueVotes[0], true] });
              },
            },
            t('continue'),
          ),
    );
    openOverlay('round', content, false);
  }

  function openMatchOver(v: GameView, prev: GameView | null) {
    const won = v.winner === v.you;
    if (!recorded && prev?.status !== 'MATCH_OVER') {
      recorded = true;
      const unlocked = recordResult(won, ctrl.difficulty);
      for (const d of unlocked) setTimeout(() => toast(t('unlocked', { deck: DECKS[d].name }), 3500), 1200);
      if (won) {
        sfx.fanfare();
        haptic('heavy');
      }
    }
    const opName = v.names[other(v.you)];
    let headline = won ? t('youWin') : t('youLose', { name: opName });
    if (v.forfeitBy !== null) headline = v.forfeitBy === v.you ? t('forfeitLose') : t('forfeitWin', { name: opName });
    const iVoted = v.rematchVotes[v.you];
    const theyVoted = v.rematchVotes[other(v.you)];
    const content = h(
      'div',
      { class: `sheet scoreboard ${won ? 'won' : 'lost'}` },
      h('div', { class: 'trophy' }, won ? '🏆' : '🃏'),
      h('h2', null, headline),
      h('p', { class: 'final' }, h('b', null, `${v.scores[v.you]}`), ' – ', h('b', null, `${v.scores[other(v.you)]}`)),
      v.breakdown && v.forfeitBy === null ? breakdownTable(v) : null,
      theyVoted && !iVoted ? h('p', { class: 'muted' }, t('oppWantsRematch', { name: opName })) : null,
      iVoted
        ? h('p', { class: 'muted' }, t('rematchWaiting'))
        : h(
            'button',
            {
              class: 'btn primary',
              disabled: ctrl.kind === 'online' && !v.connected[other(v.you)],
              onclick: () => {
                recorded = false;
                ctrl.rematch();
              },
            },
            t('rematch'),
          ),
      h('button', { class: 'btn ghost', onclick: () => nav.home() }, t('home')),
    );
    openOverlay('match', content, false);
  }

  // ---------------------------------------------------------------- pause / connection

  function renderPause(v: GameView) {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
    if (!v.pausedUntil || v.status === 'MATCH_OVER') {
      if (connEl.dataset.kind === 'pause') connEl.className = 'conn hidden';
      return;
    }
    const who = v.connected[v.you] ? v.names[other(v.you)] : v.names[v.you];
    const tick = () => {
      const s = Math.max(0, Math.ceil((v.pausedUntil! - clockOffset - Date.now()) / 1000));
      connEl.textContent = t('paused', { name: who, s });
    };
    connEl.dataset.kind = 'pause';
    connEl.className = 'conn show';
    tick();
    tickTimer = window.setInterval(tick, 500);
  }

  ctrl.onStatus((s: ConnStatus) => {
    if (s.kind === 'reconnecting' || s.kind === 'connecting') {
      connEl.dataset.kind = 'net';
      connEl.className = 'conn show';
      connEl.textContent = t(s.kind === 'reconnecting' ? 'reconnecting' : 'connecting');
    } else if (connEl.dataset.kind === 'net') connEl.className = 'conn hidden';
  });

  ctrl.onEmote((from, id) => {
    if (settings.emotesMuted || !shown) return;
    showBubble(from === shown.you ? meBubble : oppBubble, id);
  });

  const unsub = ctrl.subscribe((v) => {
    queue.push(v);
    void pump();
  });

  return () => {
    disposed = true;
    unsub();
    if (tickTimer) clearInterval(tickTimer);
    document.querySelectorAll('.drag-ghost').forEach((g) => g.remove());
  };
}
