import './styles.css';
import { boot } from './app';

boot();

// Dismiss the splash screen cleanly once the app has booted
const splash = document.getElementById('splash');
if (splash) {
  splash.classList.add('hide');
  setTimeout(() => splash.remove(), 450);
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
