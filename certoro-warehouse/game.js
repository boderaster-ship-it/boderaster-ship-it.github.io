import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const $=id=>document.getElementById(id), clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t;
let activeVariant='tripo';
function loadCertoro(onLoad,onProgress,onError){
 new GLTFLoader().load('https://d2ol7oe51mr4n9.cloudfront.net/user_3JoVMcU64SCr3ZOXnqrL8fUEJOx/a569ba67-6a7f-4329-bb63-e7b9b39b25f2.glb',gltf=>{
  const rig=gltf.scene.getObjectByName('CERTORO_RIG');if(!rig||!gltf.animations.length||!rig.getObjectByName('HighDetailCertoro')){onError(Error('Tripo-Rig fehlt'));return}onLoad(gltf);
 },onProgress,onError)
}
const P={purple:0x6d28d9,pink:0xff2e93,lime:0xc6ff3d,dark:0x1b0f32};
const products=[['Standmixer','KÜCHENGERÄT','#6d28d9'],['Kopfhörer','AUDIO','#ff2e93'],['Akkuschrauber','WERKZEUG','#f6b34a'],['Wasserkocher','HAUSHALT','#438cb8'],['Kaffeemaschine','KÜCHE','#6e5042'],['LED-Leuchte','BELEUCHTUNG','#c6ff3d'],['Lautsprecher','AUDIO','#4a3a6b'],['Pflegeset','PFLEGE','#ea8b9b'],['Toaster','KÜCHE','#699f91'],['Maus & Tastatur','ELEKTRONIK','#5d7bb8']];
const addons=[['price','Marktpreise'],['photo','Foto-Editor'],['compliance','Compliance / WEEE'],['social','Social-Media-Posts'],['video','Produktvideos'],['print','Flyer, Plakate & Katalog'],['banner','eBay-Kopfbanner']];
const manualStages=[['Produkt fotografieren',18,'Artikel einzeln auspacken, ausrichten und fotografieren.'],['Artikel identifizieren',22,'EAN, Produktname und Hersteller recherchieren.'],['Produktdaten erfassen',40,'Titel, Beschreibung, Merkmale und Kategorie manuell ausfüllen.'],['Marktpreise vergleichen',30,'Angebote prüfen und Verkaufspreis festlegen.'],['Marketing erstellen',35,'Produktbild bearbeiten und Werbematerial erstellen.'],['Listing anlegen',35,'Compliance prüfen, Daten übertragen und Angebot vorbereiten.']];
const autoStages=[['Alle Artikel fotografieren',9],['Zum Sofa gehen',6],['Certoro arbeitet',75]];
const state={phase:'menu',role:null,elapsed:0,paused:false,gate:0,autoTime:0,autoStep:0,autoRun:false,manualTime:0,manualStep:0,manualItem:0,manualRun:false,addons:new Set(),muted:false,ending:false};
let renderer,scene,camera,clock=new T.Clock(),model=null,mixer=null,actions={},currentAction='',worker,phoneModel,doorGroups=[],pallets=[],productsMeshes=[[],[]],laneLights=[],scanBeam,screenTexture,screenCanvas,manualProps=[],lastUi=0;
let coffeeCup=null;
let manualPose='idle',certPose='idle', certPos=new T.Vector3(-3.1,0,2.25),manualPos=new T.Vector3(3.1,0,2.25),certTarget=certPos.clone(),manualTarget=manualPos.clone();
let yaw=0.10,pitch=.54,dist=18,drag=null,camTarget=new T.Vector3(0,.8,-.2),autoCamera=true,overview=false,toastTimer=0,ac;
const v=(x,y,z)=>new T.Vector3(x,y,z);
// Quiet, short foley sounds instead of tonal arcade beeps. Original dialogue is untouched.
let foleyBuffers={},ambientSource=null,ambientGain=null,lastFoley=0;
function foleyBuffer(kind){
 if(foleyBuffers[kind])return foleyBuffers[kind];
 const dur={tick:.075,scan:.14,gate:.65,done:.48,confirm:.16}[kind]||.10;
 const n=Math.ceil(ac.sampleRate*dur),b=ac.createBuffer(1,n,ac.sampleRate),a=b.getChannelData(0);let low=0,low2=0,seed=12345;
 for(let i=0;i<n;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const t=i/ac.sampleRate,x=seed/2147483648-1;low+=.075*(x-low);low2+=.008*(x-low2);const soft=low-low2;
  if(kind==='scan'){a[i]=(soft*.9+x*.14)*(Math.exp(-t*65)+.45*Math.exp(-Math.max(0,t-.047)*85)*(t>.047))}
  else if(kind==='gate'){a[i]=low2*Math.sin(Math.PI*t/dur)**2}
  else if(kind==='done'){a[i]=soft*Math.sin(Math.PI*t/dur)**2*.75}
  else{a[i]=(soft*.7+low2*.5)*Math.exp(-t*(kind==='confirm'?22:52))}
  a[i]*=Math.min(1,t/.002)*Math.min(1,(dur-t)/.01);
 }
 return foleyBuffers[kind]=b;
}
function sound(kind='tick'){
 if(state.muted)return;
 try{ac??=new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();
 const now=ac.currentTime;if(kind==='tick'&&now-lastFoley<.12)return;lastFoley=now;
 const src=ac.createBufferSource(),g=ac.createGain();src.buffer=foleyBuffer(kind);g.gain.value={tick:.12,scan:.23,gate:.19,done:.16,confirm:.16}[kind]||.12;src.connect(g).connect(ac.destination);src.start();
 }catch{}
}
function updateAmbience(){
 if(!ac||ac.state!=='running')return;
 try{
 if(!ambientSource&&!state.muted&&state.phase!=='menu'){
  const n=ac.sampleRate*4,b=ac.createBuffer(1,n,ac.sampleRate),a=b.getChannelData(0);let f=0,seed=6138;
  for(let i=0;i<n;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;f+=.003*(seed/2147483648-1-f);a[i]=f*Math.min(1,i/4000,(n-i)/4000)}
  ambientSource=ac.createBufferSource();ambientSource.buffer=b;ambientSource.loop=true;ambientGain=ac.createGain();ambientGain.gain.value=0;ambientSource.connect(ambientGain).connect(ac.destination);ambientSource.start();
 }
 if(ambientGain){const target=state.muted||state.paused||state.phase==='done'||state.phase==='menu'?0:voicePlaying?.017:.06;ambientGain.gain.setTargetAtTime(target,ac.currentTime,.12)}
 }catch{}
}
function toast(s){$('toast').textContent=s;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),1900)}
const mats={};
function mat(color,rough=.7,metal=0){const k=[color,rough,metal].join();return mats[k]??=new T.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
function box(parent,w,h,d,x,y,z,m,shadow=true){const a=new T.Mesh(new T.BoxGeometry(w,h,d),typeof m==='number'?mat(m):m);a.position.set(x,y,z);a.castShadow=shadow;a.receiveShadow=true;parent.add(a);return a}
function cyl(parent,r1,r2,h,x,y,z,m,seg=20){const a=new T.Mesh(new T.CylinderGeometry(r1,r2,h,seg),typeof m==='number'?mat(m):m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a}
function ell(parent,x,y,z,sx,sy,sz,m){const a=new T.Mesh(new T.SphereGeometry(1,24,16),typeof m==='number'?mat(m):m);a.position.set(x,y,z);a.scale.set(sx,sy,sz);a.castShadow=true;parent.add(a);return a}
function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g}
function texture(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=8;return tx}
function plane(parent,w,h,x,y,z,tx){const a=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,transparent:true,side:T.DoubleSide,depthWrite:false}));a.position.set(x,y,z);parent.add(a);return a}
function sign(parent,text,sub,w,h,x,y,z,col='#c6ff3d'){const tx=texture(1536,384,(ctx,W,H)=>{const c=ctx;c.scale(2,2);W=768;H=192;const grad=c.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#252237');grad.addColorStop(1,'#100d20');c.fillStyle=grad;c.fillRect(0,0,W,H);c.strokeStyle='#8372aa';c.lineWidth=3;c.strokeRect(2,2,W-4,H-4);c.fillStyle=col;c.fillRect(0,0,12,H);c.fillStyle='#fff';c.font='900 58px Arial';c.fillText(text,36,75);c.fillStyle=col;c.font='bold 31px Arial';c.fillText(sub,38,133)});box(parent,w+.05,h+.05,.045,x,y,z-.027,mat(0x262332,.43,.45));return plane(parent,w,h,x,y,z,tx)}
function productArt(c,w,h,i){
 if(productAtlas){const size=Math.min(w,h)*.98,cell=250,crop=196,sx=(i%5)*cell+(cell-crop)/2,sy=Math.floor(i/5)*cell+(cell-crop)/2;c.drawImage(productAtlas,sx,sy,crop,crop,(w-size)/2,(h-size)/2,size,size);return}

 c.save();c.translate(w/2,h/2);let k=Math.min(w,h)/120;c.scale(k,k);let col=products[i][2];
 const rr=(x,y,w,h,r,f)=>{c.fillStyle=f;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()};
 const e=(x,y,rx,ry,f)=>{c.fillStyle=f;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()};
 e(0,45,42,6,'#0002');
 if(i===0){rr(-24,14,48,29,6,'#bec5ce');rr(-19,-36,38,50,6,'#a4c4d8');rr(-22,-39,44,8,3,'#303b4c');e(0,29,6,6,'#283242')}
 else if(i===1){c.strokeStyle='#262c3b';c.lineWidth=10;c.beginPath();c.arc(0,-4,32,Math.PI,Math.PI*2);c.stroke();rr(-42,-5,19,35,7,col);rr(23,-5,19,35,7,col)}
 else if(i===2){rr(-38,-22,58,27,5,col);rr(20,-20,19,20,3,'#30343e');rr(38,-15,19,6,2,'#79818c');rr(-13,3,19,29,4,'#353a45');rr(-22,28,37,12,4,col)}
 else if(i===3){rr(-25,-28,50,66,15,'#a9bdcb');rr(-17,-34,34,7,3,'#303b4c');c.strokeStyle='#303b4c';c.lineWidth=5;c.beginPath();c.arc(20,3,20,-1.5,1.3);c.stroke();rr(-25,35,50,7,3,'#303b4c')}
 else if(i===4){rr(-29,-39,58,78,6,'#353c4c');rr(-21,-30,42,17,4,'#9da6b2');rr(-20,-8,40,35,4,'#151b24');rr(-12,6,24,18,4,'#eee9df');rr(-31,33,62,8,3,'#8d96a1')}
 else if(i===5){e(0,-11,23,28,'#f2efd7');rr(-12,12,24,23,4,'#aeb7c4');rr(-9,35,18,6,3,'#343b4b')}
 else if(i===6){rr(-26,-39,52,78,8,'#252b3a');for(let y of [-16,18]){e(0,y,16,16,col);e(0,y,8,8,'#222a36')}}
 else if(i===7){rr(-35,-13,23,47,6,col);rr(-31,-25,15,13,4,'#6d4966');rr(-5,-29,29,63,6,'#edb7c8');rr(0,-36,19,9,3,'#423645');rr(28,-8,13,42,3,'#eee5e6')}
 else if(i===8){rr(-38,-18,76,46,12,'#b9c3cc');rr(-30,-21,60,10,4,'#343b4a');rr(-24,-18,16,3,1,'#121721');rr(8,-18,16,3,1,'#121721');e(24,9,5,5,'#313a49')}
 else{rr(-47,-18,63,34,4,'#333b4a');for(let a=0;a<4;a++)for(let b=0;b<8;b++)rr(-43+b*7,-14+a*7,5,4,1,'#afb7c2');rr(25,-15,21,35,9,'#4c5769')}
 c.restore()
}
function listingPreview(i,detail){const el=document.createElement('div');el.className='listingPreview';let cv=document.createElement('canvas');cv.width=200;cv.height=150;const c=cv.getContext('2d');c.fillStyle='#efeff2';c.fillRect(0,0,200,150);productArt(c,200,150,i);const tx=document.createElement('span');tx.textContent=detail;el.append(cv,tx);$('taskContent').append(el)}

const ENV_MODEL='https://d2ol7oe51mr4n9.cloudfront.net/user_3JoVMcU64SCr3ZOXnqrL8fUEJOx/ce44665e-3e42-4a12-986e-26b601aa726c.glb';
const environmentKit=new Map();
const PRODUCT_ATLAS='https://d2ol7oe51mr4n9.cloudfront.net/user_3JoVMcU64SCr3ZOXnqrL8fUEJOx/7e4de1f5-eb9f-4bd4-823e-a14660d22814.jpg';
let productAtlas=null;
function loadProductAtlas(){
 return new Promise(resolve=>{const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{productAtlas=image;resolve(true)};image.onerror=()=>resolve(false);image.src=PRODUCT_ATLAS});
}
async function loadEnvironmentKit(){
 try{
  const gltf=await new GLTFLoader().loadAsync(ENV_MODEL);gltf.scene.updateMatrixWorld(true);
  for(const name of ['SOFA','TABLE','RACK','GATE','SHUTTER','PALLET','DESK','WALL','CARTON','FLOOR','ARCH','TRAINING','CUP',...Array.from({length:10},(_,i)=>'PRODUCT_'+String(i).padStart(2,'0'))]){
   const root=gltf.scene.getObjectByName('KIT_'+name);if(!root){if(['SOFA','TABLE','RACK','GATE','SHUTTER','PALLET','DESK','WALL','CARTON'].includes(name))throw Error('Missing asset '+name);continue}
   const inv=root.matrixWorld.clone().invert(),batches=new Map();
   root.traverse(o=>{if(!o.isMesh)return;const geo=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone());geo.applyMatrix4(inv.clone().multiply(o.matrixWorld));const key=o.material.uuid+'|'+Object.keys(geo.attributes).sort().map(k=>k+':'+geo.attributes[k].itemSize).join(',');let b=batches.get(key);if(!b)batches.set(key,b={material:o.material,geo:[]});b.geo.push(geo)});
   const result=new T.Group();result.name='Blender_'+name;
   for(const b of batches.values()){
    const geo=mergeGeometries(b.geo,false);
    if(geo){const m=new T.Mesh(geo,b.material);m.castShadow=true;m.receiveShadow=true;result.add(m)}
    else for(const g of b.geo){let m=new T.Mesh(g,b.material);m.castShadow=true;m.receiveShadow=true;result.add(m)}
   }
   environmentKit.set(name,result);
  }
  return true;
 }catch(e){console.warn('Warehouse kit fallback',e);environmentKit.clear();return false}
}
function mountKit(name,parent,x=0,y=0,z=0){
 const proto=environmentKit.get(name);if(!proto)return null;
 const g=proto.clone(true);g.position.set(x,y,z);parent.add(g);return g;
}
function mountProduct(index,parent,width,height,depth,baseY=0){
 const proto=environmentKit.get('PRODUCT_'+String(index).padStart(2,'0'));if(!proto)return null;
 const g=proto.clone(true);g.updateMatrixWorld(true);
 const bb=new T.Box3().setFromObject(g),size=bb.getSize(v(0,0,0)),center=bb.getCenter(v(0,0,0));
 if(size.y<=0||size.x<=0||size.z<=0)return null;
 const f=Math.min(width/size.x,height/size.y,depth/size.z);
 g.scale.setScalar(f);g.position.set(-center.x*f,baseY-bb.min.y*f,-center.z*f);
 parent.add(g);return g
}
function removeLegacy(root,keep=[]){for(const o of [...root.children])if(!keep.includes(o))root.remove(o)}

function makePallet(x,z,lane){const g=group(scene,x,0,z);for(let i=0;i<5;i++)box(g,.42,.12,2.0,-.9+i*.45,.18,0,mat(0xa16d3b,.9));for(let i=0;i<3;i++)box(g,2.2,.12,.27,0,.06,-.73+i*.73,0x785130);const cart=group(g,0,-.03,0);box(cart,2.38,.13,2.14,0,.09,0,0x323746);for(let a of [-1,1])for(let b of [-1,1]){let wh=cyl(cart,.12,.12,.11,a*1.02,.11,b*.83,0x16151c);wh.rotation.z=Math.PI/2}
 if(environmentKit.has('PALLET')){removeLegacy(g);mountKit('PALLET',g)}
 products.forEach((p,i)=>{let col=i%5,row=Math.floor(i/5),px=-.86+col*.43,pz=-.46+row*.91;let h=.55+((i*17)%4)*.10;const item=group(g,px,.25,pz);const tx=texture(512,512,(ctx,W,H)=>{const c=ctx;c.save();c.scale(2,2);W=256;H=256;c.fillStyle='#e9dfcd';c.fillRect(0,0,W,H);c.fillStyle=p[2];c.fillRect(0,0,W,45);c.fillStyle='#20162f';c.font='bold 22px Arial';c.fillText(p[0].slice(0,18),12,85);c.font='15px Arial';c.fillText(p[1],12,113);c.save();c.translate(57,113);productArt(c,142,99,i);c.restore();c.fillStyle='#222';for(let k=0;k<36;k++)if((k*i+k*3)%5>1)c.fillRect(18+k*3,221,2,20);c.font='12px Arial';c.fillText('SKU '+(1001+i),144,238);c.restore()});const bm=mat(0xc6ac86,.86);const face=new T.MeshStandardMaterial({map:tx,roughness:.72});const ms=[bm,bm,bm,bm,face,bm];const mesh=box(item,.39,h,.76,0,h/2,0,ms);if(environmentKit.has('CARTON')){mesh.visible=false;const shell=mountKit('CARTON',item);shell.scale.set(.39,h,.76);const panel=new T.Mesh(new T.PlaneGeometry(.363,h*.95),face);panel.position.set(0,h/2,.381);panel.receiveShadow=true;item.add(panel)}if(environmentKit.has('PRODUCT_'+String(i).padStart(2,'0'))){
  removeLegacy(item);const baseH=.14;
  const plinth=mountKit('CARTON',item);if(plinth)plinth.scale.set(.39,baseH,.76);else box(item,.39,baseH,.76,0,baseH/2,0,bm);
  const labelTex=texture(512,192,(c,w,h)=>{c.fillStyle='#e6dbca';c.fillRect(0,0,w,h);c.fillStyle=p[2];c.fillRect(0,0,12,h);c.fillStyle='#211d26';c.font='900 30px Arial';c.fillText(p[0].slice(0,23),27,43);c.font='22px Arial';c.fillText('SKU '+(1001+i),27,78);for(let n=0;n<50;n++)if((n*17+i)%5>1)c.fillRect(30+n*5,112,3,52);});
  plane(item,.365,.123,0,.073,.383,labelTex);
  mountProduct(i,item,.365,h-.15,.70,baseH+.006);
 }else{box(item,.045,.009,.76,0,h+.005,0,0xe0c79f);box(item,.39,.013,.045,0,h+.006,0,0xe0c79f);}
const marker=box(item,.38,.015,.74,0,h+.018,0,new T.MeshBasicMaterial({color:P.lime,transparent:true,opacity:.0}),false);productsMeshes[lane].push({g:item,marker,mesh,base:item.position.clone()});});return g}
function makeRack(x,z){const g=group(scene,x,0,z);if(mountKit('RACK',g))return g;for(const xx of [-1.05,1.05])for(const zz of [-.43,.43])box(g,.085,3.25,.085,xx,1.625,zz,mat(0x454454,.5,.7));for(let lev=0;lev<3;lev++){const y=.25+lev*1.13;box(g,2.2,.09,1.0,0,y,0,0x43485b);box(g,2.2,.07,.1,0,y+.06,.5,P.purple);for(let j=0;j<3;j++){box(g,.60,.64,.76,-.69+j*.69,y+.37,0,mat([0x9b7750,0xb69c77,0x7b685a][(j+lev)%3]));box(g,.26,.16,.012,-.69+j*.69,y+.4,.39,0xddd9ca,false)}}}
function makeDoor(x,lane){const g=group(scene,x,0,-6.9);box(g,4.35,.18,.5,0,3.95,0,mat(0x5a556b,.42,.7));for(let i of [-1,1]){box(g,.20,4.15,.55,i*2.17,2.07,0,mat(0x59556b,.45,.7));box(g,.08,3.95,.03,i*2.02,2,.28,P.purple)}box(g,4.1,3.8,.1,0,1.9,-.36,mat(0x08070e),false);const roll=group(g,0,0,0);for(let i=0;i<15;i++){box(roll,4.03,.245,.17,0,.13+i*.251,.07,mat(i%2===0?0x505467:0x45495b,.46,.62));box(roll,4.0,.018,.025,0,.25+i*.251,.18,0x777b8e,false)}if(environmentKit.has('GATE')){removeLegacy(g,[roll]);mountKit('GATE',g);removeLegacy(roll);mountKit('SHUTTER',roll)}doorGroups.push(roll);sign(g,lane?'TOR 02':'TOR 01',lane?'MANUELL':'CERTORO',2.6,.65,0,4.42,.33,lane?'#ffb46b':'#c6ff3d');const l=box(g,.75,.10,.14,0,3.85,.37,new T.MeshBasicMaterial({color:0xff544f}),false);laneLights.push(l)}
function desk(){const g=group(scene,4.7,0,3.15);box(g,2.1,.14,1.05,0,1.02,0,mat(0x383344,.5));for(let x of [-.85,.85])for(let z of [-.4,.4])box(g,.08,1,.08,x,.5,z,0x514e61);box(g,1.04,.64,.10,0,1.47,-.30,0x16141e);box(g,1.1,.08,.34,0,1.10,-.27,0x22202b);screenCanvas=document.createElement('canvas');screenCanvas.width=512;screenCanvas.height=320;screenTexture=new T.CanvasTexture(screenCanvas);screenTexture.colorSpace=T.SRGBColorSpace;const screenPlane=plane(g,.98,.57,0,1.47,-.241,screenTexture);box(g,.75,.04,.28,0,1.10,.27,0x17141e);for(let j=0;j<5;j++)box(g,.24,.025,.32,-.69,1.11+j*.024,.15,0xe8e6df);box(g,.27,.13,.18,.74,1.16,.05,0x252338);const chair=group(g,0,0,1.03);box(chair,.64,.13,.64,0,.46,0,0x30273b);box(chair,.62,.58,.13,0,.78,.30,0x30273b);cyl(chair,.07,.12,.38,0,.24,0,0x6b6673);for(let j=0;j<5;j++){let a=j*2*Math.PI/5;box(chair,.08,.065,.35,Math.sin(a)*.16,.07,Math.cos(a)*.16,0x55505f).rotation.y=a}if(environmentKit.has('DESK')){removeLegacy(g,[screenPlane]);mountKit('DESK',g)}}
function sofa(){let g=group(scene,-4.8,0,3.25);box(g,2.65,.34,.90,0,.27,0,mat(0x2b1947,.68));for(let j=0;j<3;j++){box(g,.78,.22,.78,-.8+j*.8,.42,.03,mat(0x513080,.8));box(g,.78,.66,.22,-.8+j*.8,.75,-.43,mat(0x623b9b,.78));}for(let k of [-1,1])box(g,.24,.63,1.12,k*1.3,.53,0,mat(0x382252,.8));box(g,2.55,.025,1.65,0,.02,.4,mat(0x4a3a6b,.94));let t=group(scene,-3.1,0,4.3);cyl(t,.42,.42,.09,0,.64,0,0x4f3c69);cyl(t,.07,.10,.62,0,.31,0,0x6b5b89);if(environmentKit.has('SOFA')){removeLegacy(g);mountKit('SOFA',g)}if(environmentKit.has('TABLE')){removeLegacy(t);mountKit('TABLE',t)}coffeeCup=group(t,.24,.76,-.20);if(!mountKit('CUP',coffeeCup)){cyl(coffeeCup,.075,.055,.15,0,0,0,0xf5f1e8);cyl(coffeeCup,.065,.065,.008,0,.078,0,0x573922);}sign(scene,'CERTORO LOUNGE','KI ARBEITET. DU NICHT.',2.8,.7,-4.8,2.85,2.60)}
function buildWorker(){const g=group(scene,3.1,0,2.25);const skin=mat(0xd99f73,.6),cloth=mat(0x344253,.8),vest=mat(0xe5a541,.65),shoe=mat(0x211c2b,.7);let torso=group(g,0,1.15,0);ell(torso,0,.25,0,.30,.40,.18,cloth);box(torso,.48,.48,.32,0,.27,0,vest);box(torso,.48,.065,.33,0,.40,0,0xf6db86);box(torso,.08,.46,.34,0,.25,0,cloth);box(torso,.16,.075,.015,.125,.36,.176,mat(0xf0e6d5,.5));box(torso,.15,.12,.015,-.145,.23,.176,cloth);ell(torso,0,.77,.015,.19,.23,.18,skin);ell(torso,0,.89,-.01,.20,.12,.18,0x42362e);const cap=ell(torso,0,.96,0,.21,.085,.20,0x45556b);box(torso,.29,.035,.19,0,.93,.15,0x45556b);for(let s of [-1,1])ell(torso,s*.069,.79,.16,.025,.021,.018,0x171822);ell(torso,0,.75,.185,.043,.035,.04,skin);let arms=[],legs=[];for(let s of [-1,1]){let arm=group(torso,s*.32,.52,0);ell(arm,0,-.15,0,.105,.21,.11,cloth);let fore=group(arm,0,-.31,0);ell(fore,0,-.15,0,.088,.18,.09,skin);ell(fore,0,-.30,.015,.09,.11,.07,skin);arms.push([arm,fore]);let leg=group(g,s*.14,1.15,0);ell(leg,0,-.25,0,.13,.29,.135,cloth);let shin=group(leg,0,-.51,0);ell(shin,0,-.22,0,.105,.25,.115,cloth);ell(shin,0,-.48,.07,.12,.095,.20,shoe);legs.push([leg,shin])}return {g,torso,arms,legs}}
// Graphics presets: automatic native-resolution scaling, plus explicit detail and economy modes.
const gfx={mode:'auto',ratio:1,average:16.7,frames:0,lastAdjust:0,ready:false,shadows:[],shadowTexture:null,lights:[],key:null};
try{const m=localStorage.getItem('certoro.graphics');if(['auto','high','eco'].includes(m))gfx.mode=m}catch{}
function qualityRatio(){
 const pixels=innerWidth*innerHeight,device=Math.max(1,devicePixelRatio||1);
 const budget=gfx.mode==='high'?8500000:gfx.mode==='eco'?1800000:4600000;
 return Math.max(.75,Math.min(device,gfx.mode==='high'?3:gfx.mode==='eco'?1.25:2.75,Math.sqrt(budget/pixels)));
}
function applyGraphics(force=false){
 const ratio=qualityRatio();
 if(force||!gfx.ready)gfx.ratio=ratio;
 renderer.setPixelRatio(gfx.ratio);renderer.setSize(innerWidth,innerHeight,false);
 if(gfx.key){const n=gfx.mode==='eco'?1024:gfx.mode==='high'?4096:2048;if(gfx.key.shadow.mapSize.x!==n){gfx.key.shadow.map?.dispose();gfx.key.shadow.map=null;gfx.key.shadow.mapSize.set(n,n);gfx.key.shadow.needsUpdate=true}}
 const label=$('quality');if(label){label.textContent={auto:'Auto',high:'HD',eco:'Eco'}[gfx.mode];label.title='Grafik: '+{auto:'automatisch',high:'maximale Details',eco:'flüssiger Betrieb'}[gfx.mode];label.setAttribute('aria-label',label.title+' – wechseln')}
 gfx.ready=true;
}
function adaptGraphics(ms){
 if(gfx.mode!=='auto'||!gfx.ready||document.hidden||state.paused||ms>200||ms<=0)return;
 gfx.average=lerp(gfx.average,ms,.035);gfx.frames++;
 if(gfx.frames<180||performance.now()-gfx.lastAdjust<4500)return;
 let target=gfx.ratio;
 if(gfx.average>32)target=Math.max(.85,gfx.ratio*.86);else if(gfx.average<18)target=Math.min(qualityRatio(),gfx.ratio*1.08);
 if(Math.abs(target-gfx.ratio)>.09){gfx.ratio=target;gfx.lastAdjust=performance.now();applyGraphics()}
 gfx.frames=0;
}
function addContactShadow(parent,sx,sz,strength=.5){
 if(!gfx.shadowTexture){gfx.shadowTexture=texture(128,128,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w*.5);g.addColorStop(0,'rgba(12,10,16,.85)');g.addColorStop(.35,'rgba(12,10,16,.50)');g.addColorStop(1,'rgba(12,10,16,0)');c.fillStyle=g;c.fillRect(0,0,w,h)})}
 const m=new T.Mesh(new T.PlaneGeometry(sx,sz),new T.MeshBasicMaterial({map:gfx.shadowTexture,transparent:true,opacity:strength,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,toneMapped:false}));
 m.rotation.x=-Math.PI/2;m.position.y=.006;parent.add(m);return m
}
function addWarehouseFinish(){
 // Material finish: native mipmaps and anisotropic filtering, plus a subtle concrete micro-relief.
 const maxAniso=Math.min(16,renderer.capabilities.getMaxAnisotropy());
 const materials=new Set();scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m)});
 const bump=texture(512,512,(c,w,h)=>{const im=c.createImageData(w,h);let seed=341;for(let i=0;i<w*h;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const z=118+(seed>>>25);im.data.set([z,z,z,255],i*4)}c.putImageData(im,0,0)});
 bump.colorSpace=T.NoColorSpace;bump.wrapS=bump.wrapT=T.RepeatWrapping;bump.repeat.set(8,8);
 for(const m of materials){for(const k of ['map','normalMap','roughnessMap','metalnessMap','bumpMap','aoMap'])if(m[k]){m[k].anisotropy=maxAniso;m[k].needsUpdate=true}
  if(!m.isMeshStandardMaterial)continue;const name=m.name.toLowerCase();
  if(name.includes('concrete')){m.bumpMap=bump;m.bumpScale=.012;m.roughness=.67;m.envMapIntensity=.8}
  if(name.includes('brushed steel')){m.roughness=.32;m.metalness=.74;m.envMapIntensity=1.2}
  if(name.includes('upholstery')||name.includes('textile')){m.roughness=.92;m.envMapIntensity=.42}
 }
 // Contact occlusion is anchored to scene objects and does not interfere with hit testing.
 for(const g of pallets){const q=addContactShadow(g,3.1,2.75,.67);q.position.y=.006}
 for(const x of [-8.48,8.48])for(const z of [-5.3,-1.8,1.8]){const q=addContactShadow(scene,2.8,1.85,.46);q.position.set(x,.007,z)}
 for(const [x,z,w,d] of [[-4.8,3.4,3.8,2.1],[-3.1,4.3,1.35,1.35],[4.7,4.1,2.9,1.6]]){const q=addContactShadow(scene,w,d,.48);q.position.set(x,.007,z)}
 gfx.shadows=[addContactShadow(scene,1.55,1.05,.72),addContactShadow(scene,1.08,.75,.62)];
 // Industrial architectural accents, placed against the rear wall and outside the play lanes.
 const steel=mat(0x48515c,.34,.65),dark=mat(0x242931,.65,.15),warm=mat(0xa8afb6,.57,.2);
 const lamp=new T.MeshStandardMaterial({color:0xe9f1fa,emissive:0xcfe8ff,emissiveIntensity:2.1,roughness:.5});
 for(const x of [-7.8,-2.6,2.6,7.8]){
  box(scene,2.05,.15,.32,x,5.22,-6.45,steel);box(scene,1.80,.045,.20,x,5.12,-6.45,lamp,false);
  box(scene,.045,.42,.045,x-.70,5.43,-6.45,steel);box(scene,.045,.42,.045,x+.70,5.43,-6.45,steel);
 }
 for(const x of [-9.49,9.49]){
  for(const z of [-5.4,-3.0,-.6,1.8]){box(scene,.10,.13,2.25,x,.32,z,steel);box(scene,.08,.065,2.25,x,.46,z,warm)}
 }
 // Two believable wall-mounted wayfinding panels; no extra objects on walk paths.
 for(const [x,label,sub,col] of [[-7.9,'WARENEINGANG','ZONE A · 01','#c6ff3d'],[7.9,'VERSAND','ZONE B · 02','#ffba6b']])sign(scene,label,sub,2.15,.52,x,3.42,-7.01,col);
 // Brighter rear glazing with neutral sky tint, while preserving the open top-down camera.
 const rim=new T.DirectionalLight(0xd6e5ff,.92);rim.position.set(-5,7,-5);scene.add(rim);
}
function updateContactShadows(){
 if(gfx.shadows.length!==2)return;
 const chars=[model,worker?.g];for(let i=0;i<2;i++){const p=chars[i];if(!p)continue;const q=gfx.shadows[i];q.visible=p.visible;q.position.set(p.position.x,.009,p.position.z);q.rotation.z=-p.rotation.y}
}
function polishCharacterMaps(root){if(!root)return;const max=Math.min(16,renderer.capabilities.getMaxAnisotropy());root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){for(const k of ['map','normalMap','roughnessMap','metalnessMap'])if(m[k]){m[k].anisotropy=max;m[k].needsUpdate=true}if(m.isMeshStandardMaterial)m.envMapIntensity=.87}})}

// Distance-driven supervisor gait, with smooth transitions and neutral idle breathing.
const workerMotion={last:null,phase:0,blend:0,angles:new Map()};
function polishWorkerMotion(dt,time){
 if(!worker?.meshy||!dt)return;
 const m=workerMotion,position=worker.g.position,previous=m.last||position.clone(),moved=position.distanceTo(previous);m.last=position.clone();
 const moving=state.phase==='playing'&&moved>.0015;
 m.phase+=Math.min(moved,.20)/.87;m.blend=lerp(m.blend,moving?1:0,1-Math.exp(-dt*9));
 const t=m.phase*Math.PI*2,g=m.blend,breath=Math.sin(time*1.8)*.012;
 for(let i=0;i<2;i++){
  const [th,sh]=worker.legs[i],[a,f]=worker.arms[i],p=t+(i?Math.PI:0);
  if(moving||g>.015){
   th.rotation.x=.29*g*Math.sin(p);sh.rotation.x=.38*g*Math.max(0,-Math.sin(p));
   a.rotation.x=lerp(a.rotation.x,-.20*Math.sin(p),g);
   f.rotation.x=lerp(f.rotation.x,-.12-.08*Math.cos(p),g);
  }
  // Damp transitions between instruction, work and walking poses.
  for(const b of [th,sh,a,f]){const q=m.angles.get(b)||b.rotation.clone();q.x=lerp(q.x,b.rotation.x,1-Math.exp(-dt*15));q.z=lerp(q.z,b.rotation.z,1-Math.exp(-dt*15));b.rotation.x=q.x;b.rotation.z=q.z;m.angles.set(b,q)}
  worker.feet[i].rotation.x=-.75*(th.rotation.x+sh.rotation.x);
 }
 worker.torso.rotation.x=state.phase==='playing'&&manualPose==='work'?.10:0;worker.torso.rotation.y=0;
}

// V25: studio-style directional illumination and a more tangible industrial set.
// No character geometry, mouth topology, grip or collision changes.
function cinematicFinish(){
 const concrete=texture(1024,1024,(c,w,h)=>{
  const im=c.createImageData(w,h);let seed=9341;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const grain=(seed>>>24)/255-.5;const v=119+7*Math.sin(x*.018)*Math.cos(y*.024)+5*Math.sin((x+y)*.043)+grain*15;const j=(y*w+x)*4;im.data[j]=v;im.data[j+1]=v+1;im.data[j+2]=v+3;im.data[j+3]=255}c.putImageData(im,0,0);
  // Fine forklift rubber traces and scuffs baked into the surface, not floating polygons.
  c.lineWidth=1.2;for(let i=0;i<110;i++){const x=(i*139.13)%w,y=(i*83.7)%h;c.strokeStyle=i%3?'rgba(38,37,39,.10)':'rgba(221,218,209,.15)';c.beginPath();c.moveTo(x,y);c.lineTo(x+8+(i%9)*7,y+Math.sin(i)*18);c.stroke()}
 });
 concrete.wrapS=concrete.wrapT=T.RepeatWrapping;concrete.repeat.set(3,3);concrete.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
 const seen=new Set();
 scene.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
  if(!m?.isMeshStandardMaterial||seen.has(m))continue;seen.add(m);const n=m.name.toLowerCase();
  if(n.includes('concrete')){m.map=concrete;m.color.setHex(0xc2c0bb);m.roughness=.76;m.bumpScale=.018;m.envMapIntensity=.35;m.needsUpdate=true}
  if(n.includes('graphite')||n.includes('charcoal')){m.color.multiplyScalar(.78);m.roughness=.48}
  if(n.includes('upholstery')||n.includes('textile')){m.roughness=.87;m.color.multiplyScalar(.82)}
 }});
 const steel=mat(0x414b56,.34,.65),brace=mat(0x68747e,.40,.57),dark=mat(0x303741,.63,.25),glass=mat(0x728995,.23,.39);
 // Shallow roof truss above the rear loading wall. No overhead geometry over the playing area.
 function strut(a,b,w,m){const A=v(...a),B=v(...b),d=B.clone().sub(A),c=A.clone().add(B).multiplyScalar(.5);const o=box(scene,w,d.length(),w,c.x,c.y,c.z,m);o.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());return o}
 for(const z of [-6.72,-5.98]){
  box(scene,19.1,.18,.18,0,5.50,z,steel);
  box(scene,19.1,.12,.16,0,5.98,z,steel);
  for(let x=-9;x<9;x+=1.5)strut([x,5.50,z],[x+1.5,5.98,z],.075,brace);
 }
 for(const x of [-9,-6,-3,0,3,6,9])strut([x,5.50,-6.72],[x,5.98,-5.98],.075,steel);
 // Architectural window band and lit recess between loading doors.
 for(const x of [-8.5,-6.8,0,6.8,8.5]){
  box(scene,1.36,.62,.045,x,4.84,-6.89,dark);
  for(const d of [-.32,.32])box(scene,.59,.50,.026,x+d,4.84,-6.855,glass,false);
 }
 // Wall-mounted industrial cable trays and bolts, outside collision routes.
 for(const x of [-9.35,9.35])for(const z of [-4.8,-1.8,1.2]){
  box(scene,.10,.14,2.55,x,2.76,z,steel);
  for(const dz of [-.95,.95])box(scene,.17,.20,.075,x,2.76,z+dz,brace);
 }
 // Low-key cinematic look with a brighter directional key and a distinct edge light.
 renderer.toneMappingExposure=.94;scene.environmentIntensity=.73;
 const main=gfx.key;main.color.setHex(0xffead4);main.intensity=3.15;main.position.set(-5.8,8.4,6.2);
 main.shadow.normalBias=.018;main.shadow.bias=-.00016;main.shadow.radius=3.5;
 scene.traverse(o=>{if(o.isHemisphereLight){o.intensity=.55;o.groundColor.setHex(0x51443e)}else if(o.isPointLight)o.intensity*=.68;else if(o.isDirectionalLight&&o!==main)o.intensity*=.72});
 const edge=new T.DirectionalLight(0xc0ddff,1.18);edge.position.set(5,5,-5);scene.add(edge);
 // A subtle secondary fill keeps Certoro's face readable even during the close-up.
 const portrait=new T.DirectionalLight(0xfff2e5,.46);portrait.position.set(1,3,8);scene.add(portrait);
}
// Refine the existing texture's contrast; preserve exact mascot design and mouth colors.
function refineMascotMaterial(root){
 const mesh=root.getObjectByName('HighDetailCertoro');if(!mesh||!mesh.material?.isMeshStandardMaterial)return;
 const m=mesh.material;m.roughness=.62;m.envMapIntensity=.80;
 const previous=m.onBeforeCompile; m.onBeforeCompile=function(shader,renderer){
  previous?.call(this,shader,renderer);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec3 base=diffuseColor.rgb;
   float lum=dot(base,vec3(.2126,.7152,.0722));
   vec3 rich=mix(vec3(lum),base,1.12);
   diffuseColor.rgb=clamp(pow(max(rich,vec3(.0001)),vec3(1.09))*1.055,0.0,1.0);
  `);
 };m.customProgramCacheKey=()=> 'certoro-v25-material';m.needsUpdate=true;
}

function warehouse(){scene.background=new T.Color(0x252c35);scene.fog=new T.Fog(0x252c35,30,65);const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.92;pmrem.dispose();const hem=new T.HemisphereLight(0xe6f0ff,0x6e6256,.88);scene.add(hem);const key=new T.DirectionalLight(0xfff0d9,2.75);key.position.set(-6,11,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-11;key.shadow.camera.right=11;key.shadow.camera.top=11;key.shadow.camera.bottom=-11;key.shadow.normalBias=.012;key.shadow.bias=-.00012;key.shadow.radius=3;key.shadow.camera.near=.5;key.shadow.camera.far=34;gfx.key=key;scene.add(key);const fill=new T.DirectionalLight(0xd7e7ff,.78);fill.position.set(7,6,-5);scene.add(fill);const floorTx=texture(1024,1024,(c,w,h)=>{
 const im=c.createImageData(w,h);let seed=317;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  seed=(seed*1664525+1013904223)>>>0;const n=(seed>>>24)/255;let value=77+13*Math.sin(x*.012)*Math.sin(y*.008)+10*Math.sin((x+y)*.031)+12*(n-.5);
  const i=(y*w+x)*4;im.data[i]=value;im.data[i+1]=value+3;im.data[i+2]=value+8;im.data[i+3]=255;
 }c.putImageData(im,0,0);c.strokeStyle='#282d36';c.lineWidth=3;c.strokeRect(1,1,w-2,h-2);
 c.strokeStyle='#a9acb238';c.lineWidth=1;c.strokeRect(5,5,w-10,h-10);
});floorTx.wrapS=floorTx.wrapT=T.RepeatWrapping;floorTx.repeat.set(5,4);if(!mountKit('FLOOR',scene))box(scene,20,.20,16,0,-.12,-.3,new T.MeshStandardMaterial({map:floorTx,roughness:.49,metalness:.08}),false);if(!mountKit('WALL',scene,0,2.7,-7.35))box(scene,20,5.4,.24,0,2.7,-7.35,0x292737);if(!mountKit('ARCH',scene))for(let x of [-9.8,-5.8,0,5.8,9.8]){box(scene,.22,5.4,.34,x,2.7,-7.13,mat(0x4a475a,.5,.6));if(Math.abs(x)>9)box(scene,.14,.22,14,x,5.75,-.35,0x545064)}if(!environmentKit.has('ARCH'))for(let z of [-6.2]){box(scene,19.5,.2,.14,0,5.70,z,0x5b536a);for(let x of [-5,5]){box(scene,3.4,.06,.14,x,5.52,z,new T.MeshBasicMaterial({color:0xf0e6ff}),false)}}for(let x of [-9.75,9.75]){box(scene,.20,2.5,14,x,1.25,-.25,0x302d42);for(let z of [-5.3,-1.8,1.8])makeRack(x*.87,z)}for(let x of [-3.25,3.25]){for(let xx of [-2.25,2.25])box(scene,.065,.008,9.8,x+xx,.002,-1.6,x<0?P.purple:0xc38e4c,false);box(scene,4.45,.008,.06,x,.002,3.27,x<0?P.purple:0xc38e4c,false)}for(let i=0;i<18;i++)box(scene,.06,.008,.31,0,.004,-6.4+i*.59,0xa39cb0,false);makeDoor(-3.25,0);makeDoor(3.25,1);pallets=[makePallet(-3.25,-8.6,0),makePallet(3.25,-8.6,1)];sofa();desk();worker=buildWorker();const beamMat=new T.MeshBasicMaterial({color:P.lime,transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide});scanBeam=box(scene,2.4,.025,2.1,-3.25,.85,-1.25,beamMat,false);scanBeam.visible=false;sign(scene,'WAR E N E I N G A N G'.replace(/ /g,''),'WAREHOUSE / 10 ARTIKEL JE PALETTE',5.0,.78,0,4.62,-6.97,'#d6c9ed')}

function enhanceWarehouse(){
 const metal=mat(0x434b5c,.36,.72),dark=mat(0x1c202d,.56,.38),rubber=mat(0x191a20,.87);
 const hazard=texture(256,64,(c,w,h)=>{c.fillStyle='#181923';c.fillRect(0,0,w,h);c.fillStyle='#e8b855';for(let i=-64;i<w;i+=48){c.beginPath();c.moveTo(i,0);c.lineTo(i+24,0);c.lineTo(i+88,h);c.lineTo(i+64,h);c.fill()}});
 hazard.wrapS=T.RepeatWrapping;hazard.repeat.x=5;
 const safety=new T.MeshStandardMaterial({map:hazard,roughness:.68});
 for(let x of [-3.25,3.25]){
  box(scene,4.05,.022,.30,x,.012,-6.53,safety,false);
  for(let k of [-1,1]){let bx=x+k*2.42;cyl(scene,.10,.12,.84,bx,.42,-6.14,mat(0xb98b32,.5,.35));cyl(scene,.14,.14,.045,bx,.025,-6.14,metal);cyl(scene,.105,.105,.12,bx,.68,-6.14,mat(0x252430,.5))}
  const lane=group(scene,x,0,-.1);box(lane,2.8,.018,.13,0,.012,1.7,safety,false);
 }
 if(!environmentKit.has('ARCH'))for(let k=0;k<16;k++){let x=-9.3+k*1.2;box(scene,.015,4.9,.028,x,2.5,-7.20,metal,false)}
 for(let x of [-7.0,7.0]){for(let z of [-4.3,.0,4.3]){box(scene,.12,3.0,.12,x,1.5,z,metal);box(scene,.24,.06,.24,x,.035,z,metal)}}
 for(let x of [-3.7,3.7])for(let z of [-4.6,1.0]){let l=new T.PointLight(0xfff1da,12,8,2);l.position.set(x,4.9,z);scene.add(l)}
 let rim=new T.DirectionalLight(0xc8d9ed,.65);rim.position.set(0,4,-8);scene.add(rim);
 // low profile electric transport platforms, status strips and wheel hubs
 pallets.forEach((g,i)=>{if(!environmentKit.has('PALLET'))box(g,2.40,.15,2.18,0,.10,0,dark);box(g,2.18,.046,.03,0,.15,1.09,new T.MeshBasicMaterial({color:i?0xffb46b:P.lime}),false);box(g,.35,.08,.026,0,.075,1.11,metal,false);for(let a of [-1,1]){let w=cyl(g,.11,.11,.035,a*1.10,.13,.83,metal,16);w.rotation.z=Math.PI/2}});
 // illuminated lane identification
 const ft=texture(1024,256,(c,w,h)=>{c.fillStyle='#ffffff00';c.clearRect(0,0,w,h);c.fillStyle='#bfb5d3';c.font='900 112px Arial';c.textAlign='center';c.fillText('FULFILLMENT  /  01',w/2,170)});let mark=plane(scene,5.5,1.3,0,.015,5.1,ft);mark.rotation.x=-Math.PI/2;
}
function batchWarehouse(){scene.updateMatrixWorld(true);const protectedRoots=new Set([...doorGroups,...pallets,...laneLights,worker.g,scanBeam,coffeeCup]);const batches=new Map();scene.traverse(o=>{if(!o.isMesh||Array.isArray(o.material)||!o.material?.isMeshStandardMaterial||o.material.transparent||o.material.map)return;for(let p=o;p;p=p.parent)if(protectedRoots.has(p))return;const key=o.material.uuid+'-'+o.castShadow+'-'+o.receiveShadow+'-'+Object.keys(o.geometry.attributes).sort().map(k=>k+':'+o.geometry.attributes[k].itemSize).join(',')+'-'+Boolean(o.geometry.index);if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o)});for(const list of batches.values()){if(list.length<3)continue;const geos=list.map(o=>o.geometry.clone().applyMatrix4(o.matrixWorld));const geo=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());if(!geo)continue;const m=new T.Mesh(geo,list[0].material);m.castShadow=list[0].castShadow;m.receiveShadow=list[0].receiveShadow;scene.add(m);for(const o of list)o.removeFromParent()}}
function updateScreen(){if(!screenCanvas)return;let c=screenCanvas.getContext('2d');c.fillStyle='#11101e';c.fillRect(0,0,512,320);c.fillStyle='#ffb46b';c.font='bold 28px Arial';c.fillText('ARTIKELANLAGE',22,42);c.fillStyle='#dad1e4';c.font='19px Arial';let i=Math.min(9,Math.floor(state.manualTime/180));c.fillText('SKU '+(1001+i)+' · '+products[i][0],22,82);c.fillStyle='#827497';for(let j=0;j<5;j++){c.fillRect(24,110+j*30,110,10);c.fillStyle='#322b46';c.fillRect(154,104+j*30,330,23);c.fillStyle='#827497'}c.fillStyle='#ffb46b';c.fillRect(22,278,468*clamp((state.manualTime%180)/180,0,1),9);screenTexture.needsUpdate=true}
// Dedicated, geometry-aware seated pose; model forward is +Z.
function makeSofaSitClip(T,rig,model,hipHeight=.71){
 const V=(x,y,z)=>new T.Vector3(x,y,z), bones=[];
 rig.traverse(b=>{if(b.isBone)bones.push(b)});
 const B=n=>rig.getObjectByName(n);
 const rest=bones.map(b=>({b,p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
 model.updateMatrixWorld(true);
 const worldQ=new Map(bones.map(b=>[b.name,b.getWorldQuaternion(new T.Quaternion())]));
 const worldPos=n=>B(n).getWorldPosition(V(0,0,0));
 const originalHip=worldPos('ThighL').y;
 const originalAnkle=worldPos('FootL').y;

 const root=B('Root');
 // Root has the rig's uniform scale; convert model-space lowering to bone-local units.
 root.position.y+=(hipHeight-originalHip)/rig.scale.y;
 model.updateMatrixWorld(true);
 function orient(b,q){const parentQ=b.parent.getWorldQuaternion(new T.Quaternion());b.quaternion.copy(parentQ.invert().multiply(q));model.updateMatrixWorld(true)}
 function aim(n,child,dir){const b=B(n),from=worldPos(child).sub(worldPos(n)).normalize();const delta=new T.Quaternion().setFromUnitVectors(from,dir.clone().normalize());orient(b,delta.multiply(b.getWorldQuaternion(new T.Quaternion())))}
 if(hipHeight!==.71)orient(B('Spine'),new T.Quaternion().setFromAxisAngle(V(1,0,0),.78).multiply(worldQ.get('Spine')));
 for(const side of ['L','R']){
  const sg=side==='L'?1:-1;
  const thigh='Thigh'+side,shin='Shin'+side,foot='Foot'+side;
  const hip=worldPos(thigh),l1=worldPos(shin).distanceTo(hip),l2=worldPos(foot).distanceTo(worldPos(shin));
  // A slight downward thigh slope, knees in front, shins nearly vertical, shoes flat.
  const kneeY=originalAnkle+l2*.985;
  const dy=kneeY-hip.y,dx=sg*.035;
  aim(thigh,shin,V(dx,dy,Math.sqrt(Math.max(.0001,l1*l1-dy*dy-dx*dx))));
  const knee=worldPos(shin), drop=originalAnkle-knee.y;
  aim(shin,foot,V(0,drop,Math.sqrt(Math.max(.0001,l2*l2-drop*drop))));
  orient(B(foot),worldQ.get(foot));
  // Lower arms beside torso, forearms angled toward thighs; fingers point forward.
  aim('UpperArm'+side,'Forearm'+side,V(sg*.065,-.25,.045));
  aim('Forearm'+side,'Hand'+side,V(-sg*.07,-.18,.125));
  const hand=B('Hand'+side),finger=B('Finger1'+side);
  const delta=new T.Quaternion().setFromUnitVectors(finger.getWorldPosition(V(0,0,0)).sub(hand.getWorldPosition(V(0,0,0))).normalize(),V(-sg*.15,-.45,.88).normalize());
  orient(hand,delta.multiply(hand.getWorldQuaternion(new T.Quaternion())));
 }
 const tracks=[];
 for(const b of bones){
  for(const [key,Cls,val] of [['position',T.VectorKeyframeTrack,b.position],['quaternion',T.QuaternionKeyframeTrack,b.quaternion],['scale',T.VectorKeyframeTrack,b.scale]]){
   const a=val.toArray();tracks.push(new Cls(b.name+'.'+key,[0,2],[...a,...a]))
  }
 }
 for(const a of rest){a.b.position.copy(a.p);a.b.quaternion.copy(a.q);a.b.scale.copy(a.s)}
 model.updateMatrixWorld(true);
 return new T.AnimationClip(hipHeight===.71?'SofaSit':'CoffeeBend',2,tracks)
}


const MESHY_WORKER_MODEL='https://d8j0ntlcm91z4.cloudfront.net/user_3JoVMcU64SCr3ZOXnqrL8fUEJOx/hf_20261125_201209_db50a227-7169-4452-8f8d-3dc03b6b8a94.glb';
// Meshy returned two disconnected characters with a single incorrectly shared skeleton.
// Keep only the negative-X character and fit an independent skeleton to its actual proportions.
function buildMeshyWorker(gltf){
 let source;gltf.scene.traverse(o=>{if(o.isSkinnedMesh&&!source)source=o});
 if(!source)throw Error('Meshy: keine Geometrie');
 const src=source.geometry,pp=src.attributes.position;
 if(!src.index||pp.count<1000)throw Error('Meshy: Geometrie unvollständig');
 const used=new Map(),ids=[],tri=[],ii=src.index;
 for(let i=0;i<ii.count;i+=3){
  const a=[ii.getX(i),ii.getX(i+1),ii.getX(i+2)];
  if(a.some(j=>pp.getX(j)>=-.03))continue;
  for(const j of a){if(!used.has(j)){used.set(j,ids.length);ids.push(j)}tri.push(used.get(j))}
 }
 if(ids.length<5000||ids.length>pp.count*.7)throw Error('Meshy: Figur nicht eindeutig separierbar');
 const geo=new T.BufferGeometry(),scale=2.16/1.7732842,centerX=-.275,centerZ=-.04;
 for(const [name,attr] of Object.entries(src.attributes)){
  if(name==='skinIndex'||name==='skinWeight'||name==='tangent')continue;
  const ar=new Float32Array(ids.length*attr.itemSize);
  for(let i=0;i<ids.length;i++){let j=ids[i];for(let k=0;k<attr.itemSize;k++)ar[i*attr.itemSize+k]=attr.array[j*attr.itemSize+k];if(name==='position'){ar[i*3]=(pp.getX(j)-centerX)*scale;ar[i*3+1]=(pp.getY(j)-.0000208)*scale;ar[i*3+2]=(pp.getZ(j)-centerZ)*scale}}
  geo.setAttribute(name,new T.BufferAttribute(ar,attr.itemSize,attr.normalized));
 }
 geo.setIndex(tri);geo.computeVertexNormals();geo.computeBoundingBox();
 const rig=new T.Group();rig.name='MESHY_WORKER_RIG';const bones=[],names={};
 const bone=(name,p,parent)=>{const b=new T.Bone();b.name=name;b.position.set(...p).multiplyScalar(scale);if(parent){b.position.sub(parent.userData.rest);parent.add(b)}else rig.add(b);b.userData.rest=v(...p).multiplyScalar(scale);names[name]=bones.length;bones.push(b);return b};
 const pelvis=bone('WorkerPelvis',[0,.86,0]),torso=bone('WorkerTorso',[0,1.05,0],pelvis),head=bone('WorkerHead',[0,1.50,.035],torso),jaw=bone('WorkerJaw',[0,1.615,.09],head);
 const arms=[],legs=[],feet=[];
 for(const [side,sg] of [['L',1],['R',-1]]){
  const a=bone('WorkerUpperArm'+side,[sg*.19,1.40,-.025],torso),f=bone('WorkerForearm'+side,[sg*.225,1.13,-.065],a);
  const th=bone('WorkerThigh'+side,[sg*.105,.86,-.025],pelvis),sh=bone('WorkerShin'+side,[sg*.12,.49,-.045],th),ft=bone('WorkerFoot'+side,[sg*.125,.10,-.045],sh);
  arms.push([a,f]);legs.push([th,sh]);feet.push(ft);
 }
 const ind=new Uint16Array(ids.length*4),weights=new Float32Array(ids.length*4);
 const sm=(a,b,x)=>{let t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
 for(let i=0;i<ids.length;i++){
  const j=ids[i],x=pp.getX(j)-centerX,y=pp.getY(j),z=pp.getZ(j)-centerZ,side=x>=0?'L':'R',w={};
  const put=(n,k)=>{w[n]=(w[n]||0)+Math.max(0,k)};
  const arm=sm(.145,.205,Math.abs(x))*sm(.91,1.06,y)*(1-sm(1.43,1.50,y));
  const leg=(1-sm(.78,.99,y))*(1-arm),body=1-arm-leg;
  const foot=1-sm(.10,.23,y),shin=1-sm(.42,.59,y);
  put('WorkerFoot'+side,leg*foot);put('WorkerShin'+side,leg*(1-foot)*shin);put('WorkerThigh'+side,leg*(1-foot)*(1-shin));
  const fore=1-sm(1.08,1.24,y);
  put('WorkerUpperArm'+side,arm*(1-fore));put('WorkerForearm'+side,arm*fore);
  const h=sm(1.46,1.56,y),pel=1-sm(.87,1.10,y);
  const jawm=h*(1-sm(1.605,1.64,y))*sm(1.53,1.56,y)*sm(.075,.125,z)*(1-sm(.045,.085,Math.abs(x)));
  put('WorkerJaw',body*jawm);put('WorkerHead',body*(h-jawm));put('WorkerPelvis',body*(1-h)*pel);put('WorkerTorso',body*(1-h)*(1-pel));
  const top=Object.entries(w).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=top.reduce((n,p)=>n+p[1],0)||1;
  top.forEach(([n,k],r)=>{ind[i*4+r]=names[n];weights[i*4+r]=k/sum});
 }
 geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(ind,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
 const mesh=new T.SkinnedMesh(geo,source.material);mesh.name='MeshySingleSupervisor';mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;rig.add(mesh);rig.updateMatrixWorld(true);mesh.bind(new T.Skeleton(bones));
 const old=worker.g;old.clear();old.add(rig);worker={g:old,torso,head,jaw,arms,legs,feet,rig,meshy:true,face:prepareWorkerMouth(mesh)};polishCharacterMaps(old);
 console.info('V16: single Meshy supervisor',ids.length,tri.length/3,bones.length);
}
function loadWorkerModel(){
 return new Promise(resolve=>{new GLTFLoader().load(MESHY_WORKER_MODEL,gltf=>{try{buildMeshyWorker(gltf);resolve(true)}catch(e){console.warn('Meshy-Lagerleiter:',e);resolve(false)}},undefined,e=>{console.warn('Meshy-Lagerleiter:',e);resolve(false)})});
}

function prepareWorkerMouth(mesh){
 const geo=mesh.geometry,p=geo.attributes.position;
 const open=new Float32Array(p.count*3),round=new Float32Array(p.count*3),spread=new Float32Array(p.count*3);
 const sm=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
 const cx=.010,cy=1.928;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i)-cx,y=p.getY(i),z=p.getZ(i),front=sm(.085,.135,z),width=1-sm(.036,.095,Math.abs(x));
  const seam=cy+.004*Math.min(1,(x/.047)**2),low=sm(1.81,1.889,y)*(1-sm(seam-.006,seam+.011,y));
  const upper=sm(seam-.008,seam+.010,y)*(1-sm(seam+.018,seam+.038,y));
  const k=front*width,lip=k*sm(seam-.046,seam-.015,y)*(1-sm(seam+.018,seam+.046,y));
  open[i*3+1]=k*(-.008*low+.002*upper);open[i*3+2]=-.004*k*low;
  round[i*3]=-x*.24*lip;round[i*3+2]=.009*lip;
  spread[i*3]=x*.25*lip;spread[i*3+1]=.004*lip;
 }
 geo.morphTargetsRelative=true;geo.morphAttributes.position=[open,round,spread].map(a=>new T.BufferAttribute(a,3));mesh.updateMorphTargets();
 const mouth={value:0},mouthRound={value:0},mouthSpread={value:0};
 const config={x:.010,y:1.928,z:.142,width:.037,height:.0105,depth:.022,front:.100};
 const head=mesh.skeleton.bones.find(b=>b.name==='WorkerHead');
 const oral=buildOralCavity(mesh,head,config);installMouthCut(mesh,config,{open:mouth,round:mouthRound,spread:mouthSpread});
 return {mesh,mouth,mouthRound,mouthSpread,oral,values:[0,0,0]};
}

function animateWorkerMouth(dt,talking){
 const f=worker.face;if(!f)return;
 const target=[0,0,0];
 if(talking&&!state.muted){
  const a=WORKER_SPEECH_FRAMES[voiceLine],t=voiceAudio?voiceAudio.currentTime:ac?Math.max(0,(ac.currentTime-voiceStartedAt)*voicePlaybackRate):0;
  if(a){const p=t/.02,k=Math.floor(p),fr=p-k;for(let j=0;j<3;j++)target[j]=lerp(a[k*3+j]||0,a[(k+1)*3+j]||0,fr)/100}
 }
 target[0]=Math.min(1,target[0]*1.4);
 const k=1-Math.exp(-Math.max(0,dt)*29);
 for(let j=0;j<3;j++){f.values[j]=lerp(f.values[j],target[j],k);f.mesh.morphTargetInfluences[j]=f.values[j]}
 f.mouth.value=f.values[0];f.mouthRound.value=f.values[1];f.mouthSpread.value=f.values[2];moveOralCavity(f.oral,f.values[0],f.values[1],f.values[2]);
}

function animateWorkerFace(time,dt=.016){
 if(!worker?.head)return;
 const talking=voicePlaying&&voiceWho==='Lagerleiter';
 worker.jaw.rotation.x=talking?-.12*Math.abs(Math.sin(time*12)):0;
 if(worker.meshy){for(const [a,f] of worker.arms){a.rotation.x=clamp(a.rotation.x,-.27,.27);a.rotation.z=clamp(a.rotation.z,-.09,.09);f.rotation.x=clamp(f.rotation.x,-.22,.22);}worker.jaw.rotation.x=0;animateWorkerMouth(dt,talking)}
 const instructing=state.phase==='intro'&&intro.step<4;
 worker.head.rotation.y=instructing?-.12+.045*Math.sin(time*2):.04*Math.sin(time*1.2);
 worker.head.rotation.x=state.phase==='playing'&&manualPose==='work'?.12:talking?.025*Math.sin(time*5):0;
 for(let i=0;i<2;i++){const [thigh,shin]=worker.legs[i];worker.feet[i].rotation.x=-.75*(thigh.rotation.x+shin.rotation.x);}
}

async function init(){renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2.5,Math.sqrt(3200000/(innerWidth*innerHeight))));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;scene=new T.Scene();camera=new T.PerspectiveCamera(43,1,.1,100);$('loading').textContent='Lagerhalle wird geladen …';const [kitReady]=await Promise.all([loadEnvironmentKit(),loadProductAtlas()]);warehouse();batchWarehouse();makeTraining();enhanceWarehouse();addWarehouseFinish();cinematicFinish();const workerReady=loadWorkerModel();resize();window.addEventListener('resize',resize);bindInput();updateScreen();loadCertoro(gltf=>{const rig=gltf.scene.getObjectByName('CERTORO_RIG');if(!rig)throw Error('Rig fehlt');model=group(scene);model.add(rig);rig.updateMatrixWorld(true);let bounds=new T.Box3().setFromObject(rig);let size=bounds.getSize(v(0,0,0));let scale=2.5/size.y;rig.scale.setScalar(scale);rig.position.y=-bounds.min.y*scale;model.position.copy(certPos);model.rotation.y=0;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material?.name==='Transparent cyan visor'){o.material.transparent=true;o.material.opacity=.28;o.material.depthWrite=false;if('transmission'in o.material)o.material.transmission=0}}});mixer=new T.AnimationMixer(rig);let clip=gltf.animations.find(x=>x.name==='CERTORO_RIG')||gltf.animations[0];if(clip){for(const [name,index]of Object.entries({idle:0,walk:1,sit:9,talk:13,wave:17,point:18,celebrate:22})){const sub=T.AnimationUtils.subclip(clip,name,index*48,index*48+47,24);actions[name]=mixer.clipAction(sub);actions[name].setLoop(T.LoopRepeat,Infinity)}}actions.sit=mixer.clipAction(makeSofaSitClip(T,rig,model));actions.sit.setLoop(T.LoopRepeat,Infinity);actions.coffeeBend=mixer.clipAction(makeSofaSitClip(T,rig,model,.74));actions.coffeeBend.setLoop(T.LoopRepeat,Infinity);prepareTripoPose(rig);polishCharacterMaps(model);refineMascotMaterial(model);play('idle');phoneModel=group(model);box(phoneModel,.17,.30,.035,0,0,0,0x14111f);box(phoneModel,.065,.073,.008,-.045,.098,-.021,0x292733);for(const y of [.078,.113]){const lens=cyl(phoneModel,.014,.014,.006,-.045,y,-.027,0x0b0d16,24);lens.rotation.x=Math.PI/2}buildPhotoScreen();phoneModel.position.set(.34,1.35,.30);phoneModel.visible=false;workerReady.then(ok=>{$('loading').classList.add('hidden');$('start').disabled=false;$('loadText').textContent='Certoro HD · Touch & Desktop';});},p=>{$('loading').textContent='3D-Modell wird geladen … '+(p.total?Math.round(p.loaded/p.total*100)+'%':'')},e=>{console.error(e);$('loading').textContent='3D-Modell konnte nicht geladen werden. Bitte Seite neu laden.'});requestAnimationFrame(loop)}
function resize(){let w=innerWidth,h=innerHeight;gfx.ratio=qualityRatio();applyGraphics(true);camera.aspect=w/h;camera.fov=w/h<.9?58:43;camera.updateProjectionMatrix()}
// V14: distance-driven two-bone foot placement and audio-timed facial shapes.
let tripoMotion=null, voiceStartedAt=0, voicePlaybackRate=1;
const WORKER_SPEECH_FRAMES={"0":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,55,80,0,55,80,2,55,80,6,55,80,3,55,80,2,55,80,3,27,21,14,0,0,0,63,0,1,78,0,1,72,0,1,65,80,0,89,65,0,100,19,0,95,55,0,55,80,0,55,80,0,55,80,0,59,80,0,58,80,0,57,52,1,55,0,0,55,40,0,55,80,0,50,73,0,41,36,0,35,30,0,31,45,0,21,30,0,7,0,10,6,0,8,21,0,5,25,0,23,19,0,30,38,0,23,56,16,13,56,37,9,56,16,7,56,12,4,36,0,0,11,9,0,9,0,5,19,0,26,19,0,25,52,0,3,57,0,0,57,39,0,56,54,0,56,60,0,58,59,0,65,67,0,67,63,0,62,34,0,28,33,0,16,20,0,20,25,0,30,38,0,40,46,0,40,47,0,35,44,0,46,25,0,40,22,0,38,24,0,31,27,1,21,7,0,6,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,7,55,80,1,55,80,8,55,0,13,55,0,10,45,0,70,30,0,46,27,0,41,7,0,11,0,0,0,0,0,0,17,0,25,36,0,52,36,0,37,48,67,19,66,80,2,96,53,2,100,33,3,90,49,21,73,79,20,57,80,9,55,80,6,55,80,4,45,66,1,38,56,1,55,80,6,55,80,6,55,80,4,55,80,1,47,59,0,40,12,6,49,70,9,55,80,3,55,80,6,55,80,12,55,80,19,55,80,15,56,80,6,56,80,19,56,80,38,56,66,30,57,54,3,56,8,2,47,0,2,32,0,1,14,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,43,63,1,55,80,3,55,78,6,55,80,6,55,69,8,53,0,1,45,0,0,49,0,3,55,71,13,55,80,15,55,80,3,55,80,3,55,60,7,55,0,8,55,0,5,55,0,7,50,16,20,54,0,6,55,0,3,55,47,6,55,80,12,55,80,5,55,80,4,57,80,10,60,63,10,37,31,2,51,25,2,66,24,1,78,5,1,58,4,5,56,0,4,41,0,0,15,0,0,0,0,0,24,0,33,24,0,37,35,0,54,55,80,2,55,80,9,50,26,14,31,0,1,8,0,4,26,0,32,30,0,33,43,0,7,55,25,10,55,68,9,51,70,12,36,45,5,26,35,1,30,2,3,23,0,2,41,0,7,53,9,4,62,24,6,55,78,0,55,80,0,55,80,0,53,76,0,46,67,0,40,57,3,33,48,1,32,46,2,35,50,12,35,50,6,33,48,6,32,47,8,30,43,11,27,37,16,24,33,22,18,26,10,8,12,8,0,0,0,15,22,0,22,31,0,25,35,0,26,37,0,26,34,5,28,0,3,0,0,0],"1":[0,0,0,0,0,0,0,0,0,12,0,18,16,0,24,23,0,32,58,77,2,61,80,2,57,80,1,50,72,11,35,51,19,42,61,42,55,80,11,55,80,5,56,80,2,59,80,4,61,80,6,60,80,2,59,80,0,57,80,0,55,79,1,39,56,23,51,0,77,50,0,77,26,0,40,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,21,0,14,48,68,0,60,80,0,61,48,0,51,0,1,27,0,1,38,0,18,50,35,1,58,18,0,51,0,0,34,0,0,36,0,0,39,0,4,41,0,4,56,0,4,75,0,5,65,0,1,61,0,1,44,0,2,32,0,34,7,0,6,0,0,0,12,0,17,15,0,23,47,69,8,55,80,1,55,74,1,55,73,1,55,80,2,55,80,1,55,80,2,54,41,4,38,0,2,50,7,1,59,0,1,55,0,0,55,0,0,55,0,0,55,0,0,55,0,0,48,0,1,47,10,4,55,15,3,55,34,6,55,42,14,55,57,7,55,68,3,55,80,2,55,80,1,46,58,0,38,55,1,39,57,7,54,78,4,55,73,5,55,54,9,55,49,8,55,53,2,55,49,2,52,0,0,45,0,3,47,0,5,54,5,1,55,0,2,54,0,3,52,0,79,43,0,67,25,0,36,5,0,7,0,0,0,0,0,0,10,0,2,13,0,2,0,0,0,20,5,1,48,22,0,66,21,0,61,59,0,55,66,0,48,63,2,65,14,32,58,38,0,61,44,0,58,28,0,58,2,0,28,0,0,14,0,1,35,0,3,30,0,13,0,0,0,17,0,23,17,0,20,4,6,0,0,0,0,0,0,0,15,0,5,51,0,21,86,0,3,75,0,3,76,0,5,68,31,13,60,49,17,58,69,16,56,80,5,52,75,1,44,64,1,38,12,1,29,30,7,15,21,5,13,0,18,20,0,29,27,0,42,30,0,47,25,0,38,14,0,21,18,15,5,20,18,4,18,11,5,15,10,4,11,13,6,7,6,5,3,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"2":[0,0,0,0,0,0,20,0,30,59,2,14,90,0,3,94,23,3,100,20,7,96,14,11,84,46,6,61,77,1,56,28,1,58,10,1,58,0,1,58,0,1,59,0,0,58,0,0,56,0,0,55,0,0,55,0,1,38,0,20,36,0,55,40,0,61,52,0,79,56,0,2,55,23,0,55,36,0,56,33,0,57,44,0,52,31,0,31,0,0,8,0,0,0,0,0,60,0,14,56,27,0,56,5,1,56,0,1,55,0,0,55,0,0,42,0,0,53,21,5,55,46,6,55,60,12,55,37,22,55,23,14,49,16,7,38,0,0,38,4,8,53,45,13,55,24,5,50,34,2,50,73,5,46,67,13,26,32,14,32,9,4,68,0,2,79,0,3,64,9,7,47,32,8,24,34,0,2,2,0,0,0,0,19,0,26,26,0,40,22,0,33,48,69,2,55,80,4,50,50,6,35,0,1,16,0,0,2,0,2,7,0,7,40,51,8,55,80,2,55,80,3,53,33,8,48,0,5,55,0,0,55,0,0,55,0,0,60,0,1,60,0,0,59,0,0,58,0,0,55,0,0,55,0,0,55,0,0,56,0,0,67,10,1,67,10,1,70,4,1,66,0,1,66,0,1,65,0,1,59,0,0,57,0,0,48,0,0,34,0,0,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,2,0,54,75,0,56,26,0,58,0,0,59,0,1,60,0,1,56,0,0,55,3,0,54,53,0,35,38,1,22,0,33,20,0,31,11,0,16,9,0,13,8,0,12,0,0,0,0,0,0,0,0,0,3,0,4,14,0,19,49,7,1,55,0,4,55,41,7,55,49,4,47,52,0,32,35,0,16,0,0,14,0,12,17,0,14,0,0,0,0,0,0,42,26,0,61,19,0,64,16,1,56,60,0,50,72,0,40,59,1,31,0,46,54,16,5,62,80,2,59,73,1,49,35,0,20,26,0,2,0,0,0,0,0,36,0,6,36,0,11,0,0,0,0,0,0,13,0,19,15,0,22,8,0,12,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,12,0,16,32,0,15,41,20,5,53,14,6,51,0,4,41,0,3,31,0,5,36,0,6,41,0,4,41,0,7,36,0,18,22,0,24,8,0,13,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,26,37,0,30,43,1,23,31,1,16,21,1,8,12,1,3,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"3":[0,0,0,0,0,0,0,0,0,40,58,1,55,48,0,55,44,1,55,70,3,56,80,16,56,80,13,58,80,5,54,75,3,33,48,1,0,0,0,0,0,0,0,0,0,13,0,18,17,0,25,21,0,26,21,0,30,17,0,26,13,0,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,9,21,0,32,26,0,41,30,0,47,28,0,43,20,0,22,0,0,0,28,1,1,53,0,1,81,5,1,87,5,1,85,1,3,68,15,19,57,26,20,56,33,10,56,50,11,56,43,9,38,0,0,40,0,0,55,0,0,55,0,0,55,0,0,55,9,0,55,11,0,55,20,0,46,0,0,49,0,3,55,26,3,55,33,3,55,47,1,55,64,1,55,58,4,55,44,6,55,38,6,56,12,19,56,16,15,56,22,7,52,62,3,25,28,0,3,0,0,0,0,0,0,0,0,0,0,0,14,0,15,25,0,34,29,0,44,24,0,37,28,0,42,55,80,1,55,80,1,55,80,2,55,80,1,50,31,2,31,0,1,6,2,0,0,0,0,0,0,0,23,0,25,27,0,32,15,0,22,40,37,5,55,42,1,55,45,1,55,39,2,55,37,3,55,34,2,55,21,2,54,18,1,50,5,1,43,6,1,33,7,1,21,28,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,25,6,1,48,5,0,57,30,0,58,80,0,56,80,0,55,80,0,55,80,0,48,11,0,27,0,33,17,0,25,4,0,6,0,0,0,0,0,0,0,0,0,6,0,3,39,26,1,51,16,1,55,0,2,54,0,32,44,0,68,35,0,54,36,0,55,38,0,59,32,0,35,26,0,17,0,0,0,31,17,3,61,30,2,74,4,2,72,0,2,68,0,6,41,0,53,33,20,49,29,22,43,27,22,39,24,29,22,20,19,11,16,24,0,15,22,0,25,0,14,27,7,1,30,18,0,33,2,0,26,13,0,17,4,0,0,0,0,6,8,1,6,9,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"6":[0,0,0,0,0,0,0,0,0,0,0,0,28,0,0,47,0,0,55,0,4,55,0,1,55,79,1,55,80,1,55,80,3,55,80,4,55,80,6,55,80,6,55,80,4,41,60,0,51,74,9,55,80,2,56,80,6,58,77,22,61,77,1,51,48,0,44,0,0,41,0,0,46,0,2,61,27,0,63,14,0,46,3,0,29,0,0,14,0,0,6,0,0,54,0,1,61,0,1,44,0,1,70,1,2,69,3,0,85,9,1,81,19,0,63,47,0,56,55,0,56,56,0,55,65,0,55,30,0,47,0,8,17,0,0,0,0,0,15,0,18,19,0,28,15,0,23,7,0,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17,0,23,25,0,39,34,0,49,33,0,50,30,0,44,24,0,36,51,1,3,55,75,8,55,80,7,55,80,7,55,80,5,54,78,4,51,74,8,54,77,6,55,80,0,55,80,0,50,72,0,34,48,0,11,0,1,23,0,12,24,0,13,3,0,0,0,0,0,39,15,0,69,24,1,67,26,1,55,0,0,55,4,0,55,4,11,56,26,12,60,75,2,61,52,1,39,19,0,18,3,0,0,0,0,0,0,0,24,0,3,31,0,13,10,0,15,0,0,0,0,0,0,14,0,19,18,0,27,18,0,28,21,30,8,19,9,19,13,13,9,10,4,8,4,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,29,0,0,47,3,6,55,58,14,56,54,14,56,22,41,63,46,22,73,38,14,78,0,11,79,0,4,74,13,3,60,0,1,37,0,0,15,16,6,0,0,0,15,0,20,26,0,35,31,0,47,38,0,59,54,16,1,57,48,1,43,23,2,26,18,25,20,24,6,24,15,7,36,13,2,51,35,5,55,56,5,55,47,8,56,36,16,56,37,23,56,33,1,61,7,2,57,0,27,49,0,73,39,0,60,42,0,64,35,0,54,20,0,30,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,30,0,2,60,0,2,97,0,2,100,0,2,69,9,2,58,51,0,58,68,0,65,47,2,60,5,2,66,0,1,74,0,2,42,0,0,35,0,0,56,0,1,73,6,2,62,47,2,55,80,0,56,80,0,55,80,0,55,80,0,55,80,0,46,66,38,54,79,3,56,76,0,54,77,0,50,72,0,42,61,0,37,46,1,42,56,0,49,66,0,50,68,0,49,65,0,50,67,0,57,69,0,42,43,0,24,25,7,15,0,21,25,0,38,41,30,4,48,69,1,40,56,2,29,0,27,12,0,15,9,0,12,18,0,26,19,0,25,34,0,47,50,13,16,56,10,73,58,15,37,70,0,6,90,2,3,70,50,2,54,39,1,38,0,1,12,0,0,0,0,0,11,0,11,9,0,14,36,41,4,43,25,6,41,28,6,41,46,1,34,29,0,17,0,26,1,0,2,5,0,7,8,0,13,7,0,11,3,0,4,0,0,0,0,0,0,0,0,0],"8":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,44,64,6,55,80,11,55,40,5,55,0,2,44,0,39,28,0,41,29,0,40,13,1,19,0,0,0,0,0,0,44,0,42,55,80,2,55,80,5,56,80,3,56,80,1,55,80,0,55,80,0,55,80,0,55,80,0,55,80,0,57,80,0,62,80,0,77,80,0,80,18,0,40,0,0,13,0,3,24,0,6,10,0,15,0,0,0,0,0,0,18,0,26,41,60,1,56,75,1,64,65,0,70,28,1,67,19,0,50,0,0,48,0,0,46,0,0,44,0,0,56,0,1,70,11,0,85,0,0,77,0,1,84,0,1,78,0,1,64,0,2,59,0,15,56,0,28,54,0,9,53,2,8,55,21,4,55,19,2,53,14,3,46,6,2,40,0,0,38,7,0,36,3,10,45,0,2,51,2,0,51,33,1,44,52,3,31,45,8,26,36,7,26,34,4,49,0,3,57,20,1,58,40,2,49,22,2,34,46,11,16,24,0,0,0,0,13,0,15,19,0,24,15,0,22,39,0,56,55,0,1,55,41,10,50,42,7,34,50,1,12,12,0,0,0,0,0,0,0,21,0,21,48,0,2,56,42,2,55,64,2,55,69,3,49,36,2,31,4,2,6,0,1,0,0,0,0,0,0,0,0,0,1,0,0,35,0,5,90,0,3,74,0,33,67,0,39,61,37,28,58,71,14,57,80,6,55,80,0,55,80,0,52,75,0,30,44,1,13,0,11,19,0,28,32,0,49,33,0,51,24,0,34,29,0,21,47,20,3,58,80,4,56,80,4,55,80,2,55,80,0,55,80,0,42,32,0,25,29,0,17,15,1,24,0,2,49,0,2,83,0,5,100,9,3,59,80,1,56,80,0,55,80,0,40,57,1,18,23,7,19,0,8,28,0,43,29,0,45,24,0,36,19,0,6,37,34,3,43,58,2,40,37,1,30,0,2,26,5,3,22,6,3,23,0,22,26,18,10,26,9,11,24,7,19,22,8,16,20,2,31,19,3,25,17,0,26,13,0,20,1,0,0,0,0,0,0,0,0,12,17,1,17,1,1,16,15,0,15,13,1,14,13,1,11,15,1,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]};
const SPEECH_FRAMES={"4":[0,0,0,0,0,0,0,0,0,17,1,26,10,5,11,5,3,6,1,1,1,3,2,3,11,5,11,24,12,25,46,12,12,100,6,25,37,2,9,1,1,2,1,1,2,5,3,5,4,2,4,1,0,1,0,0,0,28,2,44,40,3,64,33,9,9,16,4,4,8,4,8,6,3,6,0,0,0,0,0,0,100,6,25,100,6,25,46,12,12,46,12,12,36,9,9,26,7,7,27,2,43,22,1,34,13,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"5":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,33,2,52,46,3,73,36,2,58,18,5,5,19,5,5,40,10,10,43,11,11,26,7,7,70,4,18,82,5,20,11,6,12,3,1,3,2,1,2,1,0,1,0,0,0,1,0,2,41,11,11,46,12,12,23,12,24,12,6,13,16,8,17,46,12,12,57,85,3,44,66,2,7,3,7,3,1,3,1,1,2,1,0,1,4,0,6,27,2,43,41,11,11,43,11,11,37,10,10,90,5,23,90,5,22,40,3,64,46,3,73,46,3,73,45,12,12,45,12,12,39,10,10,17,8,17,14,7,15,5,3,6,5,0,1,3,0,1,4,0,1,75,5,19,24,12,25,20,10,21,11,5,11,8,0,12,6,0,9,13,1,20,29,7,7,34,9,9,31,8,8,27,7,7,23,6,6,20,3,3,7,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,6,8,8,12,7,7,11,3,3,4,1,1,2,0,0,0,24,2,38,34,2,54,42,11,11,45,12,12,39,10,10,36,9,9,42,3,67,46,12,12,45,3,71,30,2,48,28,2,44,100,6,25,46,12,12,46,12,12,24,12,25,35,2,56,29,2,46,12,1,19,1,1,1,5,5,7,79,5,20,56,3,14,28,2,7,0,0,0,0,0,0,18,5,5,31,2,50,46,3,73,46,3,73,39,3,62,22,11,23,24,12,25,24,12,25,24,12,25,20,10,21,8,4,9,10,1,16,8,0,12,30,2,48,46,3,73,43,3,68,60,9,7,45,7,6,17,2,2,17,3,2,8,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"7":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,23,11,24,24,12,25,22,11,23,11,6,11,7,3,7,7,4,8,3,1,3,0,0,0,0,0,0,46,3,73,46,12,12,46,12,12,46,12,12,44,11,11,16,8,17,6,3,7,8,1,13,7,0,11,5,0,8,26,2,41,46,12,12,46,12,12,46,12,12,24,12,25,24,12,25,24,12,25,24,12,25,26,2,42,7,0,12,0,0,0,0,0,0,0,0,0,14,4,4,18,5,5,16,4,4,9,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,12,0,19,29,1,22,33,1,28,42,1,29,2,46,35,2,56,42,3,66,34,2,55,23,34,1,37,2,9,93,6,23,46,3,73,46,3,73,46,3,73,21,11,22,14,7,14,6,3,6,1,0,1,0,0,0,0,0,0,0,0,0,5,2,5,7,4,8,6,3,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,18,1,22,33,1,25,37,1,26,39,1,25,37,1,21,31,1,15,22,1,19,3,2,20,3,3,15,2,2,4,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]};
// Use welded mesh connectivity, not just X/Y thresholds, to distinguish the actual
// free-standing arms from pockets, trousers and tail. UV seams share the same weights.
function repairTripoArms(mesh,bones){
 const g=mesh.geometry,p=g.attributes.position,j=g.attributes.skinIndex,w=g.attributes.skinWeight,n=p.count;
 const weld=new Map(),ids=new Int32Array(n),pos=[];
 for(let i=0;i<n;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),key=[x,y,z].map(t=>Math.round(t*100000)).join(',');let k=weld.get(key);if(k===undefined){k=pos.length;weld.set(key,k);pos.push([x,y,z])}ids[i]=k}
 const par=Int32Array.from(pos,(_,i)=>i),size=new Int32Array(pos.length).fill(1);
 function find(i){while(par[i]!==i){par[i]=par[par[i]];i=par[i]}return i}
 function join(a,b){if(pos[a][1]>=2.1||pos[b][1]>=2.1)return;a=find(a);b=find(b);if(a===b)return;if(size[a]<size[b])[a,b]=[b,a];par[b]=a;size[a]+=size[b]}
 for(let i=0;i<g.index.count;i+=3){const a=ids[g.index.getX(i)],b=ids[g.index.getX(i+1)],c=ids[g.index.getX(i+2)];join(a,b);join(b,c);join(c,a)}
 const stats=new Map();
 for(let i=0;i<pos.length;i++){const a=pos[i];if(a[1]>=2.1)continue;const k=find(i),s=stats.get(k)||{n:0,x:0,min:Infinity,max:-Infinity};s.n++;s.x+=a[0];s.min=Math.min(s.min,a[0]);s.max=Math.max(s.max,a[0]);stats.set(k,s)}
 const arms=new Map();for(const [k,s] of stats){if(s.n>100&&s.min>.40)arms.set(k,'L');if(s.n>100&&s.max<-.40)arms.set(k,'R')}
 const names=mesh.skeleton.bones.map(b=>b.name),ix=n=>names.indexOf(n),sm=(a,b,x)=>motionSmooth(a,b,x);
 const isArm=k=>/^(UpperArm|Forearm|Hand|Finger)/.test(names[k]||'');
 const out=new Map();let changed=0;
 for(let i=0;i<n;i++){
  const y=p.getY(i);if(y>=2.24||y<1.18)continue;
  const k=ids[i];if(out.has(k)){const a=out.get(k);j.setXYZW(i,...a.j);w.setXYZW(i,...a.w);continue}
  const oldJ=[j.getX(i),j.getY(i),j.getZ(i),j.getW(i)],oldW=[w.getX(i),w.getY(i),w.getZ(i),w.getW(i)];
  const side=y<2.1?arms.get(find(k)):null;
  const map=new Map(),add=(b,t)=>{if(t>0&&b>=0)map.set(b,(map.get(b)||0)+t)};
  if(y<2.1&&side){
   const h=1-sm(1.54,1.78,y),u=sm(1.88,2.13,y);
   add(ix('Hand'+side),h);add(ix('Forearm'+side),(1-h)*(1-u));add(ix('UpperArm'+side),(1-h)*u);
  }else if(y<2.1){
   for(let q=0;q<4;q++)if(!isArm(oldJ[q]))add(oldJ[q],oldW[q]);
   if(!map.size)add(ix(y<1.88?'Pelvis':'Spine'),1);
  }else{
   for(let q=0;q<4;q++)add(oldJ[q],oldW[q]);
  }
  const a=[...map].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=a.reduce((s,x)=>s+x[1],0)||1;while(a.length<4)a.push([0,0]);
  const rec={j:a.map(x=>x[0]),w:a.map(x=>x[1]/sum)};out.set(k,rec);j.setXYZW(i,...rec.j);w.setXYZW(i,...rec.w);changed++;
 }
 // Laplacian relaxation over the welded surface, constrained to the same anatomical
 // components below the shoulder. This removes isolated high-gradient weights.
 const N=pos.length,B=names.length,adj=Array.from({length:N},()=>[]);
 const links=new Set();
 for(let i=0;i<g.index.count;i+=3){const t=[ids[g.index.getX(i)],ids[g.index.getX(i+1)],ids[g.index.getX(i+2)]];for(let k=0;k<3;k++){let a=t[k],b=t[(k+1)%3];if(a===b)continue;if(a>b)[a,b]=[b,a];const key=a*N+b;if(links.has(key))continue;links.add(key);adj[a].push(b);adj[b].push(a)}}
 // Multi-source geodesic distances measured on the actual welded surface.
 // At the armpit this avoids jumping across the air gap between arm and torso.
 function distances(seed){
  const d=new Float64Array(N).fill(Infinity),heap=[];
  const push=(k,v)=>{let i=heap.length;heap.push([k,v]);while(i){const p=(i-1)>>1;if(heap[p][1]<=v)break;heap[i]=heap[p];i=p}heap[i]=[k,v]};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][1]<heap[c][1])c++;if(heap[c][1]>=last[1])break;heap[i]=heap[c];i=c}heap[i]=last}return top};
  for(let k=0;k<N;k++)if(seed(k)){d[k]=0;push(k,0)}
  while(heap.length){const [k,c]=pop();if(c!==d[k]||c>1.2)continue;const p=pos[k];for(const q of adj[k]){const a=pos[q],nd=c+Math.hypot(a[0]-p[0],a[1]-p[1],a[2]-p[2]);if(nd<d[q]&&nd<=1.2){d[q]=nd;push(q,nd)}}}return d
 }
 const armDist=distances(k=>pos[k][1]>=1.77&&pos[k][1]<2.025&&arms.has(find(k)));
 const bodyDist=distances(k=>{const [x,y,z]=pos[k];return y>1.76&&y<2.02&&!arms.has(find(k))||y>=2.04&&y<2.78&&Math.abs(x)<.26||y>=2.70&&y<2.90});
 let current=new Float32Array(N*B),next=new Float32Array(N*B),done=new Uint8Array(N),relax=[];
 for(let i=0;i<n;i++){const k=ids[i];if(done[k])continue;done[k]=1;const js=[j.getX(i),j.getY(i),j.getZ(i),j.getW(i)],ws=[w.getX(i),w.getY(i),w.getZ(i),w.getW(i)];for(let q=0;q<4;q++)current[k*B+js[q]]+=ws[q]}
 for(let k=0;k<N;k++){const [x,y,z]=pos[k];if(y>=2.025&&y<2.78&&Math.abs(x)>.25&&Number.isFinite(armDist[k])&&Number.isFinite(bodyDist[k])){
  const blend=motionSmooth(0,1,bodyDist[k]/Math.max(.0001,armDist[k]+bodyDist[k]));
  const base=k*B,side=x>=0?'L':'R',old=[];let sum=0;
  for(let b=0;b<B;b++)if(!isArm(b)){old[b]=current[base+b];sum+=old[b]}else old[b]=0;
  if(sum<.001){old[ix(y>2.22?'Chest':'Spine')]=1;sum=1}
  for(let b=0;b<B;b++)current[base+b]=(old[b]||0)/sum*(1-blend);
  const elbow=1-motionSmooth(2.00,2.20,y);
  current[base+ix('UpperArm'+side)]+=blend*(1-elbow);current[base+ix('Forearm'+side)]+=blend*elbow;
 }}
 for(let k=0;k<N;k++){const [x,y,z]=pos[k];if(y>1.14&&y<2.78&&Math.abs(x)>.25&&adj[k].length){const ar=y<2.1&&arms.has(find(k)),lock=ar&&y<1.51;if(!lock)relax.push(k)}}
 const allow=(k,b)=>{const y=pos[k][1];if(y>=2.025)return true;const side=arms.get(find(k));return side?names[b].endsWith(side)&&isArm(b):!isArm(b)};
 for(let pass=0;pass<18;pass++){next.set(current);for(const k of relax){const base=k*B,ns=adj[k],ratio=.58;let sum=0;for(let b=0;b<B;b++){let t=0;for(const q of ns)t+=current[q*B+b];const val=allow(k,b)?current[base+b]*(1-ratio)+ratio*t/ns.length:0;next[base+b]=val;sum+=val}if(sum>1e-6)for(let b=0;b<B;b++)next[base+b]/=sum;else next.set(current.subarray(base,base+B),base)}[current,next]=[next,current]}
 const result=new Map();
 for(let i=0;i<n;i++){const k=ids[i],y=pos[k][1];if(y<=1.14||y>=2.78||Math.abs(pos[k][0])<=.25)continue;
  let a=result.get(k);if(!a){const pairs=[];for(let b=0;b<B;b++)if(current[k*B+b]>.0001)pairs.push([b,current[k*B+b]]);pairs.sort((a,b)=>b[1]-a[1]);pairs.length=Math.min(4,pairs.length);const total=pairs.reduce((t,a)=>t+a[1],0)||1;while(pairs.length<4)pairs.push([0,0]);a={j:pairs.map(x=>x[0]),w:pairs.map(x=>x[1]/total)};result.set(k,a)}j.setXYZW(i,...a.j);w.setXYZW(i,...a.w)
 }
 j.needsUpdate=true;w.needsUpdate=true;return {components:arms.size,changed};
}
// Rest palm centers are actual mesh positions, transformed into each wrist's bind space.
function makePalmAnchors(mesh,bones){
 mesh.updateWorldMatrix(true,false);
 for(const [side,sg] of [['L',1],['R',-1]]){
  const hand=bones['Hand'+side].b;hand.updateWorldMatrix(true,false);
  const p=mesh.localToWorld(v(sg*.60,1.495,.055));bones['Hand'+side].palm=hand.worldToLocal(p);
 }
}
function palmWorld(side){const b=tripoMotion.bones['Hand'+side];return b.b.localToWorld(b.palm.clone())}
// A shared rigid grip frame is defined in the original glove's bind coordinates.
// Unlike the old independent world-space offsets, both object and palm use this frame.
function setupGripFrames(mesh,bones){
 for(const [side,sg] of [['R',-1],['L',1]]){
  const h=bones['Hand'+side],hand=h.b;hand.updateWorldMatrix(true,false);
  // Inward glove surface, between curled fingers and thumb, rather than wrist center.
  h.contact=hand.worldToLocal(mesh.localToWorld(v(sg*.535,1.475,.038)));
  h.restHandQ=h.wq.clone();
  h.restPalmNormal=v(-sg,0,0);
  h.restFinger=v(0,-1,0);
 }
}
function gripPose(side,normal,finger){
 const h=tripoMotion.bones['Hand'+side],f=finger.clone().normalize(),n=normal.clone().addScaledVector(f,-normal.dot(f)).normalize();
 const right=f.clone().cross(n).normalize(),basis=new T.Matrix4().makeBasis(right,f,n);
 const sr=h.restFinger.clone().cross(h.restPalmNormal).normalize();
 const source=new T.Matrix4().makeBasis(sr,h.restFinger,h.restPalmNormal);
 const q=new T.Quaternion().setFromRotationMatrix(basis).multiply(new T.Quaternion().setFromRotationMatrix(source).invert()).multiply(h.restHandQ);
 return {q,normal:n,finger:f,right};
}
function gripPoint(side){const h=tripoMotion.bones['Hand'+side];return h.b.localToWorld(h.contact.clone())}
function gripWristTarget(side,point,q){
 const h=tripoMotion.bones['Hand'+side],s=h.b.getWorldScale(v(0,0,0));
 return point.clone().sub(h.contact.clone().multiply(s).applyQuaternion(q));
}
function applyGrip(side,point,pose,weight=1){
 const h=tripoMotion.bones['Hand'+side],hand=h.b;
 aimCoffeeArm(side,gripWristTarget(side,point,pose.q),weight);
 const q=hand.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(pose.q);
 hand.quaternion.slerp(q,weight);model.updateMatrixWorld(true);
 return gripPoint(side)
}
function setWorldPose(obj,point,q){
 const par=obj.parent;par.updateWorldMatrix(true,false);
 obj.position.copy(par.worldToLocal(point.clone()));
 obj.quaternion.copy(par.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));obj.updateMatrixWorld(true);
}

function alignPalm(side,dir,weight=1){
 const h=tripoMotion.bones['Hand'+side],hand=h.b,world=hand.getWorldQuaternion(new T.Quaternion());
 const from=h.palm.clone().normalize().applyQuaternion(world);
 const q=new T.Quaternion().setFromUnitVectors(from,dir.clone().normalize()).multiply(world);
 const local=hand.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q);
 hand.quaternion.slerp(local,weight);model.updateMatrixWorld(true);
}

// Actual visible 3D oral cavity: cut away the front shell at the animated lip seam,
// and reveal recessed sculpted geometry (not a dark color painted over the face).
function buildOralCavity(mesh,head,config){
 const {x,y,z,width,height,depth}=config,root=new T.Group();root.name='PhysicalOralCavity';
 mesh.updateWorldMatrix(true,false);head.updateWorldMatrix(true,false);
 const bind=head.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
 bind.decompose(root.position,root.quaternion,root.scale);head.add(root);
 const pocket=new T.Group();root.add(pocket);pocket.position.set(x,y,z);
 const material=(col,r=.55)=>new T.MeshStandardMaterial({color:col,roughness:r,metalness:0,side:T.DoubleSide});
 const inside=material(0x471b22,.74),gum=material(0x8a4647,.52),tooth=material(0xd8c9af,.38),tongue=material(0x985050,.49);
 // Recessed bowl, elliptical rim and domed inner throat. Its front edge is always
 // behind the original lips, so closed lips occlude everything.
 const N=40,R=8,verts=[],indices=[];
 for(let j=0;j<=R;j++){const r=Math.max(.001,j/R);for(let k=0;k<N;k++){const a=k/N*Math.PI*2;verts.push(Math.cos(a)*r*width*1.27,Math.sin(a)*r*height*1.8,-depth*(.20+.80*Math.sqrt(Math.max(0,1-r*r))))}}
 for(let j=0;j<R;j++)for(let k=0;k<N;k++){const a=j*N+k,b=j*N+(k+1)%N,c=a+N,d=b+N;indices.push(a,b,c,b,d,c)}
 const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(verts,3));bg.setIndex(indices);bg.computeVertexNormals();pocket.add(new T.Mesh(bg,inside));
 const upper=new T.Group(),lower=new T.Group();pocket.add(upper,lower);
 // Small curved tooth arch, not a single white strip.
 for(let row=0;row<2;row++){
  const group=row?lower:upper;
  for(let i=0;i<6;i++){const f=(i-2.5)/3,xx=f*width*.79,zz=-depth*.46-depth*.28*f*f;
   const toothMesh=new T.Mesh(new T.SphereGeometry(1,12,8),tooth);toothMesh.position.set(xx,0,zz);toothMesh.scale.set(width*.127,height*(row?.14:.28),depth*.14);group.add(toothMesh)}
  const g=new T.Mesh(new T.SphereGeometry(1,24,12),gum);g.position.set(0,row?-height*.24:height*.28,-depth*.56);g.scale.set(width*.85,height*.24,depth*.22);group.add(g);
 }
 const t=new T.Mesh(new T.SphereGeometry(1,24,12),tongue);t.scale.set(width*.62,height*.34,depth*.35);t.position.set(0,-height*.57,-depth*.70);pocket.add(t);
 root.visible=false;
 return {root,pocket,upper,lower,tongue:t,config};
}
function moveOralCavity(c,open,round,spread){
 if(!c)return;const o=clamp(open,0,1),{width,height,y}=c.config;
 c.root.visible=o>.055;c.pocket.scale.set(1-.22*round+.13*spread,Math.max(.22,o),1);
 c.pocket.position.y=y-height*.30*o;
 c.upper.position.y=height*.69;c.lower.position.y=-height*.91;
 c.tongue.position.y=-height*.57;
}
function installMouthCut(mesh,config,uniforms){
 const mat=mesh.material.clone(),{x,y,width,height,z,front}=config;mesh.material=mat;
 mat.onBeforeCompile=shader=>{
  shader.uniforms.oralOpen=uniforms.open;shader.uniforms.oralRound=uniforms.round;shader.uniforms.oralSpread=uniforms.spread;
  shader.vertexShader='varying vec3 lipRest;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nlipRest=position;');
  shader.fragmentShader='varying vec3 lipRest;\nuniform float oralOpen,oralRound,oralSpread;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   float ww=${width.toFixed(6)}*(1.0-.22*oralRound+.13*oralSpread);
   float mx=(lipRest.x-${x.toFixed(6)})/max(ww,.0001);
   float cy=${y.toFixed(6)}+${(height*.36).toFixed(6)}*min(1.0,mx*mx);
   float hh=max(.0001,${height.toFixed(6)}*oralOpen);
   float my=(lipRest.y-cy+hh*.28)/hh;
   // Discard actual surface fragments only at the mouth opening. Lighting/material
   // of the surrounding textured face is unchanged; physical geometry is behind it.
   if(oralOpen>.055 && lipRest.z>${front.toFixed(6)} && mx*mx+my*my<1.0) discard;
   #include <opaque_fragment>`);
 };
 mat.customProgramCacheKey=()=> 'physical-oral-v20-'+config.width;mat.needsUpdate=true;
}

// Certoro facial topology: a real split along the original textured lip seam.
// No alpha mask, discard, dark decal or painted mouth is used.
function rebuildCertoroMouth(mesh,head){
 const src=mesh.geometry,p=src.attributes.position,idx=src.index;
 const seam=x=>3.041+.023*Math.min(1,(x/.153)**2);
 const value=i=>p.getY(i)-seam(p.getX(i));
 const ease=(a,b,x)=>motionSmooth(a,b,x);
 const width=.157;
 const taper=x=>Math.pow(Math.max(0,1-(x/width)**2),1.05);
 const front=z=>ease(.19,.27,z);
 const extra=[],indices=[],edges=new Map(),samples=[];
 const names=Object.keys(src.attributes).filter(k=>!['tangent'].includes(k));
 // Intersect each triangle with the lip line, duplicating the intersected edge
 // separately for the upper and lower shell. UVs and skin weights are preserved.
 function edge(a,b,side){
  const key=Math.min(a,b)+':'+Math.max(a,b)+':'+side;
  if(edges.has(key))return edges.get(key);
  const va=value(a),vb=value(b),t=clamp(va/(va-vb),0,1);
  const x=lerp(p.getX(a),p.getX(b),t),z=lerp(p.getZ(a),p.getZ(b),t);
  const rec={a,b,t,side,x,y:seam(x),z},id=p.count+extra.length;extra.push(rec);edges.set(key,id);
  if(side===1&&Math.abs(x)<width+.025&&z>.19)samples.push([x,z]);
  return id
 }
 function clip(tri,side){
  const out=[];
  for(let k=0;k<3;k++){
   const a=tri[k],b=tri[(k+1)%3],aIn=value(a)*side>=0,bIn=value(b)*side>=0;
   if(aIn)out.push(a);if(aIn!==bIn)out.push(edge(a,b,side));
  }
  for(let k=1;k<out.length-1;k++)indices.push(out[0],out[k],out[k+1]);
 }
 for(let i=0;i<idx.count;i+=3){
  const tri=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];
  const vs=tri.map(value);
  if(Math.min(...vs)<0&&Math.max(...vs)>0&&tri.some(j=>Math.abs(p.getX(j))<width+.015&&p.getZ(j)>.20&&p.getY(j)>2.98&&p.getY(j)<3.10)){
   clip(tri,1);clip(tri,-1);
  }else indices.push(...tri);
 }
 if(extra.length<40)throw Error('Certoro lip seam insufficient topology '+extra.length);
 const geo=new T.BufferGeometry(),count=p.count+extra.length;
 for(const k of names){
  const a=src.attributes[k],arr=new a.array.constructor(count*a.itemSize),read=(i,c)=>a.isInterleavedBufferAttribute?a.data.array[i*a.data.stride+a.offset+c]:a.array[i*a.itemSize+c];for(let i=0;i<p.count;i++)for(let c=0;c<a.itemSize;c++)arr[i*a.itemSize+c]=read(i,c);
  for(let n=0;n<extra.length;n++){
   const r=extra[n],j=p.count+n;
   for(let c=0;c<a.itemSize;c++)arr[j*a.itemSize+c]=lerp(read(r.a,c),read(r.b,c),r.t);
   if(k==='position'){arr[j*3]=r.x;arr[j*3+1]=r.y;arr[j*3+2]=r.z}
   if(k==='skinIndex'){for(let c=0;c<4;c++)arr[j*4+c]=read(r.a,c)}
   if(k==='skinWeight'){for(let c=0;c<4;c++)arr[j*4+c]=read(r.a,c)}
  }
  geo.setAttribute(k,new T.BufferAttribute(arr,a.itemSize,a.normalized));
 }
 geo.setIndex(indices);geo.computeBoundingBox();geo.computeBoundingSphere();
 const shapes=[new Float32Array(count*3),new Float32Array(count*3),new Float32Array(count*3)];
 function deform(x,y,z,side,open,round,wide){
  const d=y-seam(x),w=taper(x)*front(z);
  const lip=(1-ease(.018,.085,Math.abs(d)))*w;
  const jaw=side<0?ease(2.83,2.955,y)*(1-ease(.018,.135,-d))*w:0;
  // Underlip and chin move together; upper lip moves only slightly.
  const center=1-ease(.025,.13,Math.abs(x));
  const dy=open*(side<0?-.064*jaw:.009*lip)+round*(side<0?jaw*(.019*(1-center)-.032*center):.013*lip*center)+wide*.004*lip;
  const dz=open*(-.009*jaw)+round*.023*lip;
  const dx=(-round*.38+wide*.12)*x*lip;
  return [dx,dy,dz]
 }
 const pp=geo.attributes.position;
 for(let i=0;i<count;i++){
  const x=pp.getX(i),y=pp.getY(i),z=pp.getZ(i),side=i<p.count?(y<seam(x)?-1:1):extra[i-p.count].side;
  for(let k=0;k<3;k++){const a=deform(x,y,z,side,+(k===0),+(k===1),+(k===2));shapes[k].set(a,i*3)}
 }
 geo.morphTargetsRelative=true;geo.morphAttributes.position=shapes.map(a=>new T.BufferAttribute(a,3));mesh.geometry=geo;mesh.updateMorphTargets();
 // The lining is built directly from the actual front-shell seam samples.
 const root=new T.Group();root.name='CertoroSculptedMouth';mesh.updateWorldMatrix(true,false);head.updateWorldMatrix(true,false);
 head.matrixWorld.clone().invert().multiply(mesh.matrixWorld).decompose(root.position,root.quaternion,root.scale);head.add(root);
 const material=(c,r)=>new T.MeshStandardMaterial({color:c,roughness:r,side:T.DoubleSide});
 const inside=material(0x371b1a,.88),lipMat=material(0x81513b,.80),toothMat=material(0xe1d0b4,.58),tongueMat=material(0x88504b,.75);
 const N=48,curve=[];
 for(let i=0;i<=N;i++){
  const x=lerp(-width,width,i/N);let nearest=samples.filter(a=>Math.abs(a[0]-x)<.013);
  if(!nearest.length)nearest=[samples.reduce((a,b)=>Math.abs(a[0]-x)<Math.abs(b[0]-x)?a:b)];
  const z=Math.max(...nearest.map(a=>a[1]));curve.push([x,seam(x),z-.0015])
 }
 // Continuous lining with four rows: upper lip, upper recess, lower recess, lower lip.
 const inner=new T.BufferGeometry(),arr=new Float32Array((N+1)*4*3),tri=[];
 for(let row=0;row<3;row++)for(let i=0;i<N;i++){const a=row*(N+1)+i,b=a+N+1;tri.push(a,b,a+1,b,b+1,a+1)}
 inner.setAttribute('position',new T.BufferAttribute(arr,3));inner.setIndex(tri);
 inner.addGroup(0,N*6,0);inner.addGroup(N*6,N*6,1);inner.addGroup(N*12,N*6,0);
 const lining=new T.Mesh(inner,[lipMat,inside]);lining.frustumCulled=false;root.add(lining);
 const teeth=new T.Group();root.add(teeth);
 // One short, curved row of broad stylized upper teeth; the lower teeth are tucked away.
 for(let i=0;i<6;i++){
  const x=(i-2.5)*.024;
  const o=new T.Mesh(new T.SphereGeometry(1,16,10),toothMat);
  o.position.set(x,3.045+.010*(x/.10)**2,.291-.030*(x/.105)**2);
  o.scale.set(.013,.0055,.010);teeth.add(o)
 }
 const tongue=new T.Mesh(new T.SphereGeometry(1,32,16),tongueMat);tongue.scale.set(.071,.015,.028);root.add(tongue);
 let last=[-1,-1,-1];
 function update(open,round,wide){
  if(Math.max(Math.abs(last[0]-open),Math.abs(last[1]-round),Math.abs(last[2]-wide))<.001)return;last=[open,round,wide];
  root.visible=open>.018;
  for(let i=0;i<=N;i++){
   const [x,y,z]=curve[i],u=deform(x,y,z,1,open,round,wide),l=deform(x,y,z,-1,open,round,wide),w=taper(x);
   const a=[x+u[0],y+u[1],z+u[2]],b=[x+l[0],y+l[1],z+l[2]];
   const rows=[a,[a[0]*.92,a[1]+.004*w,z-.045*w],[b[0]*.92,b[1]-.004*w,z-.052*w],b];
   for(let r=0;r<4;r++)arr.set(rows[r],(r*(N+1)+i)*3)
  }
  inner.attributes.position.needsUpdate=true;inner.computeVertexNormals();
  teeth.visible=open>.18&&round<.72;teeth.scale.x=1-.32*round+.08*wide;
  tongue.visible=open>.48;tongue.position.set(0,3.033-.055*open,.273);tongue.scale.y=.012+.003*open;
 }
 update(0,0,0);
 return {root,pocket:root,update,split:extra.length,curve};
}

function prepareTripoPose(rig){
 const bones={};rig.traverse(b=>{if(b.isBone)bones[b.name]={b,p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}});
 model.updateMatrixWorld(true);
 const mq=model.getWorldQuaternion(new T.Quaternion()).invert();
 for(const o of Object.values(bones)){o.wq=mq.clone().multiply(o.b.getWorldQuaternion(new T.Quaternion()));o.wp=model.worldToLocal(o.b.getWorldPosition(v(0,0,0)))}
 const mesh=rig.getObjectByName('HighDetailCertoro'),geo=mesh.geometry,src=geo.attributes.position;
 const sm=(a,b,x)=>{let t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
 // Rigid shoes: no pelvis influence, no opposite-foot influence, and a soft ankle transition.
 const ji=geo.attributes.skinIndex,wi=geo.attributes.skinWeight;
 const boneIndex=n=>mesh.skeleton.bones.indexOf(bones[n].b);
 let repaired=0;
 for(let i=0;i<src.count;i++){
  const x=src.getX(i),y=src.getY(i),z=src.getZ(i),side=x>=0?'L':'R';
  if(y<.66){
   const ankleBlend=sm(.27,.46,y);
   ji.setXYZW(i,boneIndex('Foot'+side),boneIndex('Shin'+side),0,0);
   wi.setXYZW(i,1-ankleBlend,ankleBlend,0,0);repaired++;
  }else if(y<.90&&Math.abs(x)>.12){
   const j=[ji.getX(i),ji.getY(i),ji.getZ(i),ji.getW(i)],w=[wi.getX(i),wi.getY(i),wi.getZ(i),wi.getW(i)];
   const shin=boneIndex('Shin'+side),thigh=boneIndex('Thigh'+side);
   let a=0,b=0;for(let k=0;k<4;k++){if(j[k]===shin)a+=w[k];if(j[k]===thigh)b+=w[k]}
   if(a+b>.001){ji.setXYZW(i,shin,thigh,0,0);wi.setXYZW(i,a/(a+b),b/(a+b),0,0);repaired++}
  }

 }
 ji.needsUpdate=true;wi.needsUpdate=true;
 const armRepair=repairTripoArms(mesh,bones);makePalmAnchors(mesh,bones);setupGripFrames(mesh,bones);
 const oral=rebuildCertoroMouth(mesh,bones.Head.b);
 mesh.frustumCulled=false;
 const mouth={value:0},mouthRound={value:0},mouthSpread={value:0};
 const hip=bones.ThighL.wp.y,ankle=bones.FootL.wp.y;
 tripoMotion={rig,bones,mesh,hip,ankle,last:model.position.clone(),distance:0,gait:0,bend:0,seat:0,face:[0,0,0],mouth,mouthRound,mouthSpread,oral,armRepair,repaired,time:0};
}
function motionSmooth(a,b,x){const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}
function animateTripoFace(dt){
 const m=tripoMotion;if(!m)return;let target=[0,0,0];
 if(voicePlaying&&voiceWho==='Certoro'&&!state.muted){
  const frames=SPEECH_FRAMES[voiceLine],t=voiceAudio?voiceAudio.currentTime:ac?Math.max(0,(ac.currentTime-voiceStartedAt)*voicePlaybackRate):0;
  if(frames){const p=t/.02,k=Math.floor(p),f=p-k;for(let j=0;j<3;j++)target[j]=lerp(frames[k*3+j]||0,frames[(k+1)*3+j]||0,f)/100}
 }
 target[0]=Math.min(1,target[0]*1.14);
 const f=1-Math.exp(-Math.max(0,dt)*30);
 for(let j=0;j<3;j++){m.face[j]=lerp(m.face[j],target[j],f);m.mesh.morphTargetInfluences[j]=m.face[j]}
 m.mouth.value=m.face[0];m.mouthRound.value=m.face[1];m.mouthSpread.value=m.face[2];m.oral.update(m.face[0],m.face[1],m.face[2]);
}
function advanceCertoroPose(dt){
 if(mixer)mixer.update(dt);const m=tripoMotion;if(!m)return;
 const B=n=>m.bones[n].b, R=n=>m.bones[n],W=n=>B(n).getWorldPosition(v(0,0,0));
 const moved=model.position.distanceTo(m.last);m.last.copy(model.position);m.distance+=Math.min(moved,.4);m.time+=dt;
 const walking=currentAction==='walk'||(currentAction==='point'&&moved>.014);
 const stride=1.32;
 const targetGait=walking?clamp(moved/Math.max(dt,.001)/.6,0,1):0;
 const pick=lounge.active&&LOUNGE_ROUTE[lounge.index]?.kind==='pick';
 const pickT=pick?clamp(lounge.time/LOUNGE_ROUTE[lounge.index].duration,0,1):0;
 const bendTarget=pick?motionSmooth(0,.43,pickT)*(1-motionSmooth(.66,1,pickT)):0;
 const seatTarget=currentAction==='sit'&&(lounge.active||lounge.seated)?1:0;
 m.gait=lerp(m.gait,targetGait,1-Math.exp(-dt*10));m.bend=lerp(m.bend,bendTarget,1-Math.exp(-dt*19));m.seat=lerp(m.seat,seatTarget,1-Math.exp(-dt*9));
 // Preserve legacy gestures for non-locomotion states, but reset the retargeted leg and root poses.
 const gesture=!walking&&!pick&&m.seat<.03&&['point','talk','wave','celebrate'].includes(currentAction);
 const qsave={};if(gesture)for(const n of ['Head','UpperArmL','ForearmL','HandL','UpperArmR','ForearmR','HandR'])qsave[n]=B(n).quaternion.clone();
 for(const o of Object.values(m.bones)){o.b.position.copy(o.p);o.b.quaternion.copy(o.q);o.b.scale.copy(o.s)}
 const phase=m.distance/stride, gait=m.gait*(1-m.bend)*(1-m.seat);
 const hipY=lerp(m.hip-.108*gait-.020*gait*Math.cos(phase*4*Math.PI)-.36*m.bend,.65,m.seat);
 const back=-.105*m.bend-.025*m.seat, sway=.022*gait*Math.sin(phase*2*Math.PI);
 B('Root').position.copy(R('Root').p).add(v(sway,hipY-m.hip,back).multiplyScalar(1/m.rig.scale.y));
 model.updateMatrixWorld(true);
 const mq=model.getWorldQuaternion(new T.Quaternion()),axisX=v(1,0,0);
 function orient(n,q){const b=B(n);b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));b.updateWorldMatrix(true,true)}
 function restQ(n,rx=0){return mq.clone().multiply(new T.Quaternion().setFromAxisAngle(axisX,rx)).multiply(R(n).wq)}
 function aim(n,child,p){const a=W(n),d=W(child).sub(a).normalize(),to=p.clone().sub(a).normalize();if(to.lengthSq()<.1)return;orient(n,new T.Quaternion().setFromUnitVectors(d,to).multiply(B(n).getWorldQuaternion(new T.Quaternion())))}
 // Hip hinge instead of the former simulated crouch. Counter-rotate neck for gaze.
 orient('Spine',restQ('Spine',.88*m.bend+.11*m.seat+.035*gait));orient('Chest',restQ('Chest',.83*m.bend+.075*m.seat+.02*gait));orient('Head',restQ('Head',.42*m.bend-.02*m.seat));
 for(const [side,sg] of [['L',1],['R',-1]]){
  const th='Thigh'+side,sh='Shin'+side,fo='Foot'+side,u='UpperArm'+side,f='Forearm'+side,h='Hand'+side;
  const p=((phase+(side==='R'?.5:0))%1+1)%1,stance=.60;
  let z=0,lift=0;
  if(p<stance)z=stride*(.5-p/stance)*stance;else{const t=(p-stance)/(1-stance);z=stride*stance*(motionSmooth(0,1,t)-.5);lift=.12*Math.pow(Math.sin(Math.PI*t),1.25)}
  const foot=R(fo).wp.clone();foot.z+=gait*z;foot.y+=gait*lift;foot.z=lerp(foot.z,.49,m.seat);foot.x+=sg*.025*m.seat;foot.z+=.07*m.bend;
  let target=model.localToWorld(foot),hip=W(th),l1=W(sh).distanceTo(hip),l2=W(fo).distanceTo(W(sh)),dir=target.clone().sub(hip);
  let d=clamp(dir.length(),Math.abs(l1-l2)+.001,l1+l2-.002);dir.normalize();
  let pole=v(sg*.06,0,1).applyQuaternion(mq);pole.addScaledVector(dir,-pole.dot(dir)).normalize();
  const along=(l1*l1-l2*l2+d*d)/(2*d),knee=hip.clone().addScaledVector(dir,along).addScaledVector(pole,Math.sqrt(Math.max(0,l1*l1-along*along)));
  target=hip.clone().addScaledVector(dir,d);
  aim(th,sh,knee);aim(sh,fo,target);orient(fo,restQ(fo,gait*lift*.85));
  const swing=sg*.32*gait*Math.cos(phase*2*Math.PI),restSwing=.023*Math.sin(m.time*2.2);
  orient(u,restQ(u,swing+restSwing+.12*m.seat));orient(f,restQ(f,swing-.18*gait-.52*m.seat));orient(h,restQ(h,swing-.18*gait-.52*m.seat));
 }
 if(gesture){for(const [n,q] of Object.entries(qsave))B(n).quaternion.copy(q)}
 model.updateMatrixWorld(true);animateTripoFace(dt);
}

function play(name,fade=.20){if(!mixer||currentAction===name)return;let a=actions[name]||actions.idle;if(!a)return;if(currentAction&&actions[currentAction])actions[currentAction].fadeOut(fade);a.paused=false;a.reset().fadeIn(fade).play();currentAction=name}
const intro={step:0,choice:false,done:false,transition:0,model:null,desk:null,cam:null,speech:true,lastLine:'',entered:0};
let trainerProps,trainingKey,stageGlows=[],deliveryFX=[],resultBoard;
const INTRO_RATE=1;
const script=[
 {name:'Lagerleiter',tag:'ERSTER ARBEITSTAG',line:'Willkommen, Certoro! Ich zeige dir, wie wir hier Artikel anlegen.',cam:'two',seconds:6,visual:'Dein erster Arbeitstag: Lerne, wie aus einem Produkt ein Online-Verkaufsangebot wird.'},
 {name:'Lagerleiter',tag:'SCHRITT 1 VON 3',line:'Zuerst fotografieren wir jedes Produkt einzeln.',cam:'product',seconds:3.396,visual:'01 · PRODUKTFOTO AUFNEHMEN'},
 {name:'Lagerleiter',tag:'SCHRITT 2 VON 3',line:'Dann suchen wir die Artikelnummer und die Produktdaten.',cam:'desk',seconds:4.049,visual:'02 · ARTIKELNUMMER UND DATEN RECHERCHIEREN'},
 {name:'Lagerleiter',tag:'SCHRITT 3 VON 3',line:'Jetzt schreiben wir Titel und Beschreibung.',cam:'desk',seconds:3.318,visual:'03 · VERKAUFSANGEBOT ERSTELLEN'},
 {name:'Certoro',tag:'EIN ANDERER WEG',line:'Ich hab’s verstanden.',cam:'hero',seconds:1.150,visual:''},
 {name:'Certoro',tag:'EIN ANDERER WEG',line:'Aber das geht doch viel einfacher. Gib mir eine ganze Palette!',cam:'hero',seconds:3.083,visual:''},
 {name:'Lagerleiter',tag:'DIE HERAUSFORDERUNG',line:'Jeder bekommt zehn Produkte. Wer hat zuerst alle Angebote fertig?',cam:'delivery',seconds:5.068,visual:'10 PRODUKTE · 2 MITARBEITER · 1 AUFGABE'}
];
const VOICE_URLS = ["https://d8j0ntlcm91z4.cloudfront.net/user_3JoVMcU64SCr3ZOXnqrL8fUEJOx/hf_20261124_114631_31d44b8c-e7f5-4fd9-9291-03ecda6ee943.mp3","https://d8j0ntlcm91z4.cloudfront.net/user_3JoVMcU64SCr3ZOXnqrL8fUEJOx/hf_20261124_114630_cf56d928-e09f-48c2-8cb3-94b37dcc6c17.mp3","https://d8j0ntlcm91z4.cloudfront.net/user_3JoVMcU64SCr3ZOXnqrL8fUEJOx/hf_20261124_153448_7f26eb8e-b7f6-49c3-8154-b22a1f67e9b9.mp3","https://d8j0ntlcm91z4.cloudfront.net/user_3JoVMcU64SCr3ZOXnqrL8fUEJOx/hf_20261124_153447_f51e9091-2ea5-43fe-b7a7-4180b413d2a2.mp3","https://d8j0ntlcm91z4.cloudfront.net/user_3JoVMcU64SCr3ZOXnqrL8fUEJOx/hf_20261124_114530_9afbe869-78a2-4253-a359-d417fcaa39a9.mp3","https://d8j0ntlcm91z4.cloudfront.net/user_3JoVMcU64SCr3ZOXnqrL8fUEJOx/hf_20261124_114632_19c64e89-5efb-4e71-91f2-96bedc51e1a2.mp3","https://d8j0ntlcm91z4.cloudfront.net/user_3JoVMcU64SCr3ZOXnqrL8fUEJOx/hf_20261124_153447_fcb07435-130d-4d31-a456-c82424b442f8.mp3","https://d8j0ntlcm91z4.cloudfront.net/user_3JoVMcU64SCr3ZOXnqrL8fUEJOx/hf_20261124_114629_b3a43d45-e688-414b-bb69-7f0161378012.mp3","https://d8j0ntlcm91z4.cloudfront.net/user_3JoVMcU64SCr3ZOXnqrL8fUEJOx/hf_20261124_114635_488826b5-9988-48e1-90c2-5a4bfd7f671b.mp3"];
const VOICE_LINES=[...script.map(s=>s.line),'Ich bin fertig. Wie weit bist du?','Ich bin noch dabei, die Artikel einzeln anzulegen …'];
let voiceSource=null, voicePlaying=false, voiceWho='', voiceTicket=0, voiceAudio=null, voiceLine=-1;
const voiceBytes=VOICE_URLS.map(url=>fetch(url,{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('Audio HTTP '+r.status);return r.arrayBuffer()}).catch(()=>null));
const voiceDecoded=new Map();
function stopVoice(){voiceTicket++;voicePlaying=false;if(voiceSource){try{voiceSource.stop()}catch{}voiceSource=null}if(voiceAudio){voiceAudio.pause();voiceAudio=null}}
async function say(line,who){
 stopVoice();const i=VOICE_LINES.indexOf(line);if(i<0)return;voiceLine=i;voiceWho=who;if(state.muted)return;
 const ticket=voiceTicket;
 try{
  ac??=new (window.AudioContext||window.webkitAudioContext)();
  if(ac.state!=='running')await ac.resume();
  if(ticket!==voiceTicket||state.muted)return;
  let buf=voiceDecoded.get(i);
  if(!buf){let bytes=await voiceBytes[i];if(!bytes)throw Error('No audio');buf=await ac.decodeAudioData(bytes.slice(0));voiceDecoded.set(i,buf)}
  if(ticket!==voiceTicket||state.muted)return;
  const src=ac.createBufferSource(),gain=ac.createGain();gain.gain.value=.92;src.buffer=buf;src.playbackRate.value=state.phase==='intro'?INTRO_RATE:1;src.connect(gain);gain.connect(ac.destination);voiceSource=src;voiceStartedAt=ac.currentTime;voicePlaybackRate=src.playbackRate.value;voicePlaying=true;src.onended=()=>{if(ticket===voiceTicket){voicePlaying=false;voiceSource=null}};src.start();
 }catch(e){
  if(ticket!==voiceTicket||state.muted)return;
  try{const audio=new Audio(VOICE_URLS[i]);audio.playbackRate=state.phase==='intro'?INTRO_RATE:1;voiceAudio=audio;audio.onended=()=>{if(ticket===voiceTicket){voicePlaying=false;voiceAudio=null}};await audio.play();if(ticket===voiceTicket)voicePlaying=true;else audio.pause()}catch(e){if(ticket===voiceTicket)voicePlaying=false}
 }
}
function replayVoice(){if(voiceLine<0)return;if(state.phase==='intro')intro.elapsed=0;if(state.muted){state.muted=false;$('sound').textContent='Ton an'}say(VOICE_LINES[voiceLine],voiceWho)}
function introChoice(options,correct,success){
 const list=document.createElement('div');list.className='story-options introChoices';
 for(const [label,value] of options){
  const btn=document.createElement('button');btn.type='button';btn.textContent=label;
  btn.onclick=()=>{
   if(state.phase!=='intro'||intro.completed)return;
   for(const el of list.children)el.classList.remove('wrong','selected');
   if(value!==correct){btn.classList.add('wrong');$('introFeedback').textContent='Noch nicht ganz. Versuch es erneut.';sound();return}
   btn.classList.add('selected');for(const el of list.children)el.disabled=true;
   completeIntroTask(success);
  };list.append(btn);
 }
 $('storyTask').append(list);
}
function completeIntroTask(message){
 if(state.phase!=='intro'||intro.completed||intro.step<1||intro.step>3)return;
 intro.completed=true;intro.feedbackTime=0;
 if(intro.step===1){capture();$('viewfinder').classList.add('hidden')}
 else sound('scan');
 $('storyAct').disabled=true;$('introFeedback').textContent=message;
}
function storyStep(){
 const q=script[intro.step];if(!q)return;intro.elapsed=0;intro.completed=false;intro.feedbackTime=0;
 $('viewfinder').classList.toggle('hidden',intro.step!==1);
 $('story').classList.remove('hidden','autoIntro');$('story').classList.add('interactiveIntro');
 $('storyTag').textContent=intro.step===0?'DEIN ERSTER ARBEITSTAG':q.tag;
 $('speaker').textContent=q.name==='Certoro'?'Certoro · neuer Mitarbeiter':'Lagerleiter · dein Ausbilder';
 $('storyLine').textContent=q.line;$('storyTask').replaceChildren();
 $('story').classList.toggle('bull',q.name==='Certoro');
 $('chapter').textContent=intro.step<=3?'EINARBEITUNG · DU BIST CERTORO':intro.step===6?'DIE HERAUSFORDERUNG':'CERTORO HAT EINE IDEE';
 $('storyAct').classList.remove('hidden');$('storyAct').disabled=false;$('storyAct').onclick=()=>{};
 const note=(t)=>{const el=document.createElement('div');el.className='introVisual';el.textContent=t;$('storyTask').append(el)};
 const feedback=document.createElement('div');feedback.id='introFeedback';feedback.setAttribute('role','status');
 if(intro.step===0){
  note('Du bist Certoro, neu im Lager. Der Lagerleiter zeigt dir die herkömmliche Artikelanlage. Dein Ziel: Produkte online verkaufen.');
  $('storyAct').textContent='Einarbeitung starten';$('storyAct').onclick=advanceStory;
 }else if(intro.step===1){
  note('Deine Aufgabe: Fotografiere den Standmixer auf dem Tisch.');
  $('storyAct').textContent='Foto aufnehmen';$('storyAct').onclick=()=>completeIntroTask('Foto gespeichert · 1 von 3');
 }else if(intro.step===2){
  note('Auf dem Karton steht: 426010000100. Welche Artikelnummer gehört zum Standmixer?');
  introChoice([['426010000103','103'],['426010000100','100'],['426010000109','109']],'100','Artikel gefunden · 2 von 3');
  $('storyAct').classList.add('hidden');$('storyAct').disabled=true;
 }else if(intro.step===3){
  note('Der Standmixer ist neu und originalverpackt. Wähle das passende Verkaufsangebot.');
  introChoice([['Kopfhörer · gebraucht','wrong1'],['Standmixer · Neuware · Originalverpackt','correct'],['Standmixer · defekt','wrong2']],'correct','Verkaufsangebot vorbereitet · 3 von 3');
  $('storyAct').classList.add('hidden');$('storyAct').disabled=true;
 }else{
  $('storyAct').classList.add('hidden');$('storyAct').disabled=true;
  if(intro.step===6){note('10 Produkte pro Mitarbeiter. Gleicher Auftrag, unterschiedliche Arbeitsweise.');sound('gate')}
 }
 $('storyTask').append(feedback);
 say(q.line,q.name);autoCamera=true;overview=false;
}
function finishIntro(){
 if(state.phase!=='intro')return;stopVoice();$('viewfinder').classList.add('hidden');intro.done=true;
 $('story').classList.add('hidden');$('story').classList.remove('autoIntro','interactiveIntro');
 $('storyAct').classList.remove('hidden');$('storyAct').disabled=false;
 $('chapter').textContent='02 / WARENEINGANG';
 if(state.gate>=1){choose();return}
 state.phase='arrival';sound('gate');toast('ZWEI PALETTEN · GLEICHE WARE');
}
function advanceStory(){
 if(state.phase!=='intro')return;
 if(intro.step>=script.length-1){finishIntro();return}
 intro.step++;storyStep();
}
function tickIntro(dt){
 const q=script[intro.step];intro.elapsed+=dt;
 // The first four steps never advance without the player's action.
 if(intro.step===0)return;
 if(intro.step<=3){
  if(intro.completed){intro.feedbackTime+=dt;if(intro.feedbackTime>=.65)advanceStory()}
  return;
 }
 // Certoro's interruption and the challenge run like a short cutscene.
 if(intro.step===6)advanceGate(dt);
 const duration=Math.max(1.55,q.seconds/INTRO_RATE+.25);
 if(intro.elapsed>=duration&&(!voicePlaying||intro.elapsed>=duration+2))advanceStory();
}
function start(){
 if(!model||state.phase!=='menu')return;
 state.phase='intro';intro.step=0;intro.done=false;state.gate=0;
 $('overlay').classList.add('hidden');$('top').classList.add('cinematic');$('chapter').classList.remove('hidden');$('race').classList.add('hidden');
 $('skipIntro').onclick=finishIntro;storyStep();sound();
}
function makeTraining(){const g=group(scene,0,0,.55);intro.desk=g;
 const dark=mat(0x24232c,.45,.22),silver=mat(0x77818c,.37,.75),wood=mat(0x554c45,.65);
 box(g,2.25,.13,.91,0,1.04,0,wood);for(let x of [-.96,.96])for(let z of [-.34,.34])box(g,.075,1,.075,x,.50,z,silver);
 box(g,2.08,.12,.12,0,.23,-.32,dark);box(g,2.05,.035,.81,0,1.12,0,mat(0x303440,.8));
 const mixer=group(g,-.18,1.14,.01);intro.model=mixer;const ivory=mat(0xe4e5df,.31),rubber=mat(0x171a23,.62),chrome=mat(0x919aa2,.22,.85);
 cyl(mixer,.22,.27,.24,0,.12,0,ivory,40);cyl(mixer,.22,.21,.065,0,.255,0,chrome,40);cyl(mixer,.19,.15,.045,0,.305,0,rubber,40);
 const jarMat=new T.MeshPhysicalMaterial({color:0xc4def2,roughness:.15,metalness:0,transparent:true,opacity:.42,depthWrite:false});
 cyl(mixer,.23,.17,.43,0,.535,0,jarMat,40);cyl(mixer,.235,.235,.06,0,.78,0,rubber,40);cyl(mixer,.08,.08,.035,0,.83,0,chrome,24);
 for(let i=0;i<4;i++){let t=i*Math.PI/2;box(mixer,.12,.012,.035,Math.cos(t)*.06,.345,Math.sin(t)*.06,chrome).rotation.y=t}
 box(mixer,.055,.28,.06,.29,.54,0,rubber);box(mixer,.12,.05,.065,.25,.66,0,rubber);box(mixer,.12,.05,.065,.25,.42,0,rubber);
 const dial=cyl(mixer,.055,.055,.03,0,.15,.23,rubber);dial.rotation.x=Math.PI/2;
 if(environmentKit.has('PRODUCT_00')){removeLegacy(mixer);mountProduct(0,mixer,.60,.86,.54,0)}mountKit('TRAINING',g);const pkg=group(g,.67,1.13,-.12);let tx=texture(512,512,(c,w,h)=>{c.fillStyle='#e8e5db';c.fillRect(0,0,w,h);c.fillStyle='#293044';c.fillRect(0,0,w,100);c.fillStyle='#fff';c.font='900 52px Arial';c.fillText('MIX / 1200',24,66);c.fillStyle='#6d28d9';c.fillRect(24,130,w-48,10);c.fillStyle='#222';c.font='bold 33px Arial';c.fillText('STANDMIXER',24,190);c.font='24px Arial';c.fillText('1,5 L · 1.200 W',24,226);c.fillStyle='#7a8494';c.fillRect(205,260,105,120);c.fillStyle='#333';for(let k=0;k<50;k++)if(k%3!==1)c.fillRect(26+k*4,410,2,50);c.font='20px Arial';c.fillText('426010000100',28,490)});
 box(pkg,.46,.64,.43,0,.32,0,[ivory,ivory,ivory,ivory,new T.MeshStandardMaterial({map:tx,roughness:.65}),ivory]);
 let reader=group(g,-.79,1.16,.04);box(reader,.12,.085,.17,0,.055,0,dark);box(reader,.085,.04,.13,0,.12,.02,dark).rotation.x=-.45;box(reader,.07,.013,.018,0,.16,.09,new T.MeshBasicMaterial({color:0xff314b}),false);
 const photoCam=group(g,-.68,1.20,.26);box(photoCam,.24,.15,.12,0,0,0,dark);cyl(photoCam,.059,.059,.12,0,0,.09,chrome,24).rotation.x=Math.PI/2;cyl(photoCam,.047,.047,.012,0,0,.155,rubber,24).rotation.x=Math.PI/2;box(photoCam,.07,.035,.06,.06,.085,0,dark);const label=texture(512,128,(c,w,h)=>{c.fillStyle='#1b0f32';c.fillRect(0,0,w,h);c.fillStyle='#c6ff3d';c.font='bold 46px Arial';c.fillText('WORKSTATION 01',18,78)});plane(g,1.25,.30,0,.89,.47,label);
 g.visible=false;
}
function cinematicActors(dt,time){
 if(!['intro','arrival','choose'].includes(state.phase)||!model)return false;let active=state.phase==='intro'&&intro.step!==6;intro.desk.visible=active;
 let cp='idle',cert=v(-1.62,0,1.10),man=v(1.34,0,1.07);if(!active){cert=v(-3.25,0,2.25);man=v(3.25,0,2.25)}
 let a=active?script[intro.step]:null;if(a?.name==='Certoro'&&voicePlaying&&voiceWho==='Certoro')cp='talk';else if(active&&intro.step===1&&intro.completed)cp='point';
 certPos.lerp(cert,1-Math.exp(-dt*5));manualPos.lerp(man,1-Math.exp(-dt*5));model.position.copy(certPos);worker.g.position.copy(manualPos);model.rotation.y=lerp(model.rotation.y,active?.60:0,1-Math.exp(-dt*5));worker.g.rotation.y=lerp(worker.g.rotation.y,active?-.45:0,1-Math.exp(-dt*5));play(cp);
 if(phoneModel)phoneModel.visible=false;advanceCertoroPose(dt);
 let gest=active&&a?.name==='Lagerleiter'&&voicePlaying?Math.sin(time*4)*.17:0;worker.arms.forEach(([arm,f],i)=>{const demo=active&&intro.step>=1&&intro.step<=3;arm.rotation.x=demo?(intro.step===1?-1.05:-.65)+gest:(i===0?-.38-gest:-.12);arm.rotation.z=i===0?.14:-.14;f.rotation.x=demo?(intro.step===1?-.80:-.65+Math.sin(time*9+i)*.12):(i===0?-.62-gest:0)});worker.legs.forEach(([a,k])=>{a.rotation.x=0;k.rotation.x=0});scanBeam.visible=false;return true
}
function cinematicCamera(dt){let portrait=innerWidth/innerHeight<.85;let target,angle,elev,distance;
 if(photoShot.active&&!photoShot.returning&&photoShot.t>.04){
  const phone=phoneModel.getWorldPosition(v(0,0,0)),normal=v(0,0,1).applyQuaternion(phoneModel.getWorldQuaternion(new T.Quaternion()));
  const blend=motionSmooth(.72,1.45,photoShot.t);
  const side=photoAim().sub(model.position);side.y=0;side.normalize();
  const poseTarget=model.position.clone().add(v(0,1.12,0)).addScaledVector(side,.45);
  target=poseTarget.lerp(phone,blend);
  const screenAngle=Math.atan2(normal.x,normal.z)+.20,sideAngle=screenAngle+1.12;
  angle=sideAngle+Math.atan2(Math.sin(screenAngle-sideAngle),Math.cos(screenAngle-sideAngle))*blend;
  elev=lerp(.14,Math.asin(clamp(normal.y,-1,1)),blend);distance=lerp(portrait?4.4:3.8,portrait?.51:.58,blend);
  const ease=1-Math.exp(-dt*8);camTarget.lerp(target,ease);yaw=angleTo(yaw,angle,dt*.66);pitch=lerp(pitch,elev,ease);dist=lerp(dist,distance,ease);return true;
 }
 if(photoShot.active&&photoShot.returning){target=v(-3.25,1.0,.10);angle=.05;elev=portrait?.54:.39;distance=portrait?9.8:10.5;const ease=1-Math.exp(-dt*6);camTarget.lerp(target,ease);yaw=lerp(yaw,angle,ease);pitch=lerp(pitch,elev,ease);dist=lerp(dist,distance,ease);return true;}
 if(state.phase==='intro'){let q=script[intro.step];const shot=q.cam;
 if(shot==='delivery'){target=v(0,1.5,-3.4);angle=0;elev=.35;distance=portrait?16.2:13.0}
 else if(shot==='hero'){target=v(-1.52,1.66,1.0);angle=.13;elev=.12;distance=portrait?4.65:4.3}
 else if(shot==='product'){target=v(-.18,1.23,.53);angle=.17;elev=.24;distance=portrait?4.7:5.1}
 else if(shot==='desk'){target=v(.43,1.27,.60);angle=-.15;elev=.18;distance=portrait?5.25:5.2}
 else{target=v(-.05,1.31,.8);angle=.05;elev=.13;distance=portrait?8.2:7.1}}
 else if(state.phase==='outro'){
  if(!endingScene.arrived){target=certPos.clone().add(v(.10,1.13,0));angle=.12;elev=.22;distance=portrait?5.9:5.7}
  else if(endingScene.observed){target=manualPos.clone().add(v(0,1.58,0));angle=-.75;elev=.11;distance=portrait?3.25:3.65}
  else{target=certPos.clone().lerp(manualPos,.48).add(v(0,1.26,0));angle=.20;elev=.12;distance=portrait?6.7:5.9}
 }
 else if(state.phase==='arrival'){target=v(0,1.5,-3.4);angle=.0;elev=.35;distance=portrait?16.2:13.0}
 else return false;
 let ease=1-Math.exp(-dt*5.2);camTarget.lerp(target,ease);yaw=lerp(yaw,angle,ease);pitch=lerp(pitch,elev,ease);dist=lerp(dist,distance,ease);return true
}
function togglePause(){if(state.phase!=='playing')return;state.paused=!state.paused;$('pause').textContent=state.paused?'Weiter':'Pause';if(state.paused)toast('Spiel pausiert');updateUI()}
const jobs=products.map((p,i)=>({name:p[0],category:p[1],sku:String(1001+i),ean:String(426010000100+i),price:[49,69,89,29,119,24,59,19,39,49][i],title:p[0]+' · Neuware',description:p[0]+' · Originalverpackt · Neu'}));
const flow={certPhase:'approach',manualPhase:'pick',selected:-1,checked:new Set(),review:-1,channel:null,channels:new Set(),records:[],manualDraft:{},feedback:'',correct:false,uiKey:'',lastAction:0,simCert:0,simManual:0,activeAddon:null};
const ray=new T.Raycaster(),pointer=new T.Vector2();
function refresh(){flow.uiKey='';updateUI()}
function msg(t){toast(t);sound()}
// V18: the actual warehouse scene is photographed into a separate render target.
let phoneScreen=null,phoneCanvas=null,phoneTexture=null,photoRT=null,photoImage=null;
const photoShot={active:false,t:0,captured:false,returning:false};
function drawPhoneScreen(saved=false){
 if(!phoneCanvas)return;
 const c=phoneCanvas.getContext('2d'),W=phoneCanvas.width,H=phoneCanvas.height;
 c.fillStyle='#10101b';c.fillRect(0,0,W,H);
 c.fillStyle='#c6ff3d';c.font='900 45px Arial';c.fillText('certoro',22,64);
 c.fillStyle='#fff';c.font='bold 21px Arial';c.fillText(saved?'Aufnahme gespeichert':'Kamera · Warenaufnahme',22,110);
 c.fillStyle='#181b25';c.fillRect(14,139,W-28,300);
 if(photoImage)c.drawImage(photoImage,14,155,W-28,267);
 c.strokeStyle=saved?'#c6ff3d':'#ffffff';c.lineWidth=3;
 for(const [x,y,sx,sy] of [[22,147,1,1],[W-22,147,-1,1],[22,431,1,-1],[W-22,431,-1,-1]]){c.beginPath();c.moveTo(x+sx*24,y);c.lineTo(x,y);c.lineTo(x,y+sy*24);c.stroke()}
 c.fillStyle=saved?'#c6ff3d':'#d4d6df';c.font='bold 25px Arial';c.fillText(saved?'✓ 10 / 10 Artikel':'Palette im Fokus',22,481);
 c.fillStyle='#aeb0be';c.font='18px Arial';c.fillText(saved?'Foto im Produktpool':'Aufnahme vorbereiten',22,514);
 c.strokeStyle='#c6ff3d';c.lineWidth=4;c.beginPath();c.arc(W/2,598,39,0,Math.PI*2);c.stroke();c.fillStyle='#c6ff3d';c.beginPath();c.arc(W/2,598,31,0,Math.PI*2);c.fill();
 c.fillStyle='#111523';c.font='bold 29px Arial';if(saved)c.fillText('✓',W/2-13,608);
 c.fillStyle='#8f93a8';c.font='16px Arial';c.textAlign='center';c.fillText(saved?'BILD GESPEICHERT':'AUFNEHMEN',W/2,665);c.textAlign='left';
 phoneTexture.needsUpdate=true;
}
function buildPhotoScreen(){
 phoneCanvas=document.createElement('canvas');phoneCanvas.width=384;phoneCanvas.height=704;
 phoneTexture=new T.CanvasTexture(phoneCanvas);phoneTexture.colorSpace=T.SRGBColorSpace;
 phoneScreen=new T.Mesh(new T.PlaneGeometry(.145,.264),new T.MeshBasicMaterial({map:phoneTexture,toneMapped:false}));phoneScreen.position.z=.0238;phoneModel.add(phoneScreen);
 drawPhoneScreen(false);
}
function renderPalletPhoto(saved=false){
 if(!photoRT){photoRT=new T.WebGLRenderTarget(1024,768,{depthBuffer:true});photoRT.texture.colorSpace=T.SRGBColorSpace;}
 scene.updateMatrixWorld(true);
 const center=pallets[0].getWorldPosition(v(0,0,0));
 const shotCamera=new T.PerspectiveCamera(92,4/3,.035,35);
 const origin=phoneModel.getWorldPosition(v(0,0,0));const lens=phoneModel.localToWorld(v(-.045,.098,-.030));shotCamera.position.copy(lens);shotCamera.lookAt(lens.clone().add(v(0,0,-1).applyQuaternion(phoneModel.getWorldQuaternion(new T.Quaternion()))));
 const prev=renderer.getRenderTarget(),old=phoneModel.visible,beam=scanBeam.visible,person=model.visible;
 // Capture just as the phone camera sees the articles, without player or scan overlay obscuring them.
 phoneModel.visible=false;scanBeam.visible=false;model.visible=false;
 try{renderer.setRenderTarget(photoRT);renderer.render(scene,shotCamera);const bytes=new Uint8Array(1024*768*4);renderer.readRenderTargetPixels(photoRT,0,0,1024,768,bytes);
  photoImage=document.createElement('canvas');photoImage.width=1024;photoImage.height=768;const c=photoImage.getContext('2d'),data=c.createImageData(1024,768);
  for(let y=0;y<768;y++)data.data.set(bytes.subarray((767-y)*1024*4,(768-y)*1024*4),y*1024*4);
  c.putImageData(data,0,0);
 }finally{renderer.setRenderTarget(prev);phoneModel.visible=old;scanBeam.visible=beam;model.visible=person}
 drawPhoneScreen(saved);
}
function startPhotoShot(){
 if(photoShot.active)return;
 Object.assign(photoShot,{active:true,t:0,captured:false,returning:false,preview:false});autoCamera=true;overview=false;
 $('hud').classList.add('hidden');$('viewfinder').classList.add('hidden');$('targetMarker').classList.add('hidden');$('chapter').textContent='PRODUKTFOTO · CERTORO APP';$('chapter').classList.remove('hidden');
 photoImage=null;drawPhoneScreen(false);
}
function photoAim(){
 const center=pallets[0].getWorldPosition(v(0,0,0));
 return center.add(v(0,.48,0));
}
const phoneDraw={t:0,grasped:false,active:false};
function updatePhoneDraw(dt){
 if(!model||!phoneModel||!tripoMotion)return;
 const drawing=state.role==='cert'&&state.phase==='playing'&&state.autoRun&&state.autoStep===0&&flow.certPhase==='photo';
 if(!drawing){if(phoneDraw.active){phoneDraw.active=false;phoneDraw.t=0;phoneDraw.grasped=false}phoneModel.visible=false;return}
 phoneDraw.active=true;phoneDraw.t+=dt;
 const dir=photoAim().sub(model.position);dir.y=0;dir.normalize();
 const lateral=v(dir.z,0,-dir.x),up=v(0,1,0),side='R';
 const shoulder=model.getObjectByName('UpperArmR').getWorldPosition(v(0,0,0));
 const pocket=model.position.clone().addScaledVector(lateral,-.41).addScaledVector(dir,.095).add(v(0,1.04,0));
 const holding=shoulder.clone().addScaledVector(dir,.46).addScaledVector(lateral,-.015).add(v(0,-.02,0));
 const reach=motionSmooth(0,.38,phoneDraw.t),raise=motionSmooth(.43,1.28,phoneDraw.t);
 const stow=photoShot.returning?motionSmooth(3.35,4.15,photoShot.t):0;
 const lift=raise*(1-stow);
 // Target palm, not wrist. Reach the pocket first, then pull the phone up.
 const point=pocket.clone().lerp(holding,lift);
 const normal=point.clone().sub(photoAim()).normalize();
 const screenUp=up.clone().addScaledVector(normal,-up.dot(normal)).normalize();
 const screenRight=screenUp.clone().cross(normal).normalize();
 const pocketNormal=lateral.clone(),pocketFinger=v(0,-1,0);
 const n=pocketNormal.lerp(normal,lift).normalize();
 const f=pocketFinger.lerp(screenUp,lift);
 if(f.length()<.06)f.copy(dir);
 const pose=gripPose(side,n,f);
 const grip=applyGrip(side,point,pose,reach);
 // The contact is on the lower back of the phone; the glove stays behind the
 // display and the curled fingers meet the lower edge. No independent offsets.
 const actualNormal=pose.normal,actualUp=pose.finger;
 const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(pose.right,actualUp,actualNormal));
 const center=grip.clone().addScaledVector(actualNormal,.0175).addScaledVector(actualUp,.076).addScaledVector(pose.right,.010);
 setWorldPose(phoneModel,center,q);
 if(phoneDraw.t>=.38)phoneDraw.grasped=true;
 phoneModel.visible=phoneDraw.grasped&&stow<.92;
 scanBeam.visible=false;
 if(photoShot.active&&!photoShot.returning&&lift>.95){
  const head=model.getObjectByName('Head'),world=head.getWorldQuaternion(new T.Quaternion());
  const pitch=new T.Quaternion().setFromAxisAngle(lateral,.12);head.quaternion.copy(head.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(pitch.multiply(world)));model.updateMatrixWorld(true);
 }
}
function updatePhotoShot(dt){
 if(!photoShot.active||!model)return;
 const arrived=certPos.distanceTo(v(-3.25,0,.10))<.18;
 if(!arrived||(!photoShot.returning&&phoneDraw.t<1.30))return;
 photoShot.t+=dt;
 if(!photoShot.returning){
  if(photoShot.t>=.35&&!photoShot.preview){photoShot.preview=true;renderPalletPhoto(false)}
  if(photoShot.t>=1.65&&!photoShot.captured){photoShot.captured=true;renderPalletPhoto(true);capture()}
 }
 if(photoShot.t>=3.35&&!photoShot.returning)photoShot.returning=true;
 if(photoShot.t>=4.22){photoShot.active=false;phoneModel.visible=false;state.autoRun=false;flow.simCert=9;state.autoTime=9;state.autoStep=1;setCert('sofa');$('chapter').classList.add('hidden');$('hud').classList.remove('hidden');refresh();msg('10 Fotos im Pool')}
}

function capture(){ $('flash').style.opacity='.75';setTimeout(()=>$('flash').style.opacity='0',120);sound('scan') }
function choose(){
 state.phase='choose';$('chapter').classList.add('hidden');$('race').classList.add('hidden');
 $('panel').innerHTML='<div class="eyebrow">DEINE HERAUSFORDERUNG</div><div class="hero" style="font-size:clamp(35px,6.2vw,65px)">10 Produkte.<span class="accent">1 Aufgabe.</span></div><p class="subtitle">Du kennst jetzt die herkömmliche Arbeit. Schlägt der neue Mitarbeiter seinen Ausbilder?<br>Wähle, wen du spielen möchtest.</p><div class="roles"><button class="role cert" id="chooseCert"><div class="label">NEUER MITARBEITER</div><div class="role-title">CERTORO</div><div class="desc">Arbeite mit Smartphone und KI.</div><div class="choose">Certoro spielen →</div></button><button class="role man" id="chooseManual"><div class="label">ERFAHRENER AUSBILDER</div><div class="role-title">LAGERLEITER</div><div class="desc">Arbeite mit Kamera und Computer.</div><div class="choose">Lagerleiter spielen →</div></button></div>';
 $('overlay').classList.remove('hidden');$('chooseCert').onclick=()=>select('cert');$('chooseManual').onclick=()=>select('manual');
}
function select(role){$('top').classList.remove('cinematic');$('chapter').classList.add('hidden');state.role=role;state.phase='playing';state.elapsed=0;state.autoTime=0;state.manualTime=0;state.autoStep=0;state.manualItem=0;state.manualStep=0;state.autoRun=false;state.manualRun=false;state.addons.clear();resetLounge();flow.certPhase='approach';flow.manualPhase='pick';flow.selected=-1;flow.checked.clear();flow.review=-1;flow.channel=null;flow.channels.clear();flow.records=[];flow.manualDraft={};flow.simCert=0;flow.simManual=0;flow.feedback='';$('overlay').classList.add('hidden');$('race').classList.remove('hidden');$('hud').classList.remove('hidden');$('pause').classList.remove('hidden');$('view').classList.remove('hidden');$('certRace').classList.toggle('active',role==='cert');$('manualRace').classList.toggle('active',role==='manual');autoCamera=true;overview=false;refresh();sound()}
function setCert(p){flow.certPhase=p;flow.feedback='';flow.correct=false;refresh()}
function setManual(p){flow.manualPhase=p;flow.feedback='';flow.correct=false;refresh()}
function itemPick(i){if(state.role!=='manual'||flow.manualPhase!=='pick')return;if(i!==state.manualItem){msg('Nimm Artikel '+(state.manualItem+1)+' zuerst.');return}flow.selected=i;state.manualRun=true;state.manualStep=0;setManual('photo');msg(jobs[i].name+' ausgewählt')}
function worldTap(e){if(photoShot.active)return;if(state.phase==='intro'&&intro.step===1&&!intro.completed){const r=$('world').getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(pointer,camera);if(intro.model&&ray.intersectObject(intro.model,true).length)completeIntroTask('Foto gespeichert · 1 von 3');return}if(state.phase!=='playing'||state.paused)return;const r=$('world').getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(pointer,camera);const lane=state.role==='cert'?0:1;
const hits=ray.intersectObjects(productsMeshes[lane].map(p=>p.g),true);if(hits.length){let o=hits[0].object;while(o&&!productsMeshes[lane].some(p=>p.g===o))o=o.parent;let i=productsMeshes[lane].findIndex(p=>p.g===o);if(state.role==='cert'&&['approach','photo'].includes(flow.certPhase))act();else if(state.role==='manual'&&flow.manualPhase==='photo'&&i===flow.selected)act();else if(i>=0)itemPick(i);return}
if(state.role==='cert'&&flow.certPhase==='sofa'){const hit=ray.ray.intersectPlane(new T.Plane(v(0,1,0),0),v(0,0,0));if(hit&&hit.x<-3&&hit.z>2){act();return}}
}
function bindInput(){const quality=$('quality');if(quality)quality.onclick=()=>{gfx.mode={auto:'high',high:'eco',eco:'auto'}[gfx.mode];try{localStorage.setItem('certoro.graphics',gfx.mode)}catch{}applyGraphics(true)};const canvas=$('world');let startPt=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};startPt={...drag};canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!drag||!startPt)return;if(Math.hypot(e.clientX-startPt.x,e.clientY-startPt.y)<10)return;autoCamera=false;yaw-=(e.clientX-drag.x)*.005;pitch=clamp(pitch+(e.clientY-drag.y)*.004,.28,1.05);drag={x:e.clientX,y:e.clientY}});canvas.addEventListener('pointerup',e=>{if(startPt&&Math.hypot(e.clientX-startPt.x,e.clientY-startPt.y)<10)worldTap(e);drag=null;startPt=null});canvas.addEventListener('pointercancel',()=>{drag=null;startPt=null});canvas.addEventListener('wheel',e=>{autoCamera=false;dist=clamp(dist+e.deltaY*.012,7,25);e.preventDefault()},{passive:false});document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.code==='Space'&&!e.repeat){if(state.phase==='intro'&&document.activeElement?.tagName==='BUTTON')return;e.preventDefault();if(state.phase==='intro'){if(!$('storyAct').disabled&&!$('storyAct').classList.contains('hidden'))$('storyAct').click()}else if(state.phase==='outro'&&!$('story').classList.contains('hidden'))$('storyAct').click();else if(state.phase==='playing'&&!$('act').disabled&&!$('act').classList.contains('hidden'))$('act').click();else if(state.phase==='menu'&&!$('start').disabled)$('start').click()}if(e.key==='Escape'&&state.phase==='playing')togglePause();if(e.key.toLowerCase()==='c')$('view').click();if(e.key==='ArrowLeft'||e.key==='ArrowRight'){autoCamera=false;yaw+=e.key==='ArrowLeft'?.1:-.1}});$('sound').onclick=()=>{state.muted=!state.muted;if(state.muted){stopVoice();if(ambientGain)ambientGain.gain.setValueAtTime(0,ac.currentTime);}else if(!$('story').classList.contains('hidden')&&voiceLine>=0)replayVoice();$('sound').textContent=state.muted?'Ton aus':'Ton an';if(!state.muted)sound()};$('pause').onclick=togglePause;$('view').onclick=()=>{overview=!overview;autoCamera=true;$('view').textContent=overview?'Fokus':'Übersicht'};$('start').onclick=start;$('act').onclick=act;$('replayVoice').onclick=replayVoice}
function act(){if(state.paused||state.ending||photoShot.active||state.phase!=='playing')return;sound();
 if(state.role==='cert'){switch(flow.certPhase){
 case 'approach':state.autoRun=true;setCert('photo');break;
 case 'photo':startPhotoShot();break;
 case 'sofa':state.autoRun=true;state.autoStep=2;state.autoTime=15;flow.simCert=15;beginLounge();setCert('loungeTravel');break;
 case 'addons':reviewItem=0;reviewTab='listing';reviewMedia='scene';state.autoTime=90;flow.simCert=55;state.autoRun=false;flow.records=jobs.map(j=>({...j}));setCert('review');break;
 case 'review':stopReviewVideo();if(!flow.records.length||flow.records.length!==jobs.length)return;flow.checked=new Set(flow.records.map((_,i)=>i));flow.review=-1;state.autoTime=80;flow.simCert=80;setCert('export');break;
 case 'export':if(!flow.channels.size)return;flow.records.forEach(r=>r.channels=[...flow.channels]);flow.simCert=90;state.autoTime=90;state.autoStep=3;finish();break;
 }}else{const j=jobs[state.manualItem];if(!j)return;switch(flow.manualPhase){
 case 'pick':itemPick(state.manualItem);break;
 case 'photo':capture();flow.manualDraft={photo:true};flow.simManual+=18;state.manualTime=flow.simManual;state.manualStep=1;setManual('identify');break;
 case 'identify':if(!flow.correct)return;flow.manualDraft.ean=j.ean;flow.simManual+=22;state.manualTime=flow.simManual;state.manualStep=2;setManual('title');break;
 case 'title':{let title=$('titleInput').value.trim();if(!title.toLowerCase().includes(j.name.toLowerCase())||title.length<j.name.length+3){msg('Produktname und Zustand eingeben.');return}flow.manualDraft.title=title;setManual('category');break}
 case 'category':if(!flow.correct)return;flow.manualDraft.category=j.category;setManual('description');break;
 case 'description':{let desc=$('descInput').value.trim();if(desc.length<8){msg('Bitte eine kurze Beschreibung eingeben.');return}flow.manualDraft.description=desc;flow.simManual+=40;state.manualTime=flow.simManual;state.manualStep=3;setManual('price');break}
 case 'price':if(!flow.correct)return;flow.manualDraft.price=j.price;flow.simManual+=30;state.manualTime=flow.simManual;state.manualStep=4;setManual('image');break;
 case 'image':if(!flow.correct)return;flow.manualDraft.image='white';setManual('marketing');break;
 case 'marketing':if(!flow.correct)return;flow.manualDraft.marketing=true;flow.simManual+=35;state.manualTime=flow.simManual;state.manualStep=5;setManual('compliance');break;
 case 'compliance':if(!flow.correct)return;flow.manualDraft.compliance='reviewed';setManual('listing');break;
 case 'listing':if(!flow.correct)return;flow.manualDraft.channel=flow.channel;flow.records.push({...flow.manualDraft,sku:j.sku});flow.simManual+=35;state.manualTime=flow.simManual;state.manualItem++;state.manualStep=0;state.manualRun=false;flow.selected=-1;flow.channel=null;flow.manualDraft={};if(state.manualItem===10){finish();return}setManual('pick');msg('Artikel '+state.manualItem+' fertig');break;
 }}}
function fmt(sec){sec=Math.max(0,Math.floor(sec+1e-5));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
function advanceGate(dt){state.gate=Math.min(1,state.gate+dt/4.8);let d=clamp(state.gate*1.9,0,1),travel=clamp((state.gate-.38)/.62,0,1);doorGroups.forEach(g=>g.position.y=3.95*d*d*(3-2*d));pallets.forEach(p=>p.position.z=lerp(-8.6,-1.9,travel*travel*(3-2*travel)));laneLights.forEach(l=>l.material.color.set(state.gate>.45?0x87f943:0xff544f));}
function tick(dt){if(state.phase==='intro'){tickIntro(dt);return}if(state.phase==='outro'){endingScene.elapsed+=dt;return}if(state.phase==='arrival'){advanceGate(dt);if(state.gate>=1)choose();return}if(state.phase!=='playing'||state.paused||state.ending)return;state.elapsed+=dt;
 // Rival is a visual simulation; no timers gate any player action.
 if(state.role==='cert'){state.manualTime=Math.min(1800,state.elapsed);state.manualItem=Math.floor(state.manualTime/180);state.manualStep=Math.min(5,Math.floor((state.manualTime%180)/30));state.manualRun=true}
 else{state.autoTime=Math.min(90,state.elapsed);state.autoStep=state.autoTime<9?0:state.autoTime<15?1:state.autoTime<90?2:3;state.autoRun=state.autoStep<3}
}
function optionList(values,correct,cb){const root=$('taskContent');let el=document.createElement('div');el.className='task-options';values.forEach(x=>{let b=document.createElement('button');b.textContent=x.label||x.value||x;b.onclick=()=>{if(state.paused)return;let value=x.value??x;let ok=correct===null||value===correct;[...el.children].forEach(b=>b.classList.remove('selected','wrong','ok'));b.classList.add(ok?'selected':'wrong');flow.correct=ok;if(ok){if(cb)cb(value);$('act').disabled=false;sound()}else{$('act').disabled=true;msg('Noch nicht richtig. Versuch es erneut.')}};el.append(b)});root.append(el)}
function inputBox(id,placeholder){let el=document.createElement('input');el.id=id;el.className='taskinput';el.placeholder=placeholder;el.autocomplete='off';el.setAttribute('aria-label',placeholder);$('taskContent').append(el)}
// Product outputs are game previews, not real market data or live publications.
let reviewItem=0,reviewTab='listing',reviewMedia='scene',reviewVideoTimer=null;
const reviewRenders=new Map(),money=x=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(x);
function previewProduct(i,style='scene',angle=.58){
 const key=[i,style,angle].join('|');if(reviewRenders.has(key))return reviewRenders.get(key);
 const proto=environmentKit.get('PRODUCT_'+String(i).padStart(2,'0'));
 const c=document.createElement('canvas');c.width=960;c.height=720;
 if(!proto){const ctx=c.getContext('2d');ctx.fillStyle='#e8e6ed';ctx.fillRect(0,0,960,720);productArt(ctx,960,720,i);return c.toDataURL('image/jpeg',.88)}
 const st=new T.Scene(),kitchen=[0,3,4,8].includes(i),workshop=i===2,beauty=i===7,office=[1,6,9].includes(i);const colors=kitchen?[0xe5d9ca,0xa28a71,0xeee4d8]:workshop?[0x414b55,0x6a6f75,0x4a525c]:beauty?[0xe1cdd1,0xc5a1aa,0xf3e1e4]:office?[0x667386,0x7e756e,0x8b9caf]:[0x777584,0x958f9c,0xbcb7cb];st.background=new T.Color(style==='white'?0xf1f2f4:colors[0]);st.add(new T.HemisphereLight(0xffffff,0x6d6479,2.1));
 const l=new T.DirectionalLight(0xfff2de,3.0);l.position.set(3,5,4);l.castShadow=true;l.shadow.mapSize.set(1024,1024);l.shadow.camera.left=-3;l.shadow.camera.right=3;l.shadow.camera.top=3;l.shadow.camera.bottom=-3;l.shadow.bias=-.0005;st.add(l);const fill=new T.DirectionalLight(0xc0d9ff,1.45);fill.position.set(-3,2,-2);st.add(fill);
 const obj=proto.clone(true);const bb=new T.Box3().setFromObject(obj),sz=bb.getSize(v(0,0,0)),cc=bb.getCenter(v(0,0,0)),sc=1.25/Math.max(sz.x,sz.y,sz.z);obj.scale.setScalar(sc);obj.position.set(-cc.x*sc,-bb.min.y*sc,-cc.z*sc);st.add(obj);
 const floor=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshStandardMaterial({color:style==='white'?0xf2f2f4:colors[1],roughness:.83}));floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;st.add(floor);
 if(style!=='white'){
  const prop=(w,h,d,x,y,z,col,rough=.75)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color:col,roughness:rough}));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;st.add(o);return o};
  const roundProp=(r,h,x,y,z,col)=>{const o=new T.Mesh(new T.CylinderGeometry(r,r,h,32),new T.MeshStandardMaterial({color:col,roughness:.75}));o.position.set(x,y,z);o.castShadow=true;st.add(o);return o};
  // Sparse category-specific set dressing, kept behind the product.
  if(kitchen){prop(5,2.1,.08,0,1,-1.65,colors[2]);for(let k=0;k<6;k++)prop(5,.009,.012,0,k*.33,-1.597,0xc2b4a3);for(let k=-5;k<6;k++)prop(.009,2.1,.012,k*.43,1,-1.596,0xc2b4a3);prop(.40,.69,.055,-1.03,.34,-.95,0x9b7852);roundProp(.105,.27,.94,.135,-.95,0xf4eee4)}
  else if(workshop){prop(4,2,.06,0,.98,-1.55,0x414b55);for(let k=-5;k<6;k++)for(let j=0;j<5;j++)roundProp(.012,.012,k*.29,.23+j*.28,-1.506,0x222b35).rotation.x=Math.PI/2;prop(.57,.18,.32,-.96,.09,-.85,0x29313b)}
  else if(beauty){prop(4,2,.055,0,1,-1.65,colors[2]);roundProp(.19,.075,-.96,.037,-.65,0xefe3d5);roundProp(.12,.27,.97,.135,-.75,0xf5eee6)}
  else if(office){prop(4,2,.055,0,1,-1.65,colors[2]);prop(.65,.05,.43,-1.0,.025,-.72,0x333a43);prop(.66,.43,.04,-1.0,.40,-.93,0x373c48);prop(.19,.08,.27,.96,.04,-.69,0xdddce4)}
  else{prop(4,2,.06,0,1,-1.65,colors[2]);roundProp(.20,.24,-1,.12,-.85,0xd4d3da)}
 }
 const cam=new T.PerspectiveCamera(34,4/3,.05,20);cam.position.set(Math.sin(angle)*3.5,.95,Math.cos(angle)*3.5);cam.lookAt(0,Math.max(.25,sz.y*sc*.46),0);
 const rt=new T.WebGLRenderTarget(960,720);rt.texture.colorSpace=T.SRGBColorSpace;const prev=renderer.getRenderTarget();
 try{renderer.setRenderTarget(rt);renderer.render(st,cam);const bytes=new Uint8Array(960*720*4);renderer.readRenderTargetPixels(rt,0,0,960,720,bytes);const ctx=c.getContext('2d'),data=ctx.createImageData(960,720);for(let y=0;y<720;y++)data.data.set(bytes.subarray((719-y)*3840,(720-y)*3840),y*3840);ctx.putImageData(data,0,0)}
 finally{renderer.setRenderTarget(prev);rt.dispose();st.traverse(o=>{if(o.isMesh&&!proto.getObjectById(o.id)&&o.parent===st&&o!==obj){o.geometry.dispose();o.material.dispose()}})}
 const url=c.toDataURL('image/jpeg',.88);reviewRenders.set(key,url);return url;
}
function stopReviewVideo(){if(reviewVideoTimer){clearInterval(reviewVideoTimer);reviewVideoTimer=null}}
function renderReview(root){
 stopReviewVideo();const i=Math.min(reviewItem,flow.records.length-1),r=flow.records[i];if(!r)return;
 const chosen=state.addons,media=chosen.has('photo')||chosen.has('social')||chosen.has('video')||chosen.has('print')||chosen.has('banner');
 const tabs=[['listing','Listing'],...(chosen.has('price')?[['price','Marktpreise']]:[]),...(media?[['media','Medien']]:[]),...(chosen.has('compliance')?[['compliance','Compliance']]:[])];
 if(!tabs.some(t=>t[0]===reviewTab))reviewTab='listing';
 const el=document.createElement('section');el.className='reviewWorkspace';root.append(el);
 const nav=document.createElement('div');nav.className='reviewNav';el.append(nav);
 function btn(parent,label,cb,cls=''){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=()=>{if(!state.paused)cb()};parent.append(b);return b}
 const switchTo=n=>{reviewItem=(n+flow.records.length)%flow.records.length;renderTask()};
 btn(nav,'‹',()=>switchTo(i-1),'reviewArrow');const select=document.createElement('select');select.setAttribute('aria-label','Artikel auswählen');flow.records.forEach((j,k)=>{const o=document.createElement('option');o.value=k;o.textContent=(k+1)+' / '+flow.records.length+' · '+j.name;select.append(o)});select.value=i;select.onchange=()=>switchTo(+select.value);nav.append(select);btn(nav,'›',()=>switchTo(i+1),'reviewArrow');
 const tabbar=document.createElement('div');tabbar.className='reviewTabs';el.append(tabbar);
 for(const [k,label] of tabs)btn(tabbar,label,()=>{reviewTab=k;renderTask()},reviewTab===k?'selected':'');
 const body=document.createElement('div');body.className='reviewBody';el.append(body);
 const image=(style='scene',angle=.58)=>'<img class="reviewImage" alt="'+r.name+' – 3D-Produktvorschau" src="'+previewProduct(i,style,angle)+'">';
 if(reviewTab==='listing'){body.innerHTML='<div class="reviewListing">'+image(chosen.has('photo')?'white':'scene')+'<div><span class="reviewEyebrow">VERKAUFSANGEBOT</span><strong>'+r.title+'</strong><span>'+r.category+' · SKU '+r.sku+'</span><span>EAN '+r.ean+'</span><b class="reviewMoney">'+money(r.price)+'</b><span>'+r.description+'</span></div></div>'}
 if(reviewTab==='price'){const a=[['Preisempfehlung',r.price],['Marktangebot A',r.price+5],['Marktangebot B',r.price+10]],max=r.price+10;body.innerHTML='<div class="reviewPrice"><div class="reviewEyebrow">SIMULIERTER MARKTVERGLEICH</div>'+a.map(([n,p],k)=>'<div class="reviewPriceRow"><span>'+n+'</span><b>'+money(p)+'</b><div class="reviewBar"><i style="width:'+p/max*100+'%;background:'+(k?'#716788':'#c6ff3d')+'"></i></div></div>').join('')+'<small>Beispielpreise im Spiel, keine Live-Marktdaten.</small></div>'}
 if(reviewTab==='compliance'){const isElec=[0,1,2,3,4,5,6,8,9].includes(i);body.innerHTML='<div class="reviewCompliance"><div class="reviewEyebrow">SIMULIERTE COMPLIANCE-PRÜFUNG</div><strong>✓ EAN und Kategorie erfasst</strong><strong>✓ Zustand dokumentiert</strong><span>'+(isElec?'Elektrogerät: WEEE-/Herstellerangaben zur Prüfung vorgemerkt.':'Pflegeprodukt: Kennzeichnung und Produktangaben zur Prüfung vorgemerkt.')+'</span><small>Keine tatsächliche rechtliche Freigabe.</small></div>'}
 if(reviewTab==='media'){
  const options=[...(chosen.has('photo')?[['scene','Lifestyle'],['white','Freisteller']]:[]),...(chosen.has('social')?[['social','Social Post']]:[]),...(chosen.has('video')?[['video','Produktvideo']]:[]),...(chosen.has('print')?[['flyer','Flyer'],['poster','Plakat'],['catalog','Katalog']]:[]),...(chosen.has('banner')?[['banner','eBay-Banner']]:[])];
  if(!options.some(x=>x[0]===reviewMedia))reviewMedia=options[0][0];
  const bar=document.createElement('div');bar.className='reviewMediaTabs';body.append(bar);for(const [k,n] of options)btn(bar,n,()=>{reviewMedia=k;renderTask()},k===reviewMedia?'selected':'');
  const stage=document.createElement('div');stage.className='reviewStage '+reviewMedia;body.append(stage);
  if(['scene','white'].includes(reviewMedia)){stage.innerHTML=image(reviewMedia)}
  else if(reviewMedia==='video'){
   stage.innerHTML=image('scene')+'<button class="reviewPlay" type="button">▶ 3D-Vorschau</button><small>Animierte Produktvorschau · Demo</small>';
   const play=stage.querySelector('button'),img=stage.querySelector('img');play.onclick=()=>{if(reviewVideoTimer){stopReviewVideo();play.textContent='▶ 3D-Vorschau';return}let f=0;play.textContent='Ⅱ';reviewVideoTimer=setInterval(()=>{if(!stage.isConnected){stopReviewVideo();return}img.src=previewProduct(i,'scene',(f++%12)*Math.PI/6)},220)};
  }else{
   const captions={social:'NEU ENTDECKEN',flyer:'JETZT ENTDECKEN',poster:'DEIN NÄCHSTES UPGRADE',catalog:'SORTIMENT / NEUWARE',banner:'UNSER ANGEBOT'};
   stage.innerHTML='<div class="reviewCreative">'+image('scene')+'<div><span>certoro.</span><small>'+captions[reviewMedia]+'</small><strong>'+r.name+'</strong><b>'+money(r.price)+'</b><em>Marketing-Vorschau</em></div></div>';
  }
 }
 const tags=document.createElement('div');tags.className='reviewOutputs';tags.textContent=chosen.size?'Enthalten: '+addons.filter(([k])=>chosen.has(k)).map(([,n])=>n).join(' · '):'Standardangebot · Produktdaten und Bild';el.append(tags);
}

function renderTask(){let cert=state.role==='cert',p=cert?flow.certPhase:flow.manualPhase,j=jobs[Math.min(9,state.manualItem)],title='',detail='',button='Weiter',disabled=false;const root=$('taskContent');const reviewScroll=root.querySelector('.bulkReviewList')?.scrollTop||0;root.replaceChildren();$('act').classList.toggle('manual',!cert);$('act').classList.remove('hidden');$('phaseLabel').textContent=cert?'CERTORO APP':'ARTIKEL '+(state.manualItem+1)+' / 10';$('taskCount').textContent=cert?({approach:'1/6',photo:'2/6',sofa:'3/6',loungeTravel:'3/6',addons:'4/6',review:'5/6',export:'6/6'}[p]):({pick:'1/11',photo:'2/11',identify:'3/11',title:'4/11',category:'5/11',description:'6/11',price:'7/11',image:'8/11',marketing:'9/11',compliance:'10/11',listing:'11/11'}[p]);
 if(cert){switch(p){
 case 'approach':title='Deine 10 Produkte';detail='Tippe auf die Palette oder den Button.';button='Zur Palette gehen';break;
 case 'photo':title='Alle Produkte fotografieren';detail='Certoro erfasst die gesamte Palette auf einmal.';button='Alle Produkte erfassen';break;
 case 'sofa':title='10 Produkte erfasst';detail='Die KI übernimmt. Hol dir einen Kaffee und entspann dich.';button='Zur Lounge gehen';break;
 case 'loungeTravel':title='Zeit für einen Kaffee';detail='Certoro holt seinen Kaffee und setzt sich aufs Sofa.';button='Unterwegs …';disabled=true;break;
 case 'addons':title='Was soll Certoro erledigen?';detail='Wähle zusätzliche Funktionen aus.';button='Auftrag ausführen';let g=document.createElement('div');g.className='task-options';for(let [k,n] of addons){let b=document.createElement('button');b.textContent=n;b.classList.toggle('selected',state.addons.has(k));b.onclick=()=>{if(state.paused)return;state.addons.has(k)?state.addons.delete(k):state.addons.add(k);b.classList.toggle('selected',state.addons.has(k));sound()};g.append(b)}root.append(g);break;
 case 'review':{
 title=flow.records.length+' fertige Verkaufsangebote';detail='Artikel wechseln und die gewählten Ergebnisse ansehen.';button='Alle geprüft – fertig';disabled=flow.records.length!==jobs.length;renderReview(root);break;
 }
 case 'export':{title='Vertriebskanäle wählen';detail='Wo sollen die 10 Angebote erscheinen? Mehrere möglich.';button='Export starten'+(flow.channels.size?' · '+flow.channels.size+' Kanäle':'');disabled=!flow.channels.size;const g=document.createElement('div');g.className='task-options';for(const channel of ['eBay','Shopify','JTL-Wawi CSV','Datei-Export']){const b=document.createElement('button');b.textContent=channel;b.setAttribute('aria-pressed',String(flow.channels.has(channel)));b.classList.toggle('selected',flow.channels.has(channel));b.onclick=()=>{if(state.paused)return;flow.channels.has(channel)?flow.channels.delete(channel):flow.channels.add(channel);b.classList.toggle('selected',flow.channels.has(channel));b.setAttribute('aria-pressed',String(flow.channels.has(channel)));$('act').disabled=!flow.channels.size;$('act').textContent='Export starten'+(flow.channels.size?' · '+flow.channels.size+' Kanäle':'');sound()};g.append(b)}root.append(g);break;}
 }}else{switch(p){
 case 'pick':title=j.name;detail='Nimm den markierten Artikel von der Palette.';button='Artikel aufnehmen';break;
 case 'photo':title='Produktfotografie';detail=j.name+' · einzeln fotografieren';button='Foto aufnehmen';break;
 case 'identify':title='Artikel identifizieren';detail='Artikelnummer (EAN) am Karton: '+j.ean;button='EAN übernehmen';disabled=true;optionList([jobs[(state.manualItem+3)%10].ean,j.ean,jobs[(state.manualItem+6)%10].ean].sort(),j.ean);break;
 case 'title':title='Titel schreiben';detail='Produktname + Zustand';button='Titel speichern';inputBox('titleInput',j.name+' · Neu');break;
 case 'category':title='Kategorie recherchieren';detail=j.name;button='Kategorie übernehmen';disabled=true;optionList([...new Set([j.category,'FAHRZEUG','MÖBEL'])].sort(),j.category);break;
 case 'description':title='Beschreibung schreiben';detail='Zustand und Produkt beschreiben.';button='Beschreibung speichern';inputBox('descInput','z. B. Neu, originalverpackt');break;
 case 'price':title='Marktpreise vergleichen';detail='Wähle den niedrigsten Vergleichspreis: '+(j.price+10)+' €, '+j.price+' €, '+(j.price+5)+' €';button='Verkaufspreis übernehmen';disabled=true;optionList([j.price+10,j.price,j.price+5].map(x=>({label:x+' €',value:x})),j.price);break;
 case 'image':title='Produktbild bearbeiten';detail='Hauptbild für den Shop freistellen.';listingPreview(state.manualItem,'Produktfoto · Vorschau');button='Bild speichern';disabled=true;optionList([{label:'Weißer Hintergrund',value:'white'},{label:'Lagerregal',value:'rack'},{label:'Unbearbeitet',value:'raw'}],'white');break;
 case 'marketing':title='Werbematerial erstellen';detail='Passendes Motiv für das Produkt auswählen.';button='Motiv speichern';disabled=true;optionList([{label:j.name+' · Neu',value:'product'},{label:'Fremder Artikel',value:'other'},{label:'Leeres Motiv',value:'blank'}],'product');break;
 case 'compliance':title='Angaben kontrollieren';detail='Zustand, Kategorie und erforderliche Nachweise prüfen.';button='Prüfung speichern';disabled=true;optionList([{label:'Prüfung durchgeführt',value:'checked'},{label:'Ungeprüft veröffentlichen',value:'skip'}],'checked');break;
 case 'listing':title='Verkaufsangebot veröffentlichen';detail='Wähle einen Verkaufskanal für '+j.name+'.';button='Artikel abschließen';disabled=true;optionList(['eBay','Shopify','JTL-Wawi CSV'],null,val=>flow.channel=val);break;
 }}
 $('phaseTitle').textContent=title;$('phaseText').textContent=detail;$('act').textContent=button;$('act').disabled=disabled||state.paused;
}
function updateUI(){if(state.phase!=='playing'&&state.phase!=='done')return;const cert=state.role==='cert',acount=cert?(flow.certPhase==='review'?10:flow.certPhase==='export'||state.ending?10:0):Math.min(10,Math.floor(Math.max(0,state.autoTime-15)/7.5));$('timer').textContent=fmt(state.elapsed);$('certScore').textContent=acount+' / 10';$('manualScore').textContent=state.manualItem+' / 10';$('certBar').style.width=(acount*10)+'%';$('manualBar').style.width=(state.manualItem*10)+'%';$('viewfinder').classList.toggle('hidden',!(state.phase==='playing'&&!photoShot.active&&(cert?flow.certPhase==='photo':flow.manualPhase==='photo')));let key=[state.role,flow.certPhase,flow.manualPhase,state.manualItem,flow.review,flow.checked.size,state.paused].join('|');if(state.phase==='playing'&&key!==flow.uiKey){flow.uiKey=key;renderTask()}updateScreen()}

let endingScene={elapsed:0,said:false,observed:false,rival:false,waypoint:0,arrived:false,arrivedAt:0};
function finish(){
 if(state.ending)return;state.ending=true;state.paused=false;
 if(state.role!=='cert'){showResult();return}
 state.phase='outro';endingScene.elapsed=0;endingScene.said=false;endingScene.observed=false;endingScene.rival=false;endingScene.waypoint=0;endingScene.arrived=false;endingScene.arrivedAt=0;
 $('hud').classList.add('hidden');$('viewfinder').classList.add('hidden');$('targetMarker').classList.add('hidden');
 $('top').classList.add('cinematic');$('chapter').classList.remove('hidden');$('chapter').textContent='04 / SCHON FERTIG';
 $('story').classList.add('hidden');$('certScore').textContent='10 / 10';$('certBar').style.width='100%';
 sound('done');autoCamera=true;
}
function watchColleague(dt,time){
 const t=endingScene.elapsed;
 const route=[[-4.8,0,5.35],[3.35,0,5.35],[3.35,0,4.50]];
 certTarget.set(...route[Math.min(endingScene.waypoint,2)]);
 let delta=certTarget.clone().sub(certPos),d=delta.length();
 if(d<.045&&!endingScene.arrived){if(endingScene.waypoint<2){endingScene.waypoint++;certTarget.set(...route[endingScene.waypoint]);delta=certTarget.clone().sub(certPos);d=delta.length()}else{endingScene.arrived=true;endingScene.arrivedAt=t;}}
 const walking=!endingScene.arrived&&d>.045;
 certPos.lerp(certTarget,Math.min(1,dt*1.85/Math.max(.001,d)));model.position.copy(certPos);
 model.rotation.y=angleTo(model.rotation.y,walking?Math.atan2(delta.x,delta.z):Math.PI/2,dt);
 play(walking?'walk':voicePlaying&&voiceWho==='Certoro'?'talk':'idle');advanceCertoroPose(dt);updateCoffee(dt);if(phoneModel)phoneModel.visible=false;
 manualTarget.set(4.7,0,4.1);manualPos.lerp(manualTarget,1-Math.exp(-dt*4));worker.g.position.copy(manualPos);worker.g.rotation.y=angleTo(worker.g.rotation.y,endingScene.arrived?Math.atan2(certPos.x-manualPos.x,certPos.z-manualPos.z):Math.PI,dt);
 worker.arms.forEach(([a,f],i)=>{a.rotation.x=-.72+Math.sin(time*8+i)*.10;a.rotation.z=(i?1:-1)*.12;f.rotation.x=-.65+Math.sin(time*11+i)*.16});worker.legs.forEach(([a,k])=>{a.rotation.x=0;k.rotation.x=0});worker.torso.rotation.x=endingScene.arrived?0:.10;scanBeam.visible=false;
 if(endingScene.arrived&&t-endingScene.arrivedAt>=.45&&!endingScene.said){endingScene.said=true;$('story').classList.remove('hidden');$('story').classList.add('bull');$('storyTag').textContent='10 / 10 ANGEBOTE FERTIG';$('speaker').textContent='Certoro';$('storyLine').textContent='Ich bin fertig. Wie weit bist du?';$('storyTask').replaceChildren();$('storyAct').textContent='Weiter';$('storyAct').disabled=false;$('storyAct').onclick=()=>{if(endingScene.observed){$('story').classList.add('hidden');$('chapter').classList.add('hidden');showResult()}else{endingScene.observed=true;$('story').classList.remove('bull');$('speaker').textContent='Lagerleiter';$('storyTag').textContent='NOCH MITTEN IN DER ARBEIT';$('storyLine').textContent='Ich bin noch dabei, die Artikel einzeln anzulegen …';$('storyAct').textContent='Ergebnis ansehen';say($('storyLine').textContent,'Lagerleiter')}};say($('storyLine').textContent,'Certoro')}
}
function showResult(){
 stopVoice();for(const id of ['story','chapter','viewfinder','hud','targetMarker','race','pause','view'])$(id).classList.add('hidden');
 state.ending=true;state.phase='done';state.paused=false;sound('done');
 const selected=addons.filter(a=>state.addons.has(a[0])).map(a=>a[1]);
 const destinations=[...new Set(flow.channels)];
 const items=arr=>arr.map(x=>'<span class="resultChip"><i>✓</i>'+x+'</span>').join('');
 $('overlay').classList.add('resultMode');
 $('panel').innerHTML='<div class="resultShell"><div class="eyebrow">AUFTRAG ABGESCHLOSSEN</div><div class="resultHero">Weniger Aufwand.<span>Mehr Verkauf.</span></div><div class="resultMain"><div class="resultMainNumber">95<span>%</span></div><div class="resultMainLabel">weniger Zeitaufwand*</div><div class="resultCompare"><div><span>Certoro</span><strong>01:30</strong></div><div><span>Manuell</span><strong>30:00</strong></div></div><div class="compareTrack"><i></i></div></div><div class="resultMeta"><b>10</b> Produkte vorbereitet <span>·</span> Spielzeit <b>'+fmt(state.elapsed)+'</b></div>'+(state.role==='cert'?'<div class="resultDetails">'+(selected.length?'<section><h3>Zusatzfunktionen</h3><div class="resultChips">'+items(selected)+'</div></section>':'')+(destinations.length?'<section><h3>Vertriebskanäle</h3><div class="resultChips">'+items(destinations)+'</div></section>':'')+'</div>':'')+'<a class="resultCTA" href="https://certoro.de/" target="_blank" rel="noopener">Certoro entdecken ↗</a><button class="resultReplay" id="restart">Noch einmal spielen</button><p class="summary-note">*Simulierter Arbeitsaufwand, keine gemessene Produktleistung. Die Bearbeitung im Spiel ist beschleunigt.</p></div>';
 $('overlay').classList.remove('hidden');$('restart').onclick=()=>location.reload();
}
function updateTarget(){if(photoShot.active){$('targetMarker').classList.add('hidden');return;}let marker=$('targetMarker');if(state.phase!=='playing'||state.paused){marker.classList.add('hidden');return}let pos;if(state.role==='cert'){if(flow.certPhase==='approach'||flow.certPhase==='photo')pos=v(-3.25,1.15,-1.9);if(flow.certPhase==='sofa')pos=v(-4.8,1.0,3.25)}else if(flow.manualPhase==='pick'||flow.manualPhase==='photo'){let p=productsMeshes[1][state.manualItem];if(p)pos=p.g.getWorldPosition(v(0,0,0)).add(v(0,.85,0))}if(!pos){marker.classList.add('hidden');return}camera.updateMatrixWorld();pos.project(camera);if(pos.z>1||Math.abs(pos.x)>1||Math.abs(pos.y)>1){marker.classList.add('hidden');return}marker.style.left=(pos.x*.5+.5)*innerWidth+'px';marker.style.top=(-pos.y*.5+.5)*innerHeight+'px';marker.classList.remove('hidden')}

/* V11: explicit obstacle-free approach, coffee pickup and front-facing sit. */
const LOUNGE_ROUTE=[
 {kind:'walk',x:-2.20,z:1.65},
 {kind:'walk',x:-2.20,z:4.34},
 {kind:'pick',x:-2.20,z:4.34,yaw:-Math.PI/2,duration:1.85},
 {kind:'walk',x:-2.20,z:5.35},
 {kind:'walk',x:-4.80,z:5.35},
 {kind:'walk',x:-4.80,z:4.17},
 {kind:'turn',x:-4.80,z:4.17,yaw:0,duration:.34},
 {kind:'seat',x:-4.80,z:3.40,yaw:0,duration:.78}
];
const lounge={active:false,index:0,time:0,held:false,seated:false,from:null,reach:0,side:null};
const COFFEE_HOME=[-2.86,.76,4.10];
function resetLounge(){
 Object.assign(lounge,{active:false,index:0,time:0,held:false,seated:false,from:null,reach:0,side:null});
 if(coffeeCup){scene.attach(coffeeCup);coffeeCup.position.set(...COFFEE_HOME);coffeeCup.rotation.set(0,0,0)}
}
function beginLounge(){
 if(lounge.active||lounge.seated)return;
 lounge.active=true;lounge.index=0;lounge.time=0;lounge.from=null;
}
function angleTo(from,to,dt){
 const delta=Math.atan2(Math.sin(to-from),Math.cos(to-from));
 return from+delta*Math.min(1,dt*12);
}
function advanceLounge(dt){
 if(!lounge.active||!model)return;
 const step=LOUNGE_ROUTE[lounge.index];if(!step)return;
 const target=v(step.x,0,step.z);
 let done=false,pose='idle',fade=.18;
 if(step.kind==='walk'){
  const d=target.clone().sub(certPos),len=d.length();
  if(len>.001){model.rotation.y=angleTo(model.rotation.y,Math.atan2(d.x,d.z),dt);certPos.addScaledVector(d,Math.min(1,dt*1.75/len))}
  done=certPos.distanceTo(target)<.015;if(done)certPos.copy(target);
  pose='walk';
 }else{
  lounge.time+=dt;
  const t=clamp(lounge.time/step.duration,0,1);
  model.rotation.y=angleTo(model.rotation.y,step.yaw,dt);
  if(step.kind==='pick'){
   pose='coffeeBend';fade=.32;
   lounge.reach=t<.60?motionSmooth(.12,.60,t):1-motionSmooth(.60,.95,t);
   if(t>=.60&&!lounge.held){lounge.held=true;lounge.grabBlend=0;sound('scan')}
  }else if(step.kind==='seat'){
   if(!lounge.from)lounge.from=certPos.clone();
   const u=t*t*(3-2*t);certPos.copy(lounge.from).lerp(target,u);
   pose='sit';fade=.70;
  }
  done=t>=1;
 }
 model.position.copy(certPos);play(pose,fade);
 if(done){
  lounge.index++;lounge.time=0;lounge.from=null;lounge.reach=0;
  if(lounge.index>=LOUNGE_ROUTE.length){
   lounge.active=false;lounge.seated=true;certPos.copy(target);model.position.copy(certPos);model.rotation.y=0;play('sit');
   if(state.role==='cert'&&flow.certPhase==='loungeTravel')setCert('addons');
  }
 }
}
function aimCoffeeArm(side,target,weight){
 const upper=model.getObjectByName('UpperArm'+side),fore=model.getObjectByName('Forearm'+side),hand=model.getObjectByName('Hand'+side);
 if(!upper||!fore||!hand)return;
 model.updateMatrixWorld(true);
 const wp=o=>o.getWorldPosition(v(0,0,0)),a=wp(upper),b=wp(fore),c=wp(hand);
 const goal=c.clone().lerp(target,weight),axis=goal.clone().sub(a),l1=a.distanceTo(b),l2=b.distanceTo(c);
 if(axis.length()<.001||l1<.001||l2<.001)return;
 const d=clamp(axis.length(),Math.abs(l1-l2)+.001,l1+l2-.002);axis.normalize();
 const forward=v(0,0,1).applyAxisAngle(v(0,1,0),model.rotation.y),out=v(side==='L'?1:-1,0,0).applyAxisAngle(v(0,1,0),model.rotation.y);
 const elbowDir=out.multiplyScalar(.55).add(v(0,-1,0)).addScaledVector(forward,-.15);
 elbowDir.addScaledVector(axis,-elbowDir.dot(axis));if(elbowDir.length()<.01)elbowDir.set(0,-1,0);
 const along=(l1*l1-l2*l2+d*d)/(2*d);
 const elbow=a.clone().addScaledVector(axis,along).addScaledVector(elbowDir.normalize(),Math.sqrt(Math.max(0,l1*l1-along*along)));
 const end=a.clone().addScaledVector(axis,d);
 function aim(bone,child,point){
  const p=wp(bone),from=wp(child).sub(p).normalize(),to=point.clone().sub(p).normalize();
  const q=new T.Quaternion().setFromUnitVectors(from,to).multiply(bone.getWorldQuaternion(new T.Quaternion()));
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));model.updateMatrixWorld(true);
 }
 aim(upper,fore,elbow);aim(fore,hand,end);
}
function updateCoffee(dt=.016){
 if(!model||!coffeeCup||!tripoMotion)return;
 if(!lounge.held&&lounge.reach<=0)return;
 model.updateMatrixWorld(true);
 if(!lounge.side){
  const target=v(...COFFEE_HOME).add(v(.103,0,0));
  const l=model.getObjectByName('UpperArmL'),r=model.getObjectByName('UpperArmR');
  lounge.side=l.getWorldPosition(v(0,0,0)).distanceTo(target)<r.getWorldPosition(v(0,0,0)).distanceTo(target)?'L':'R';
 }
 const side=lounge.side,upper=model.getObjectByName('UpperArm'+side);
 const forward=v(0,0,1).applyAxisAngle(v(0,1,0),model.rotation.y);
 const outward=v(side==='L'?1:-1,0,0).applyAxisAngle(v(0,1,0),model.rotation.y);
 const shoulder=upper.getWorldPosition(v(0,0,0));
 const picking=lounge.active&&LOUNGE_ROUTE[lounge.index]?.kind==='pick';
 const rise=picking&&lounge.held?motionSmooth(.60,.96,lounge.time/LOUNGE_ROUTE[lounge.index].duration):lounge.held?1:0;
 const cupYaw=model.rotation.y+(side==='R'?Math.PI:0);
 const homeHandle=v(...COFFEE_HOME).add(v(.104,.003,0));
 const carry=shoulder.clone().addScaledVector(forward,.26).addScaledVector(outward,.045).add(v(0,-.38,0));
 const want=homeHandle.clone().lerp(carry,rise);
 const handleOut=v(1,0,0).lerp(outward,rise).normalize();
 const normal=handleOut.clone().negate(),f=v(0,-1,0).addScaledVector(forward,.20*rise);
 const pose=gripPose(side,normal,f);
 const grip=applyGrip(side,want,pose,lounge.held?1:lounge.reach);
 if(lounge.held){
  // The handle's center is the shared contact. Keep the cup upright as the hand
  // turns, and leave the table without a positional jump.
  const yaw=Math.atan2(-handleOut.z,handleOut.x),q=new T.Quaternion().setFromAxisAngle(v(0,1,0),yaw);
  const center=grip.clone().sub(v(.104,.003,0).applyQuaternion(q));
  if(picking&&rise<.04){const k=motionSmooth(0,.04,rise);center.lerp(v(...COFFEE_HOME),1-k)}
  setWorldPose(coffeeCup,center,q);
 }
}

function updateActors(dt,time){if(state.phase==='outro'){watchColleague(dt,time);return}if(cinematicActors(dt,time))return;if(intro.desk)intro.desk.visible=false;let auto=state.autoStep,run=state.autoRun;
 if(state.role==='manual'&&state.phase==='playing'&&auto>=1&&auto<3&&!lounge.active&&!lounge.seated)beginLounge();
 if(lounge.active){advanceLounge(dt)}
 else{
  certTarget.set(-3.1,0,2.25);let cp='idle';
  if(state.phase==='playing'||state.phase==='done'){
   if(auto===0&&run){certTarget.set(-3.25,0,.10);cp='point'}
   if(auto>=1){certTarget.set(-3.25,0,.10);cp='idle'}
   if(lounge.seated){certTarget.set(-4.8,0,3.40);cp='sit'}
   if(state.role==='manual'&&auto>=3){
    if(lounge.seated&&certPos.z<5.31){certTarget.set(-4.8,0,5.35);cp='walk'}
    else{lounge.seated=false;certTarget.set(3.35,0,5.35);if(certPos.x>3.30)certTarget.set(3.35,0,4.50);cp='idle'}
   }
  }
  const delta=certTarget.clone().sub(certPos),d=delta.length();certPos.lerp(certTarget,Math.min(1,dt*1.75/Math.max(.001,d)));
  if(model){model.position.copy(certPos);const facingPallet=state.role==='cert'&&((auto===0&&run&&flow.certPhase==='photo')||flow.certPhase==='sofa');const aim=facingPallet?photoAim().sub(certPos):delta;const angle=facingPallet?Math.atan2(aim.x,aim.z):d>.25?Math.atan2(delta.x,delta.z):(state.role==='manual'&&auto>=3?Math.PI/2:0);model.rotation.y=angleTo(model.rotation.y,angle,dt);if(d>.15&&cp!=='sit')cp='walk';play(cp)}
 }
 if(phoneModel)phoneModel.visible=false;
 advanceCertoroPose(state.paused?0:dt);updateCoffee(state.paused?0:dt);
 scanBeam.visible=state.phase==='playing'&&auto===0&&run;scanBeam.position.y=.28+((time*1.2)%1)*.95;scanBeam.material.opacity=.11+.10*Math.sin(time*4)**2;updatePhoneDraw(dt);
 if(state.phase==='playing'||state.phase==='done'){let k=state.manualStep;manualTarget.set(k<1?3.25:4.7,0,k<1?.15:4.10);manualPose=state.manualRun?(k<1?'photo':'work'):'idle'}else{manualTarget.set(3.1,0,2.25);manualPose='idle'}let md=manualPos.distanceTo(manualTarget);manualPos.lerp(manualTarget,1-Math.exp(-dt*2.7));worker.g.position.copy(manualPos);worker.g.rotation.y=lerp(worker.g.rotation.y,manualPose==='photo'?Math.PI:manualPose==='work'?Math.PI:0,1-Math.exp(-dt*5));let t=time*5;worker.arms.forEach(([a,f],i)=>{a.rotation.x=md>.2?Math.sin(t)*(i?1:-1)*.45:manualPose==='work'?-0.65:manualPose==='photo'?-1.03:0;a.rotation.z=(i?1:-1)*.12;f.rotation.x=manualPose==='work'?-.65+Math.sin(t*2+i)*.12:manualPose==='photo'?-.80:0});worker.legs.forEach(([a,k],i)=>{a.rotation.x=md>.2?Math.sin(t)*(i?-1:1)*.38:0;k.rotation.x=md>.2?Math.max(0,-Math.sin(t)*(i?-1:1))*.5:0});worker.torso.rotation.x=manualPose==='work'?.10:0;let acount=state.autoTime<15?0:Math.min(10,Math.floor((state.autoTime-15)/7.5+1e-7)),mcount=state.manualItem;for(let lane=0;lane<2;lane++)productsMeshes[lane].forEach((p,i)=>{let done=i<(lane?mcount:acount);p.marker.material.opacity=done?.8:(state.phase==='playing'&&state.role==='manual'&&lane===1&&i===state.manualItem?.25:0);p.mesh.scale.y=1;
 let destination=p.base.clone();
 if(lane===1&&state.phase==='playing'&&state.role==='manual'&&i===flow.selected&&flow.manualPhase!=='pick'){
  if(flow.manualPhase!=='photo')destination=pallets[1].worldToLocal(v(4.05,1.11,3.20));
  else destination=pallets[1].worldToLocal(v(3.25,1.0,-.42));
 }
 p.g.position.lerp(destination,1-Math.exp(-dt*4))});}
function loop(){requestAnimationFrame(loop);let elapsedDelta=clock.getDelta(),dt=Math.min(elapsedDelta,.12),time=performance.now()/1000;tick(document.hidden?0:elapsedDelta);updateActors(state.paused?0:dt,time);updatePhotoShot(state.paused?0:dt);animateWorkerFace(time,dt);polishWorkerMotion(state.paused?0:dt,time);updateContactShadows();adaptGraphics(elapsedDelta*1000);updateAmbience();if(!cinematicCamera(dt)&&autoCamera){let playing=state.phase==='playing'&&!overview,portrait=innerWidth/innerHeight<.8;let focus=playing?(state.role==='cert'?(lounge.active?certPos.x:state.autoStep>=1?-4.8:-3.15):3.55):0;let targetZ=playing?(state.role==='cert'&&lounge.active?certPos.z:state.role==='cert'&&state.autoStep>=1?3.9:state.role==='manual'&&state.manualStep>0?2.3:-.15):-.2;const pan=1-Math.exp(-dt*2.14),zoom=1-Math.exp(-dt*1.52);camTarget.x=lerp(camTarget.x,focus,pan);camTarget.z=lerp(camTarget.z,targetZ,pan);camTarget.y=lerp(camTarget.y,playing?(state.role==='cert'&&state.autoStep>=2?(lounge.active?.55:.18):1.0):.8,pan);yaw=lerp(yaw,.05,zoom);pitch=lerp(pitch,playing?(portrait?.54:.39):(portrait?.76:.55),zoom);dist=lerp(dist,playing?(portrait?8.8:9.6):(portrait?23:17.5),zoom)}camera.position.set(camTarget.x+Math.sin(yaw)*Math.cos(pitch)*dist,camTarget.y+Math.sin(pitch)*dist,camTarget.z+Math.cos(yaw)*Math.cos(pitch)*dist);camera.lookAt(camTarget);if(time-lastUi>.15){lastUi=time;updateUI()}updateTarget();renderer.render(scene,camera)}
try{init()}catch(e){console.error(e);$('loading').textContent='WebGL ist nicht verfügbar. Bitte einen aktuellen Browser verwenden.'}




