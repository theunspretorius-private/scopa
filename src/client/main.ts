import './styles.css';
import { boot } from './app';
import { holdMusic } from './audio';

boot();
playIntro();

// Splash is in index.html so it paints instantly; once the app has booted we
// play the intro video (skippable), then reveal the game.
function playIntro() {
  const splash = document.getElementById('splash');
  const intro = document.getElementById('intro');
  const video = intro?.querySelector('video');
  const skip = intro?.querySelector<HTMLButtonElement>('button.skip');
  const sound = intro?.querySelector<HTMLButtonElement>('button.sound');
  const closeSplash = () => {
    splash?.classList.add('hide');
    setTimeout(() => splash?.remove(), 500);
  };
  if (!intro || !video || !skip || !sound) return closeSplash();

  holdMusic(true);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    video.pause();
    intro.remove();
    closeSplash();
    holdMusic(false);
  };
  const shown = () => {
    intro.classList.add('on');
    closeSplash();
  };
  const unmute = () => {
    video.muted = false;
    sound.hidden = true;
  };
  skip.addEventListener('click', (e) => {
    e.stopPropagation();
    finish();
  });
  // Tapping anywhere on a muted intro turns the sound on.
  intro.addEventListener('click', () => video.muted && unmute());
  video.addEventListener('ended', finish);
  video.addEventListener('error', finish);

  // Try with sound first; browsers that block audible autoplay get a muted start
  // plus a "tap for sound" button.
  video.play().then(shown, () => {
    video.muted = true;
    sound.hidden = false;
    video.play().then(shown, finish); // can't play at all: go straight to the game
  });
  setTimeout(() => !intro.classList.contains('on') && finish(), 4000);
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
