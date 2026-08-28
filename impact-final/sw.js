const CACHE='impact-final-v2';
const CORE=['./','./index.html','./styles.css?v=1','./mobile-fix.css?v=2','./game-loader.js?v=1','./manifest.webmanifest','./favicon.svg','./runtime/part-1.txt?v=1','./runtime/part-2.txt?v=1','./runtime/part-3.txt?v=1','./runtime/part-4.txt?v=1','./runtime/part-5.txt?v=1','./runtime/part-6.txt?v=1','./runtime/part-7.txt?v=1','./runtime/part-8.txt?v=1'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)))});
