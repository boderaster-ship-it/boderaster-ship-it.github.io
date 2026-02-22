const VERSION = 'aegis-td-v3';
const CORE = ['./', './index.html', './styles.css', './js/main.js', './manifest.webmanifest', './assets/icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(event.request);
    try {
      const fresh = await fetch(event.request);
      if (event.request.url.startsWith(self.location.origin)) cache.put(event.request, fresh.clone());
      return fresh;
    } catch {
      return cached || cache.match('./index.html');
    }
  })());
});
