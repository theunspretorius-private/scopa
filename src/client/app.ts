import { DIFFICULTIES, type Difficulty } from '../ai/observation';
import {
  BRISCOLA_TARGET_SCORES,
  TARGET_SCORES,
  type BriscolaTargetScore,
  type ScopaTargetScore,
  type TargetScore,
} from '../engine/match';
import type { GameType } from '../engine/rules';
import { ROOM_ID_RE, type CreateRoomResponse, type RoomConfig, type TurnSeconds } from '../net/protocol';
import qrcode from 'qrcode-generator';
import { currentTrack, sfx, skipTrack, startMusic, toggleMusic, unlockAudio } from './audio';
import { cardEl } from './cardEl';
import { LocalController } from './controllers/local';
import { OnlineController } from './controllers/online';
import type { GameController } from './controllers/types';
import { DECKS, DECK_ORDER } from './decks';
import { h, icon, segmented, toast, toggle } from './dom';
import { LANGS, LANG_NAMES, rulesText, setLang, t, type Lang } from './i18n';
import { introCard, showIntroVideo } from './introVideo';
import { copyText, onDeepLink, publicOrigin, serverOrigin, shareLink } from './native';
import { gameScreen } from './screens/game';
import { isDeckUnlocked, roomToken, settings, stats, updateSettings, type DeckId } from './settings';

const root = document.getElementById('app')!;
let cleanup: (() => void) | null = null;
let controller: GameController | null = null;

function mount(render: () => HTMLElement | void, fn?: () => void) {
  cleanup?.();
  cleanup = fn ?? null;
  const el = render();
  if (el) root.replaceChildren(el);
  root.scrollTop = 0;
}

function endGame() {
  controller?.dispose();
  controller = null;
}

function setPath(path: string) {
  if (location.pathname !== path) history.replaceState(null, '', path);
}

function gameLabel(game: GameType): string {
  return game === 'briscola' ? 'Briscola' : 'Scopa';
}

function formatBriscolaTarget(v: BriscolaTargetScore): string {
  if (v === 1) return t('singleGame');
  if (v === 2) return t('bestOf3');
  return t('bestOf5');
}

function formatConfigTarget(game: GameType, target: TargetScore): string {
  if (game === 'briscola') {
    return `${t('matchFormat')}: ${formatBriscolaTarget(target as BriscolaTargetScore)}`;
  }
  return `${t('targetScore')}: ${target}`;
}

const header = (title: string, back: () => void = home) =>
  h(
    'header',
    { class: 'top' },
    h('button', { class: 'icon-btn back-btn', 'aria-label': t('back'), onclick: back }, icon('back')),
    h('h1', null, title),
    h(
      'button',
      {
        class: 'icon-btn music-skip-btn header-skip-btn',
        'aria-label': t('nextTrack'),
        title: t('nextTrack'),
        onclick: () => {
          const trk = skipTrack();
          sfx.tick();
          toast(`🎵 ${trk.title}`);
        },
      },
      icon('skip'),
    ),
  );

// ------------------------------------------------------------------ home

export function home() {
  endGame();
  setPath('/');
  mount(() => {
    const isBriscola = settings.game === 'briscola';
    const fanCards = isBriscola ? ['DENARI_1', 'SPADE_3', 'COPPE_10'] : ['COPPE_10', 'DENARI_7', 'SPADE_1'];
    const fan = h(
      'div',
      { class: 'hero-fan' },
      h('div', { class: 'hero-glow', 'aria-hidden': 'true' }),
      ...fanCards.map((id, i) => cardEl(id, `hero h${i}`, !isBriscola)),
    );
    const renderMuteIcon = () => icon(settings.music ? 'volumeOn' : 'volumeOff');
    const muteBtn = h('button', { class: 'icon-btn music-btn', 'aria-label': t('music'), title: t('music') }, renderMuteIcon());
    muteBtn.addEventListener('click', () => {
      toggleMusic();
      muteBtn.replaceChildren(renderMuteIcon());
    });
    const skipBtn = h(
      'button',
      { class: 'icon-btn music-skip-btn', 'aria-label': t('nextTrack'), title: t('nextTrack') },
      icon('skip'),
    );
    skipBtn.addEventListener('click', () => {
      const trk = skipTrack();
      muteBtn.replaceChildren(renderMuteIcon());
      sfx.tick();
      toast(`🎵 ${trk.title}`);
    });
    const musicControls = h('div', { class: 'music-controls' }, muteBtn, skipBtn);

    const gameSwitcher = h(
      'div',
      { class: 'game-switcher', role: 'group', 'aria-label': t('gameMode') },
      ...(['scopa', 'briscola'] as GameType[]).map((g) =>
        h(
          'button',
          {
            type: 'button',
            class: `game-switch-btn ${settings.game === g ? 'on' : ''}`,
            'aria-pressed': String(settings.game === g),
            onclick: () => {
              if (settings.game === g) return;
              sfx.tick();
              updateSettings({ game: g });
              home();
            },
          },
          gameLabel(g),
        ),
      ),
    );

    const totalGames = stats.wins + stats.losses;
    const winRate = totalGames > 0 ? `${Math.round((stats.wins / totalGames) * 100)}%` : '—';

    return h(
      'div',
      { class: 'screen home' },
      musicControls,
      h(
        'div',
        { class: 'logo' },
        h('span', { class: 'logo-badge' }, '✦ GIOCO DELLE CARTE ✦'),
        gameSwitcher,
        h('h1', null, gameLabel(settings.game)),
        h('p', null, isBriscola ? t('briscolaTagline') : t('tagline')),
      ),
      fan,
      h(
        'nav',
        { class: 'menu' },
        h(
          'button',
          { class: 'btn primary big cta-btn', onclick: localSetup },
          h('span', { class: 'cta-icon' }, icon('cards')),
          h('span', { class: 'cta-label' }, t('playPc')),
        ),
        h(
          'button',
          { class: 'btn primary big alt cta-btn', onclick: friendSetup },
          h('span', { class: 'cta-icon' }, icon('users')),
          h('span', { class: 'cta-label' }, t('playFriend')),
        ),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'btn ghost glass-tile', onclick: settingsScreen }, icon('settings'), h('span', null, t('settings'))),
          h('button', { class: 'btn ghost glass-tile', onclick: () => rulesScreen(home) }, icon('book'), h('span', null, t('howToPlay'))),
        ),
      ),
      h(
        'div',
        { class: 'stats-bar' },
        h('div', { class: 'stat-pill' }, h('strong', null, String(stats.wins)), h('span', null, t('wins'))),
        h('div', { class: 'stat-divider' }),
        h('div', { class: 'stat-pill' }, h('strong', null, String(stats.losses)), h('span', null, t('losses'))),
        h('div', { class: 'stat-divider' }),
        h('div', { class: 'stat-pill' }, h('strong', null, winRate), h('span', null, 'Win %')),
      ),
      h(
        'p',
        { class: 'seo-links' },
        h('a', { href: '/how-to-play-scopa/' }, 'Scopa rules'),
        ' · ',
        h('a', { href: '/how-to-play-briscola/' }, 'Briscola rules'),
        ' · ',
        h('a', { href: '/it/regole-scopa/', hreflang: 'it' }, 'Regole Scopa'),
        ' · ',
        h('a', { href: '/it/regole-briscola/', hreflang: 'it' }, 'Regole Briscola'),
        ' · ',
        h('a', { href: 'https://afrispeel.co.za/scopa', target: '_blank', rel: 'noopener', hreflang: 'af' }, 'Afrispeel'),
      ),
    );
  });
}

// ------------------------------------------------------------------ vs PC

function localSetup() {
  const game = settings.game;
  const isBriscola = game === 'briscola';
  let diff: Difficulty = settings.lastDifficulty;
  let scopaTarget: ScopaTargetScore = settings.lastTarget;
  let briscolaTarget: BriscolaTargetScore = settings.lastBriscolaTarget;
  mount(() => {
    const cards = h('div', { class: 'choice-list' });
    const renderCards = () =>
      cards.replaceChildren(
        ...DIFFICULTIES.map((d) =>
          h(
            'button',
            {
              class: `choice ${d === diff ? 'on' : ''} d-${d.toLowerCase()}`,
              'aria-pressed': String(d === diff),
              onclick: () => {
                diff = d;
                renderCards();
              },
            },
            h('span', { class: 'dot' }),
            h(
              'span',
              { class: 'choice-body' },
              h('b', null, t(d)),
              h('small', null, t((isBriscola ? `${d}_briscola_desc` : `${d}_desc`) as 'EASY_desc')),
            ),
            h('span', { class: 'choice-check' }, icon('check')),
          ),
        ),
      );
    renderCards();
    return h(
      'div',
      { class: 'screen form' },
      header(`${t('playPc')} · ${gameLabel(game)}`),
      h(
        'div',
        { class: 'glass-panel' },
        h('h3', null, t('difficulty')),
        cards,
      ),
      h(
        'div',
        { class: 'glass-panel' },
        h('h3', null, isBriscola ? t('matchFormat') : t('targetScore')),
        isBriscola
          ? segmented<BriscolaTargetScore>(
              BRISCOLA_TARGET_SCORES.map((v) => ({ value: v, label: formatBriscolaTarget(v) })),
              briscolaTarget,
              (v) => (briscolaTarget = v),
            )
          : segmented<ScopaTargetScore>(
              TARGET_SCORES.map((v) => ({ value: v, label: `${v}${v === 11 ? ` · ${t('standard')}` : ''}` })),
              scopaTarget,
              (v) => (scopaTarget = v),
            ),
      ),
      h(
        'button',
        {
          class: 'btn primary big',
          onclick: () => {
            if (isBriscola) {
              updateSettings({ lastDifficulty: diff, lastBriscolaTarget: briscolaTarget });
              startLocal(diff, briscolaTarget, game);
            } else {
              updateSettings({ lastDifficulty: diff, lastTarget: scopaTarget });
              startLocal(diff, scopaTarget, game);
            }
          },
        },
        t('start'),
      ),
    );
  });
}

function startLocal(diff: Difficulty, target: TargetScore, game: GameType = settings.game) {
  endGame();
  const ctrl = new LocalController(diff, target, settings.name, game);
  controller = ctrl;
  const nav = { home, rules: () => rulesOverlay(game) };
  mount(
    () => undefined,
    gameScreen(root, ctrl, nav),
  );
}

// ------------------------------------------------------------------ friend (link) play

function friendSetup() {
  const game = settings.game;
  const isBriscola = game === 'briscola';
  let scopaTarget: ScopaTargetScore = settings.lastTarget;
  let briscolaTarget: BriscolaTargetScore = settings.lastBriscolaTarget;
  let turnSeconds: TurnSeconds = settings.lastTurnSeconds;
  let inspector = settings.lastInspector;
  mount(() => {
    const name = h('input', { type: 'text', maxlength: 20, value: settings.name, placeholder: t('name'), autocomplete: 'nickname' }) as HTMLInputElement;
    const btn = h('button', { class: 'btn primary big' }, icon('link'), h('span', null, t('createLink')));
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const target: TargetScore = isBriscola ? briscolaTarget : scopaTarget;
      updateSettings({
        name: name.value.trim(),
        ...(isBriscola ? { lastBriscolaTarget: briscolaTarget } : { lastTarget: scopaTarget }),
        lastTurnSeconds: turnSeconds,
        lastInspector: inspector,
      });
      try {
        const res = await fetch(`${serverOrigin()}/api/rooms`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ game, target, turnSeconds, inspector, name: settings.name }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as CreateRoomResponse;
        roomToken.set(data.room, data.token);
        startOnline(data.room, true);
      } catch {
        toast(t('offline'));
        btn.disabled = false;
      }
    });
    return h(
      'div',
      { class: 'screen form' },
      header(`${t('playFriend')} · ${gameLabel(game)}`),
      h(
        'div',
        { class: 'glass-panel' },
        h('label', { class: 'field' }, h('span', null, t('name')), name),
        h('h3', null, isBriscola ? t('matchFormat') : t('targetScore')),
        isBriscola
          ? segmented<BriscolaTargetScore>(
              BRISCOLA_TARGET_SCORES.map((v) => ({ value: v, label: formatBriscolaTarget(v) })),
              briscolaTarget,
              (v) => (briscolaTarget = v),
            )
          : segmented<ScopaTargetScore>(
              TARGET_SCORES.map((v) => ({ value: v, label: `${v}${v === 11 ? ` · ${t('standard')}` : ` · ${t('long')}`}` })),
              scopaTarget,
              (v) => (scopaTarget = v),
            ),
        h('h3', null, t('turnTimer')),
        segmented<TurnSeconds>(
          [
            { value: 15, label: '15s' },
            { value: 30, label: '30s' },
            { value: 0, label: t('none') },
          ],
          turnSeconds,
          (v) => (turnSeconds = v),
        ),
        toggle(t('pileInspector'), inspector, (v) => (inspector = v), t('pileInspectorDesc')),
      ),
      btn,
    );
  });
}

function inviteUrl(room: string) {
  return `${publicOrigin()}/m/${room}`;
}

function waitingScreen(room: string, config: RoomConfig) {
  const game: GameType = config.game ?? 'scopa';
  const isBriscola = game === 'briscola';
  const url = inviteUrl(room);
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const copyBtn = h('button', { class: 'btn ghost' }, icon('copy'), h('span', null, t('copy')));
  copyBtn.addEventListener('click', async () => {
    if (await copyText(url)) toast(t('copied'));
  });
  const share = async () => {
    const shareTitle = gameLabel(game);
    const shareDesc = isBriscola
      ? `${t('joinTitleBriscola')} — ${formatBriscolaTarget(config.target as BriscolaTargetScore)}`
      : `${t('joinTitle')} — ${config.target} ${t('points')}`;
    const shared = await shareLink(url, shareTitle, shareDesc);
    if (!shared && (await copyText(url))) toast(t('copied'));
  };
  return h(
    'div',
    { class: 'screen form invite' },
    header(`${t('inviteTitle')} · ${gameLabel(game)}`),
    h(
      'div',
      { class: 'glass-panel invite-panel' },
      h('p', { class: 'invite-lead' }, t('inviteText')),
      h('div', { class: 'link-box' }, h('code', null, url)),
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn primary', onclick: share }, icon('share'), h('span', null, t('share'))),
        copyBtn,
      ),
      h('div', { class: 'qr', html: qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true }) }),
      h(
        'p',
        { class: 'muted config-pill' },
        `${gameLabel(game)} · ${formatConfigTarget(game, config.target)} · ${t('turnTimer')}: ${config.turnSeconds ? `${config.turnSeconds}s` : t('none')}`,
      ),
      h('div', { class: 'waiting' }, h('span', { class: 'spinner' }), h('span', null, t('waitingFor'))),
    ),
  );
}

function startOnline(room: string, isHost: boolean) {
  endGame();
  setPath(`/m/${room}`);
  const ctrl = new OnlineController(room, settings.name);
  controller = ctrl;
  let inGame = false;
  mount(() => h('div', { class: 'screen center' }, h('span', { class: 'spinner' }), h('p', null, t('connecting'))));
  ctrl.onStatus((s) => {
    if (inGame) return;
    if (s.kind === 'waiting') mount(() => waitingScreen(s.room, s.config), () => {});
    if (s.kind === 'error') {
      endGame();
      mount(() =>
        h(
          'div',
          { class: 'screen center' },
          h('p', { class: 'error' }, t(s.code === 'room_full' ? 'roomFull' : 'roomNotFound')),
          h('button', { class: 'btn primary', onclick: home }, t('home')),
        ),
      );
    }
  });
  const off = ctrl.subscribe(() => {
    if (inGame) return;
    inGame = true;
    off();
    mount(() => undefined, gameScreen(root, ctrl, { home, rules: () => rulesOverlay(ctrl.view?.game ?? settings.game) }));
  });
  void isHost;
}

async function joinScreen(room: string) {
  endGame();
  // Returning player (reconnect after app switch / reload): go straight back in.
  if (roomToken.get(room)) return startOnline(room, false);
  mount(() => h('div', { class: 'screen center' }, h('span', { class: 'spinner' })));
  let info: { config: RoomConfig; full: boolean; host?: string } | null = null;
  try {
    const res = await fetch(`${serverOrigin()}/api/rooms/${room}`);
    if (res.ok) info = await res.json();
  } catch {
    /* handled below */
  }
  if (!info || info.full) {
    mount(() =>
      h(
        'div',
        { class: 'screen center' },
        h('p', { class: 'error' }, info?.full ? t('roomFull') : t('roomNotFound')),
        h('button', { class: 'btn primary', onclick: home }, t('home')),
      ),
    );
    return;
  }
  const cfg = info.config;
  const game: GameType = cfg.game ?? 'scopa';
  const isBriscola = game === 'briscola';
  mount(() => {
    const name = h('input', { type: 'text', maxlength: 20, value: settings.name, placeholder: t('name'), autocomplete: 'nickname' }) as HTMLInputElement;
    return h(
      'div',
      { class: 'screen form join' },
      h('div', { class: 'logo small' }, h('h1', null, gameLabel(game))),
      h(
        'div',
        { class: 'glass-panel join-panel' },
        h('h2', null, isBriscola ? t('joinTitleBriscola') : t('joinTitle')),
        info!.host ? h('p', { class: 'host' }, icon('user'), h('span', null, info!.host)) : null,
        h(
          'p',
          { class: 'muted config-pill' },
          `${formatConfigTarget(game, cfg.target)} · ${t('turnTimer')}: ${cfg.turnSeconds ? `${cfg.turnSeconds}s` : t('none')}`,
        ),
        h('label', { class: 'field' }, h('span', null, t('joinAs')), name),
        h(
          'button',
          {
            class: 'btn primary big',
            onclick: () => {
              unlockAudio();
              updateSettings({ name: name.value.trim() });
              startOnline(room, false);
            },
          },
          t('join'),
        ),
        h('button', { class: 'btn ghost', onclick: home }, t('back')),
      ),
    );
  });
}

// ------------------------------------------------------------------ settings & rules

function settingsScreen() {
  mount(() => {
    const decks = h('div', { class: 'deck-grid' });
    const renderDecks = () =>
      decks.replaceChildren(
        ...DECK_ORDER.map((id: DeckId) => {
          const d = DECKS[id];
          const unlocked = isDeckUnlocked(id);
          const selected = settings.deck === id;
          const prevDeck = settings.deck;
          // Preview with this deck's art regardless of the current selection.
          settings.deck = id;
          const preview = h('div', { class: 'deck-preview' }, cardEl('DENARI_7', 'thumb t0'), cardEl('COPPE_10', 'thumb t1'));
          settings.deck = prevDeck;
          return h(
            'button',
            {
              class: `deck-choice ${selected ? 'on' : ''} ${unlocked ? '' : 'locked'}`,
              disabled: !unlocked,
              'aria-pressed': String(selected),
              onclick: () => {
                updateSettings({ deck: id });
                renderDecks();
              },
            },
            selected ? h('span', { class: 'deck-badge' }, icon('check')) : !unlocked ? h('span', { class: 'deck-badge locked-badge' }, icon('lock')) : null,
            preview,
            h('b', null, d.name),
            h('small', null, unlocked ? d.region : t(id === 'bergamasche' ? 'unlockBergamasche' : 'unlockTrevisane')),
          );
        }),
      );
    renderDecks();
    const lang = h('select', { 'aria-label': t('language') }, ...LANGS.map((l) => h('option', { value: l, selected: l === settings.lang }, LANG_NAMES[l]))) as HTMLSelectElement;
    lang.addEventListener('change', () => {
      updateSettings({ lang: lang.value as Lang });
      setLang(settings.lang);
      settingsScreen();
    });
    const name = h('input', { type: 'text', maxlength: 20, value: settings.name, placeholder: t('name') }) as HTMLInputElement;
    name.addEventListener('change', () => updateSettings({ name: name.value.trim() }));
    const trackSpan = h('span', { class: 'muted music-track-name' }, icon('music'), h('span', null, currentTrack().title));
    const skipSettingBtn = h(
      'button',
      {
        class: 'btn ghost small',
        onclick: () => {
          const trk = skipTrack();
          sfx.tick();
          trackSpan.replaceChildren(icon('music'), h('span', null, trk.title));
          toast(`🎵 ${trk.title}`);
        },
      },
      icon('skip'),
      h('span', null, t('nextTrack')),
    );
    return h(
      'div',
      { class: 'screen form' },
      header(t('settings')),
      h(
        'div',
        { class: 'glass-panel' },
        h('label', { class: 'field' }, h('span', null, t('name')), name),
        h('label', { class: 'field' }, h('span', null, t('language')), lang),
      ),
      h(
        'div',
        { class: 'glass-panel' },
        h('h3', null, t('deckStyle')),
        decks,
        toggle(t('showNumbers'), settings.showNumbers, (v) => {
          updateSettings({ showNumbers: v });
          renderDecks();
        }),
      ),
      h(
        'div',
        { class: 'glass-panel' },
        toggle(t('sound'), settings.sound, (v) => updateSettings({ sound: v })),
        toggle(t('music'), settings.music, (v) => {
          if (v !== settings.music) toggleMusic();
        }),
        h('div', { class: 'music-settings-row' }, trackSpan, skipSettingBtn),
        toggle(t('haptics'), settings.haptics, (v) => updateSettings({ haptics: v })),
        toggle(t('emotesMuted'), settings.emotesMuted, (v) => updateSettings({ emotesMuted: v })),
        h('button', { class: 'btn ghost intro-settings-btn', onclick: () => showIntroVideo() }, icon('play'), h('span', null, t('watchIntro'))),
      ),
      h(
        'div',
        { class: 'glass-panel' },
        h('h3', null, t('stats')),
        h('p', { class: 'muted' }, `${t('wins')}: ${stats.wins} · ${t('losses')}: ${stats.losses} · ${t('HARD')}: ${stats.winsByDifficulty.HARD}`),
      ),
    );
  });
}

function rulesContent(game: GameType = settings.game): HTMLElement {
  return h('ol', { class: 'rules' }, ...rulesText(game).map((r) => h('li', null, r)));
}

function rulesScreen(back: () => void) {
  let ruleGame: GameType = settings.game;
  mount(() => {
    const body = h('div', { class: 'rules-body' });
    const renderBody = () => {
      const panel = h('div', { class: 'glass-panel' }, rulesContent(ruleGame));
      if (ruleGame === 'scopa') body.replaceChildren(introCard(), panel);
      else body.replaceChildren(panel);
    };
    renderBody();
    return h(
      'div',
      { class: 'screen form' },
      header(t('howToPlay'), back),
      segmented<GameType>(
        [
          { value: 'scopa', label: 'Scopa' },
          { value: 'briscola', label: 'Briscola' },
        ],
        ruleGame,
        (v) => {
          ruleGame = v;
          renderBody();
        },
      ),
      body,
    );
  });
}

function rulesOverlay(game: GameType = settings.game) {
  const el = h(
    'div',
    { class: 'overlay show rules-ov' },
    h(
      'div',
      { class: 'sheet tall' },
      h('h2', null, `${t('howToPlay')} · ${gameLabel(game)}`),
      game === 'scopa'
        ? h('button', { class: 'btn ghost intro-overlay-btn', onclick: () => showIntroVideo() }, icon('play'), h('span', null, t('watchIntro')))
        : null,
      rulesContent(game),
      h('button', { class: 'btn primary', onclick: () => el.remove() }, t('continue')),
    ),
  );
  document.body.append(el);
}

// ------------------------------------------------------------------ routing

export function route(path: string) {
  const m = /^\/m\/([^/]+)\/?$/.exec(path);
  if (m && ROOM_ID_RE.test(m[1])) return void joinScreen(m[1]);
  home();
}

export function boot() {
  const qGame = new URLSearchParams(location.search).get('game');
  if (qGame === 'briscola' || qGame === 'scopa') updateSettings({ game: qGame });
  setLang(settings.lang);
  startMusic();
  void onDeepLink((path) => route(path));
  route(location.pathname);
}

