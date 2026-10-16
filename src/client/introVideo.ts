import { holdMusic } from './audio';
import { h, icon } from './dom';
import { t } from './i18n';

let activeOverlay: HTMLElement | null = null;

/**
 * Opens a modal dialog with the Scopa introduction video.
 * Holds background music while the video is displayed and resumes it upon exit.
 */
export function showIntroVideo() {
  if (activeOverlay) return;

  holdMusic(true);

  const video = h('video', {
    src: '/intro.mp4',
    playsinline: true,
    controls: true,
    preload: 'auto',
    class: 'intro-modal-player',
  }) as HTMLVideoElement;

  const close = () => {
    window.removeEventListener('keydown', onKeyDown);
    video.pause();
    video.removeAttribute('src');
    video.load();
    overlay.remove();
    activeOverlay = null;
    holdMusic(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };

  const closeBtn = h(
    'button',
    {
      class: 'icon-btn intro-modal-close',
      'aria-label': t('close'),
      title: t('close'),
      onclick: () => close(),
    },
    icon('close'),
  );

  const sheet = h(
    'div',
    { class: 'intro-modal-sheet' },
    closeBtn,
    h('div', { class: 'intro-modal-title' }, icon('play'), ' Scopa'),
    video,
  );

  const overlay = h('div', { class: 'overlay show intro-modal-overlay' }, sheet);
  activeOverlay = overlay;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  window.addEventListener('keydown', onKeyDown);
  document.body.append(overlay);

  void video.play().catch(() => {
    video.muted = true;
    void video.play().catch(() => {});
  });
}

/**
 * Creates an attractive video banner card for placement in How to Play / Rules screens.
 */
export function introCard(): HTMLElement {
  const card = h(
    'div',
    { class: 'intro-video-card', role: 'button', tabIndex: 0, onclick: () => showIntroVideo() },
    h('div', { class: 'intro-card-icon' }, icon('play')),
    h(
      'div',
      { class: 'intro-card-info' },
      h('b', null, t('watchIntro')),
      h('small', null, t('introVideoDesc')),
    ),
  );
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showIntroVideo();
    }
  });
  return card;
}

