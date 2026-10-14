// Offline support: the single-player game works with no connection.
const CACHE = 'scopa-v4';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon.svg'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api') || url.pathname.startsWith('/ws') || url.pathname === '/intro.mp4' || url.pathname.startsWith('/music/')) return; // media uses range requests; let the browser handle it

  if (req.mode === 'navigate') {
    // Network first for pages, fall back to the cached app shell.
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          // Only the app shell goes under '/'; the static rules pages are cached under their own URL.
          const key = url.pathname.startsWith('/how-to-play-scopa') || url.pathname.startsWith('/it/') ? req : '/';
          caches.open(CACHE).then((c) => c.put(key, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/'))),
    );
    return;
  }
  // Hashed assets: cache first.
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
