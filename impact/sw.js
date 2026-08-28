const CACHE='impact-release-5';
const CORE=['./','./index.html','./styles.css?v=4','./hotfix.css?v=5','./game.js?v=5','./levels.js','./favicon.svg','./manifest.webmanifest','./parts/runtime-1.txt?v=5','./parts/runtime-2.txt?v=5','./parts/runtime-3.txt?v=5','./parts/runtime-4.txt?v=5','./parts/runtime-5.txt?v=5','./parts/runtime-6.txt?v=5','./parts/runtime-7.txt?v=5','./parts/runtime-8.txt?v=5','./parts/runtime-9.txt?v=5'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)))})
