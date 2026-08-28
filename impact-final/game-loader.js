import * as THREE from 'three';
globalThis.__IMPACT_THREE=THREE;
const parts=['./runtime/part-1.txt?v=1','./runtime/part-2.txt?v=1','./runtime/part-3.txt?v=1','./runtime/part-4.txt?v=1','./runtime/part-5.txt?v=1','./runtime/part-6.txt?v=1','./runtime/part-7.txt?v=1','./runtime/part-8.txt?v=1'];
try{
 const texts=await Promise.all(parts.map(async p=>{const r=await fetch(p,{cache:'no-store'});if(!r.ok)throw new Error(`Failed to load ${p}`);return r.text()}));
 new Function(texts.join('')+'\n//# sourceURL=impact-final-runtime.js')();
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}catch(err){console.error(err);document.querySelector('#boot').textContent='IMPACT failed to load — refresh';}
