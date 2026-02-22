const VERSION = 'aegis-td-v4';
const CACHE_PREFIX = 'aegis-td-';
const CORE = ['./', './index.html', './styles.css', './js/main.js', './manifest.webmanifest', './assets/icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isLocal = url.origin === self.location.origin;
  const isShellRequest = isLocal && (url.pathname === '/' || url.pathname.endsWith('/index.html'));

  event.respondWith((async () => {
    const cache = await caches.open(VERSION);

    if (isShellRequest) {
      try {
        const fresh = await fetch(event.request, { cache: 'no-store' });
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch {
        return (await cache.match('./index.html')) || Response.error();
      }
    }

    const cached = await cache.match(event.request);
    try {
      const fresh = await fetch(event.request);
      if (isLocal) cache.put(event.request, fresh.clone());
      return fresh;
    } catch {
      return cached || (await cache.match('./index.html'));
    }
  })());
});
