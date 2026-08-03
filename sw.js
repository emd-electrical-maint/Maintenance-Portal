// Minimal service worker for installability. Deliberately does NOT cache or
// intercept any Google Drive/API requests -- portal data must always be live.
// Only the static app shell (this HTML file) gets a network-first, cache-fallback
// treatment, purely so the app can still open (to a "you're offline" state handled
// by the page itself) if the network briefly drops right at load time.

const CACHE_NAME = 'emd-portal-shell-v1';
const SHELL_URL = './';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(SHELL_URL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle top-level page navigation for this app's own shell.
  // Everything else (Google APIs, Drive, fonts, anything cross-origin) is left
  // completely untouched -- passes straight through, no caching, no interception.
  if (req.mode !== 'navigate' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(SHELL_URL, res.clone()));
        return res;
      })
      .catch(() => caches.match(SHELL_URL))
  );
});
