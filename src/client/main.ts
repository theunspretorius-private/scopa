import './styles.css';
import { boot } from './app';

boot();
playIntro();

// Splash is in index.html so it paints instantly; once the app has booted we
// play the intro video (skippable), then reveal the game.
function playIntro() {
  const splash = document.getElementById('splash');
  const intro = document.getElementById('intro');
  const video = intro?.querySelector('video');
  const skip = intro?.querySelector('button');
  const closeSplash = () => {
    splash?.classList.add('hide');
    setTimeout(() => splash?.remove(), 500);
  };
  if (!intro || !video || !skip) return closeSplash();

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    video.pause();
    intro.remove();
    closeSplash();
  };
  skip.addEventListener('click', finish);
  video.addEventListener('ended', finish);
  video.addEventListener('error', finish);

  video.play().then(
    () => {
      intro.classList.add('on');
      closeSplash();
    },
    finish, // autoplay blocked or unsupported: go straight to the game
  );
  setTimeout(() => !intro.classList.contains('on') && finish(), 4000);
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
