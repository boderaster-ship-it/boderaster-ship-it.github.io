import * as THREE from 'three';
import * as LEVELMOD from './levels.js';
globalThis.__IMPACT_THREE=THREE;
globalThis.__IMPACT_LEVELS=LEVELMOD;
const parts=['./parts/runtime-1.txt','./parts/runtime-2.txt','./parts/runtime-3.txt','./parts/runtime-4.txt','./parts/runtime-5.txt','./parts/runtime-6.txt'];
try{
 const texts=await Promise.all(parts.map(async p=>{const r=await fetch(p,{cache:'no-store'});if(!r.ok)throw new Error(`Runtime part failed: ${p}`);return r.text()}));
 new Function(texts.join('\n')+'\n//# sourceURL=impact-runtime.js')();
}catch(err){console.error(err);document.querySelector('#boot')?.classList.add('done');const t=document.querySelector('#toast');if(t){t.textContent='Runtime failed to load — refresh once';t.classList.add('show')}}
