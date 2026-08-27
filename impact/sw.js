const CACHE='impact-release-4';
const CORE=['./','./index.html','./styles.css?v=4','./game.js?v=4','./levels.js','./favicon.svg','./manifest.webmanifest','./parts/runtime-1.txt','./parts/runtime-2.txt','./parts/runtime-3.txt','./parts/runtime-4.txt','./parts/runtime-5.txt','./parts/runtime-6.txt'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)))})
