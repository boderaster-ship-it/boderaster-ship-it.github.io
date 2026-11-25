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
function sound(kind='tick'){if(state.muted)return;try{ac??=new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();let o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;o.type=kind==='scan'?'sine':'triangle';o.frequency.setValueAtTime(kind==='done'?660:kind==='scan'?1000:kind==='gate'?110:480,t);o.frequency.exponentialRampToValueAtTime(kind==='done'?990:kind==='scan'?1600:240,t+.12);g.gain.setValueAtTime(.065,t);g.gain.exponentialRampToValueAtTime(.001,t+.22);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+.23)}catch{}}
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

const ENV_MODEL='https://d2ol7oe51mr4n9.cloudfront.net/user_3JoVMcU64SCr3ZOXnqrL8fUEJOx/a7cb84aa-3830-4274-a882-c87ffe082f83.glb';
const environmentKit=new Map();
const PRODUCT_ATLAS='https://d2ol7oe51mr4n9.cloudfront.net/user_3JoVMcU64SCr3ZOXnqrL8fUEJOx/7e4de1f5-eb9f-4bd4-823e-a14660d22814.jpg';
let productAtlas=null;
function loadProductAtlas(){
 return new Promise(resolve=>{const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{productAtlas=image;resolve(true)};image.onerror=()=>resolve(false);image.src=PRODUCT_ATLAS});
}
async function loadEnvironmentKit(){
 try{
  const gltf=await new GLTFLoader().loadAsync(ENV_MODEL);gltf.scene.updateMatrixWorld(true);
  for(const name of ['SOFA','TABLE','RACK','GATE','SHUTTER','PALLET','DESK','WALL','CARTON']){
   const root=gltf.scene.getObjectByName('KIT_'+name);if(!root)throw Error('Missing asset '+name);
   const inv=root.matrixWorld.clone().invert(),batches=new Map();
   root.traverse(o=>{if(!o.isMesh)return;const geo=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone());geo.applyMatrix4(inv.clone().multiply(o.matrixWorld));const key=o.material.uuid;let b=batches.get(key);if(!b)batches.set(key,b={material:o.material,geo:[]});b.geo.push(geo)});
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
function removeLegacy(root,keep=[]){for(const o of [...root.children])if(!keep.includes(o))root.remove(o)}

function makePallet(x,z,lane){const g=group(scene,x,0,z);for(let i=0;i<5;i++)box(g,.42,.12,2.0,-.9+i*.45,.18,0,mat(0xa16d3b,.9));for(let i=0;i<3;i++)box(g,2.2,.12,.27,0,.06,-.73+i*.73,0x785130);const cart=group(g,0,-.03,0);box(cart,2.38,.13,2.14,0,.09,0,0x323746);for(let a of [-1,1])for(let b of [-1,1]){let wh=cyl(cart,.12,.12,.11,a*1.02,.11,b*.83,0x16151c);wh.rotation.z=Math.PI/2}
 if(environmentKit.has('PALLET')){removeLegacy(g);mountKit('PALLET',g)}
 products.forEach((p,i)=>{let col=i%5,row=Math.floor(i/5),px=-.86+col*.43,pz=-.46+row*.91;let h=.55+((i*17)%4)*.10;const item=group(g,px,.25,pz);const tx=texture(512,512,(ctx,W,H)=>{const c=ctx;c.save();c.scale(2,2);W=256;H=256;c.fillStyle='#e9dfcd';c.fillRect(0,0,W,H);c.fillStyle=p[2];c.fillRect(0,0,W,45);c.fillStyle='#20162f';c.font='bold 22px Arial';c.fillText(p[0].slice(0,18),12,85);c.font='15px Arial';c.fillText(p[1],12,113);c.save();c.translate(57,113);productArt(c,142,99,i);c.restore();c.fillStyle='#222';for(let k=0;k<36;k++)if((k*i+k*3)%5>1)c.fillRect(18+k*3,221,2,20);c.font='12px Arial';c.fillText('SKU '+(1001+i),144,238);c.restore()});const bm=mat(0xc6ac86,.86);const face=new T.MeshStandardMaterial({map:tx,roughness:.72});const ms=[bm,bm,bm,bm,face,bm];const mesh=box(item,.39,h,.76,0,h/2,0,ms);if(environmentKit.has('CARTON')){mesh.visible=false;const shell=mountKit('CARTON',item);shell.scale.set(.39,h,.76);const panel=new T.Mesh(new T.PlaneGeometry(.363,h*.95),face);panel.position.set(0,h/2,.381);panel.receiveShadow=true;item.add(panel)}box(item,.045,.009,.76,0,h+.005,0,0xe0c79f);box(item,.39,.013,.045,0,h+.006,0,0xe0c79f);const marker=box(item,.38,.015,.74,0,h+.018,0,new T.MeshBasicMaterial({color:P.lime,transparent:true,opacity:.0}),false);productsMeshes[lane].push({g:item,marker,mesh,base:item.position.clone()});});return g}
function makeRack(x,z){const g=group(scene,x,0,z);if(mountKit('RACK',g))return g;for(const xx of [-1.05,1.05])for(const zz of [-.43,.43])box(g,.085,3.25,.085,xx,1.625,zz,mat(0x454454,.5,.7));for(let lev=0;lev<3;lev++){const y=.25+lev*1.13;box(g,2.2,.09,1.0,0,y,0,0x43485b);box(g,2.2,.07,.1,0,y+.06,.5,P.purple);for(let j=0;j<3;j++){box(g,.60,.64,.76,-.69+j*.69,y+.37,0,mat([0x9b7750,0xb69c77,0x7b685a][(j+lev)%3]));box(g,.26,.16,.012,-.69+j*.69,y+.4,.39,0xddd9ca,false)}}}
function makeDoor(x,lane){const g=group(scene,x,0,-6.9);box(g,4.35,.18,.5,0,3.95,0,mat(0x5a556b,.42,.7));for(let i of [-1,1]){box(g,.20,4.15,.55,i*2.17,2.07,0,mat(0x59556b,.45,.7));box(g,.08,3.95,.03,i*2.02,2,.28,P.purple)}box(g,4.1,3.8,.1,0,1.9,-.36,mat(0x08070e),false);const roll=group(g,0,0,0);for(let i=0;i<15;i++){box(roll,4.03,.245,.17,0,.13+i*.251,.07,mat(i%2===0?0x505467:0x45495b,.46,.62));box(roll,4.0,.018,.025,0,.25+i*.251,.18,0x777b8e,false)}if(environmentKit.has('GATE')){removeLegacy(g,[roll]);mountKit('GATE',g);removeLegacy(roll);mountKit('SHUTTER',roll)}doorGroups.push(roll);sign(g,lane?'TOR 02':'TOR 01',lane?'MANUELL':'CERTORO',2.6,.65,0,4.42,.33,lane?'#ffb46b':'#c6ff3d');const l=box(g,.75,.10,.14,0,3.85,.37,new T.MeshBasicMaterial({color:0xff544f}),false);laneLights.push(l)}
function desk(){const g=group(scene,4.7,0,3.15);box(g,2.1,.14,1.05,0,1.02,0,mat(0x383344,.5));for(let x of [-.85,.85])for(let z of [-.4,.4])box(g,.08,1,.08,x,.5,z,0x514e61);box(g,1.04,.64,.10,0,1.47,-.30,0x16141e);box(g,1.1,.08,.34,0,1.10,-.27,0x22202b);screenCanvas=document.createElement('canvas');screenCanvas.width=512;screenCanvas.height=320;screenTexture=new T.CanvasTexture(screenCanvas);screenTexture.colorSpace=T.SRGBColorSpace;const screenPlane=plane(g,.98,.57,0,1.47,-.241,screenTexture);box(g,.75,.04,.28,0,1.10,.27,0x17141e);for(let j=0;j<5;j++)box(g,.24,.025,.32,-.69,1.11+j*.024,.15,0xe8e6df);box(g,.27,.13,.18,.74,1.16,.05,0x252338);const chair=group(g,0,0,1.03);box(chair,.64,.13,.64,0,.46,0,0x30273b);box(chair,.62,.58,.13,0,.78,.30,0x30273b);cyl(chair,.07,.12,.38,0,.24,0,0x6b6673);for(let j=0;j<5;j++){let a=j*2*Math.PI/5;box(chair,.08,.065,.35,Math.sin(a)*.16,.07,Math.cos(a)*.16,0x55505f).rotation.y=a}if(environmentKit.has('DESK')){removeLegacy(g,[screenPlane]);mountKit('DESK',g)}}
function sofa(){let g=group(scene,-4.8,0,3.25);box(g,2.65,.34,.90,0,.27,0,mat(0x2b1947,.68));for(let j=0;j<3;j++){box(g,.78,.22,.78,-.8+j*.8,.42,.03,mat(0x513080,.8));box(g,.78,.66,.22,-.8+j*.8,.75,-.43,mat(0x623b9b,.78));}for(let k of [-1,1])box(g,.24,.63,1.12,k*1.3,.53,0,mat(0x382252,.8));box(g,2.55,.025,1.65,0,.02,.4,mat(0x4a3a6b,.94));let t=group(scene,-3.1,0,4.3);cyl(t,.42,.42,.09,0,.64,0,0x4f3c69);cyl(t,.07,.10,.62,0,.31,0,0x6b5b89);if(environmentKit.has('SOFA')){removeLegacy(g);mountKit('SOFA',g)}if(environmentKit.has('TABLE')){removeLegacy(t);mountKit('TABLE',t)}coffeeCup=group(t,.24,.76,-.20);cyl(coffeeCup,.075,.055,.15,0,0,0,0xf5f1e8);cyl(coffeeCup,.065,.065,.008,0,.078,0,0x573922);sign(scene,'CERTORO LOUNGE','KI ARBEITET. DU NICHT.',2.8,.7,-4.8,2.85,2.60)}
function buildWorker(){const g=group(scene,3.1,0,2.25);const skin=mat(0xd99f73,.6),cloth=mat(0x344253,.8),vest=mat(0xe5a541,.65),shoe=mat(0x211c2b,.7);let torso=group(g,0,1.15,0);ell(torso,0,.25,0,.30,.40,.18,cloth);box(torso,.48,.48,.32,0,.27,0,vest);box(torso,.48,.065,.33,0,.40,0,0xf6db86);box(torso,.08,.46,.34,0,.25,0,cloth);box(torso,.16,.075,.015,.125,.36,.176,mat(0xf0e6d5,.5));box(torso,.15,.12,.015,-.145,.23,.176,cloth);ell(torso,0,.77,.015,.19,.23,.18,skin);ell(torso,0,.89,-.01,.20,.12,.18,0x42362e);const cap=ell(torso,0,.96,0,.21,.085,.20,0x45556b);box(torso,.29,.035,.19,0,.93,.15,0x45556b);for(let s of [-1,1])ell(torso,s*.069,.79,.16,.025,.021,.018,0x171822);ell(torso,0,.75,.185,.043,.035,.04,skin);let arms=[],legs=[];for(let s of [-1,1]){let arm=group(torso,s*.32,.52,0);ell(arm,0,-.15,0,.105,.21,.11,cloth);let fore=group(arm,0,-.31,0);ell(fore,0,-.15,0,.088,.18,.09,skin);ell(fore,0,-.30,.015,.09,.11,.07,skin);arms.push([arm,fore]);let leg=group(g,s*.14,1.15,0);ell(leg,0,-.25,0,.13,.29,.135,cloth);let shin=group(leg,0,-.51,0);ell(shin,0,-.22,0,.105,.25,.115,cloth);ell(shin,0,-.48,.07,.12,.095,.20,shoe);legs.push([leg,shin])}return {g,torso,arms,legs}}
function warehouse(){scene.background=new T.Color(0x171326);scene.fog=new T.Fog(0x171326,25,55);const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.65;pmrem.dispose();const hem=new T.HemisphereLight(0xe9edff,0x31323a,.85);scene.add(hem);const key=new T.DirectionalLight(0xfff0dc,2.75);key.position.set(-6,11,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-11;key.shadow.camera.right=11;key.shadow.camera.top=11;key.shadow.camera.bottom=-11;key.shadow.normalBias=.025;key.shadow.bias=-.0002;key.shadow.radius=2;scene.add(key);const fill=new T.DirectionalLight(0xc5d9ff,1.15);fill.position.set(7,6,-5);scene.add(fill);const floorTx=texture(1024,1024,(c,w,h)=>{
 const im=c.createImageData(w,h);let seed=317;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  seed=(seed*1664525+1013904223)>>>0;const n=(seed>>>24)/255;let value=77+13*Math.sin(x*.012)*Math.sin(y*.008)+10*Math.sin((x+y)*.031)+12*(n-.5);
  const i=(y*w+x)*4;im.data[i]=value;im.data[i+1]=value+3;im.data[i+2]=value+8;im.data[i+3]=255;
 }c.putImageData(im,0,0);c.strokeStyle='#282d36';c.lineWidth=3;c.strokeRect(1,1,w-2,h-2);
 c.strokeStyle='#a9acb238';c.lineWidth=1;c.strokeRect(5,5,w-10,h-10);
});floorTx.wrapS=floorTx.wrapT=T.RepeatWrapping;floorTx.repeat.set(5,4);box(scene,20,.20,16,0,-.12,-.3,new T.MeshStandardMaterial({map:floorTx,roughness:.49,metalness:.08}),false);if(!mountKit('WALL',scene,0,2.7,-7.35))box(scene,20,5.4,.24,0,2.7,-7.35,0x292737);for(let x of [-9.8,-5.8,0,5.8,9.8]){box(scene,.22,5.4,.34,x,2.7,-7.13,mat(0x4a475a,.5,.6));if(Math.abs(x)>9)box(scene,.14,.22,14,x,5.75,-.35,0x545064)}for(let z of [-6.2]){box(scene,19.5,.2,.14,0,5.70,z,0x5b536a);for(let x of [-5,5]){box(scene,3.4,.06,.14,x,5.52,z,new T.MeshBasicMaterial({color:0xf0e6ff}),false)}}for(let x of [-9.75,9.75]){box(scene,.20,2.5,14,x,1.25,-.25,0x302d42);for(let z of [-5.3,-1.8,1.8])makeRack(x*.87,z)}for(let x of [-3.25,3.25]){for(let xx of [-2.25,2.25])box(scene,.065,.008,9.8,x+xx,.002,-1.6,x<0?P.purple:0xc38e4c,false);box(scene,4.45,.008,.06,x,.002,3.27,x<0?P.purple:0xc38e4c,false)}for(let i=0;i<18;i++)box(scene,.06,.008,.31,0,.004,-6.4+i*.59,0xa39cb0,false);makeDoor(-3.25,0);makeDoor(3.25,1);pallets=[makePallet(-3.25,-8.6,0),makePallet(3.25,-8.6,1)];sofa();desk();worker=buildWorker();const beamMat=new T.MeshBasicMaterial({color:P.lime,transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide});scanBeam=box(scene,2.4,.025,2.1,-3.25,.85,-1.25,beamMat,false);scanBeam.visible=false;sign(scene,'WAR E N E I N G A N G'.replace(/ /g,''),'WAREHOUSE / 10 ARTIKEL JE PALETTE',5.0,.78,0,4.62,-6.97,'#d6c9ed')}

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
 for(let k=0;k<16;k++){let x=-9.3+k*1.2;box(scene,.015,4.9,.028,x,2.5,-7.20,metal,false)}
 for(let x of [-7.0,7.0]){for(let z of [-4.3,.0,4.3]){box(scene,.12,3.0,.12,x,1.5,z,metal);box(scene,.24,.06,.24,x,.035,z,metal)}}
 for(let x of [-3.7,3.7])for(let z of [-4.6,1.0]){let l=new T.PointLight(x<0?0xcbb8ff:0xffe7b7,9,7,2);l.position.set(x,4.9,z);scene.add(l)}
 let rim=new T.DirectionalLight(0xd0b8ff,.85);rim.position.set(0,4,-8);scene.add(rim);
 // low profile electric transport platforms, status strips and wheel hubs
 pallets.forEach((g,i)=>{box(g,2.40,.15,2.18,0,.10,0,dark);box(g,2.18,.046,.03,0,.15,1.09,new T.MeshBasicMaterial({color:i?0xffb46b:P.lime}),false);box(g,.35,.08,.026,0,.075,1.11,metal,false);for(let a of [-1,1]){let w=cyl(g,.11,.11,.035,a*1.10,.13,.83,metal,16);w.rotation.z=Math.PI/2}});
 // illuminated lane identification
 const ft=texture(1024,256,(c,w,h)=>{c.fillStyle='#ffffff00';c.clearRect(0,0,w,h);c.fillStyle='#bfb5d3';c.font='900 112px Arial';c.textAlign='center';c.fillText('FULFILLMENT  /  01',w/2,170)});let mark=plane(scene,5.5,1.3,0,.015,5.1,ft);mark.rotation.x=-Math.PI/2;
}
function batchWarehouse(){scene.updateMatrixWorld(true);const protectedRoots=new Set([...doorGroups,...pallets,...laneLights,worker.g,scanBeam,coffeeCup]);const batches=new Map();scene.traverse(o=>{if(!o.isMesh||Array.isArray(o.material)||!o.material?.isMeshStandardMaterial||o.material.transparent||o.material.map)return;for(let p=o;p;p=p.parent)if(protectedRoots.has(p))return;const key=o.material.uuid+'-'+o.castShadow+'-'+o.receiveShadow;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o)});for(const list of batches.values()){if(list.length<3)continue;const geos=list.map(o=>o.geometry.clone().applyMatrix4(o.matrixWorld));const geo=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());if(!geo)continue;const m=new T.Mesh(geo,list[0].material);m.castShadow=list[0].castShadow;m.receiveShadow=list[0].receiveShadow;scene.add(m);for(const o of list)o.removeFromParent()}}
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


const WORKER_MODEL='https://d2ol7oe51mr4n9.cloudfront.net/user_3JoVMcU64SCr3ZOXnqrL8fUEJOx/31d7543c-59e0-4663-a915-4f46b0ee6b8e.glb';
function loadWorkerModel(){
 return new Promise(resolve=>{
  new GLTFLoader().load(WORKER_MODEL,gltf=>{
   try{
    const rig=gltf.scene.getObjectByName('WORKER_RIG');
    if(!rig)throw Error('Lagerleiter-Rig fehlt');
    const find=n=>{let o=rig.getObjectByName(n);if(!o)throw Error('Gelenk fehlt: '+n);return o};
    const torso=find('WorkerTorso'),head=find('WorkerHead'),jaw=find('WorkerJaw');
    const arms=['L','R'].map(side=>[find('WorkerUpperArm'+side),find('WorkerForearm'+side)]);
    const legs=['L','R'].map(side=>[find('WorkerThigh'+side),find('WorkerShin'+side)]);
    const feet=['L','R'].map(side=>find('WorkerFoot'+side));
    rig.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(rig);
    const scale=2.16/bounds.getSize(v(0,0,0)).y;
    rig.scale.setScalar(scale);rig.position.y=-bounds.min.y*scale;
    rig.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
    const old=worker.g;old.clear();old.add(rig);
    worker={g:old,torso,arms,legs,head,jaw,feet,rig};
    resolve(true);
   }catch(e){console.warn('Lagerleiter-Modell:',e);resolve(false)}
  },undefined,e=>{console.warn('Lagerleiter-Modell konnte nicht geladen werden:',e);resolve(false)});
 });
}
function animateWorkerFace(time){
 if(!worker?.head)return;
 const talking=voicePlaying&&voiceWho==='Lagerleiter';
 worker.jaw.rotation.x=talking?-.12*Math.abs(Math.sin(time*12)):0;
 const instructing=state.phase==='intro'&&intro.step<4;
 worker.head.rotation.y=instructing?-.12+.045*Math.sin(time*2):.04*Math.sin(time*1.2);
 worker.head.rotation.x=state.phase==='playing'&&manualPose==='work'?.12:talking?.025*Math.sin(time*5):0;
 for(let i=0;i<2;i++){const [thigh,shin]=worker.legs[i];worker.feet[i].rotation.x=-.75*(thigh.rotation.x+shin.rotation.x);}
}

async function init(){renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2.5,Math.sqrt(3200000/(innerWidth*innerHeight))));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;scene=new T.Scene();camera=new T.PerspectiveCamera(43,1,.1,100);$('loading').textContent='Lagerhalle wird geladen …';const [kitReady]=await Promise.all([loadEnvironmentKit(),loadProductAtlas()]);warehouse();batchWarehouse();makeTraining();enhanceWarehouse();const workerReady=loadWorkerModel();resize();window.addEventListener('resize',resize);bindInput();updateScreen();loadCertoro(gltf=>{const rig=gltf.scene.getObjectByName('CERTORO_RIG');if(!rig)throw Error('Rig fehlt');model=group(scene);model.add(rig);rig.updateMatrixWorld(true);let bounds=new T.Box3().setFromObject(rig);let size=bounds.getSize(v(0,0,0));let scale=2.5/size.y;rig.scale.setScalar(scale);rig.position.y=-bounds.min.y*scale;model.position.copy(certPos);model.rotation.y=0;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material?.name==='Transparent cyan visor'){o.material.transparent=true;o.material.opacity=.28;o.material.depthWrite=false;if('transmission'in o.material)o.material.transmission=0}}});mixer=new T.AnimationMixer(rig);let clip=gltf.animations.find(x=>x.name==='CERTORO_RIG')||gltf.animations[0];if(clip){for(const [name,index]of Object.entries({idle:0,walk:1,sit:9,talk:13,wave:17,point:18,celebrate:22})){const sub=T.AnimationUtils.subclip(clip,name,index*48,index*48+47,24);actions[name]=mixer.clipAction(sub);actions[name].setLoop(T.LoopRepeat,Infinity)}}actions.sit=mixer.clipAction(makeSofaSitClip(T,rig,model));actions.sit.setLoop(T.LoopRepeat,Infinity);actions.coffeeBend=mixer.clipAction(makeSofaSitClip(T,rig,model,.74));actions.coffeeBend.setLoop(T.LoopRepeat,Infinity);prepareTripoPose(rig);play('idle');phoneModel=group(model);box(phoneModel,.17,.30,.035,0,0,0,0x14111f);const phoneTx=texture(256,512,(c,w,h)=>{c.fillStyle='#1b0f32';c.fillRect(0,0,w,h);c.fillStyle='#c6ff3d';c.font='900 35px Arial';c.fillText('certoro',20,58);c.fillStyle='#fff';c.font='bold 19px Arial';c.fillText('Artikel erfassen',20,110);c.strokeStyle='#c6ff3d';c.lineWidth=3;c.strokeRect(25,146,206,198);for(let j=0;j<6;j++){c.fillStyle=j%2?'#e0d8c9':'#9184bc';c.fillRect(42+(j%3)*60,175+Math.floor(j/3)*72,48,58)}c.fillStyle='#c6ff3d';c.beginPath();c.arc(128,420,29,0,Math.PI*2);c.fill()});box(phoneModel,.145,.264,.005,0,0,.021,new T.MeshBasicMaterial({map:phoneTx}),false);phoneModel.position.set(.34,1.35,.30);phoneModel.visible=false;workerReady.then(ok=>{$('loading').classList.add('hidden');$('start').disabled=false;$('loadText').textContent='Certoro HD · Touch & Desktop';});},p=>{$('loading').textContent='3D-Modell wird geladen … '+(p.total?Math.round(p.loaded/p.total*100)+'%':'')},e=>{console.error(e);$('loading').textContent='3D-Modell konnte nicht geladen werden. Bitte Seite neu laden.'});requestAnimationFrame(loop)}
function resize(){let w=innerWidth,h=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio,2.5,Math.sqrt(3200000/(w*h))));renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<.9?58:43;camera.updateProjectionMatrix()}
// V14: distance-driven two-bone foot placement and audio-timed facial shapes.
let tripoMotion=null, voiceStartedAt=0, voicePlaybackRate=1;
const SPEECH_FRAMES={"4":[0,0,0,0,0,0,0,0,0,17,1,26,10,5,11,5,3,6,1,1,1,3,2,3,11,5,11,24,12,25,46,12,12,100,6,25,37,2,9,1,1,2,1,1,2,5,3,5,4,2,4,1,0,1,0,0,0,28,2,44,40,3,64,33,9,9,16,4,4,8,4,8,6,3,6,0,0,0,0,0,0,100,6,25,100,6,25,46,12,12,46,12,12,36,9,9,26,7,7,27,2,43,22,1,34,13,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"5":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,33,2,52,46,3,73,36,2,58,18,5,5,19,5,5,40,10,10,43,11,11,26,7,7,70,4,18,82,5,20,11,6,12,3,1,3,2,1,2,1,0,1,0,0,0,1,0,2,41,11,11,46,12,12,23,12,24,12,6,13,16,8,17,46,12,12,57,85,3,44,66,2,7,3,7,3,1,3,1,1,2,1,0,1,4,0,6,27,2,43,41,11,11,43,11,11,37,10,10,90,5,23,90,5,22,40,3,64,46,3,73,46,3,73,45,12,12,45,12,12,39,10,10,17,8,17,14,7,15,5,3,6,5,0,1,3,0,1,4,0,1,75,5,19,24,12,25,20,10,21,11,5,11,8,0,12,6,0,9,13,1,20,29,7,7,34,9,9,31,8,8,27,7,7,23,6,6,20,3,3,7,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,6,8,8,12,7,7,11,3,3,4,1,1,2,0,0,0,24,2,38,34,2,54,42,11,11,45,12,12,39,10,10,36,9,9,42,3,67,46,12,12,45,3,71,30,2,48,28,2,44,100,6,25,46,12,12,46,12,12,24,12,25,35,2,56,29,2,46,12,1,19,1,1,1,5,5,7,79,5,20,56,3,14,28,2,7,0,0,0,0,0,0,18,5,5,31,2,50,46,3,73,46,3,73,39,3,62,22,11,23,24,12,25,24,12,25,24,12,25,20,10,21,8,4,9,10,1,16,8,0,12,30,2,48,46,3,73,43,3,68,60,9,7,45,7,6,17,2,2,17,3,2,8,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"7":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,23,11,24,24,12,25,22,11,23,11,6,11,7,3,7,7,4,8,3,1,3,0,0,0,0,0,0,46,3,73,46,12,12,46,12,12,46,12,12,44,11,11,16,8,17,6,3,7,8,1,13,7,0,11,5,0,8,26,2,41,46,12,12,46,12,12,46,12,12,24,12,25,24,12,25,24,12,25,24,12,25,26,2,42,7,0,12,0,0,0,0,0,0,0,0,0,14,4,4,18,5,5,16,4,4,9,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,12,0,19,29,1,22,33,1,28,42,1,29,2,46,35,2,56,42,3,66,34,2,55,23,34,1,37,2,9,93,6,23,46,3,73,46,3,73,46,3,73,21,11,22,14,7,14,6,3,6,1,0,1,0,0,0,0,0,0,0,0,0,5,2,5,7,4,8,6,3,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,18,1,22,33,1,25,37,1,26,39,1,25,37,1,21,31,1,15,22,1,19,3,2,20,3,3,15,2,2,4,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]};
function prepareTripoPose(rig){
 const bones={};rig.traverse(b=>{if(b.isBone)bones[b.name]={b,p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}});
 model.updateMatrixWorld(true);
 const mq=model.getWorldQuaternion(new T.Quaternion()).invert();
 for(const o of Object.values(bones)){o.wq=mq.clone().multiply(o.b.getWorldQuaternion(new T.Quaternion()));o.wp=model.worldToLocal(o.b.getWorldPosition(v(0,0,0)))}
 const mesh=rig.getObjectByName('HighDetailCertoro'),geo=mesh.geometry,src=geo.attributes.position;
 const open=new Float32Array(src.count*3),round=new Float32Array(src.count*3),spread=new Float32Array(src.count*3);
 const sm=(a,b,x)=>{let t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
 for(let i=0;i<src.count;i++){
  const x=src.getX(i),y=src.getY(i),z=src.getZ(i);
  // Stretch the textured lip seam, protect visor/nose/cheeks; lower muzzle follows jaw.
  const front=sm(.17,.28,z),width=1-sm(.12,.25,Math.abs(x)),lower=sm(2.91,2.98,y)*(1-sm(3.047,3.069,y)),upper=sm(3.042,3.055,y)*(1-sm(3.065,3.098,y));
  const k=front*width;
  open[i*3+1]=k*(-.092*lower+.016*upper);open[i*3+2]=-.022*k*lower;
  const lip=k*sm(2.99,3.025,y)*(1-sm(3.07,3.11,y));
  round[i*3]=-x*.32*lip;round[i*3+2]=.032*lip;round[i*3+1]=-.018*lip*lower;
  spread[i*3]=x*.23*lip;spread[i*3+1]=.012*lip*(Math.abs(x)/.18);
 }
 geo.morphTargetsRelative=true;geo.morphAttributes.position=[open,round,spread].map(a=>new T.BufferAttribute(a,3));mesh.updateMorphTargets();mesh.frustumCulled=false;
 const hip=bones.ThighL.wp.y,ankle=bones.FootL.wp.y;
 tripoMotion={rig,bones,mesh,hip,ankle,last:model.position.clone(),distance:0,gait:0,bend:0,seat:0,face:[0,0,0],time:0};
}
function motionSmooth(a,b,x){const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}
function animateTripoFace(dt){
 const m=tripoMotion;if(!m)return;let target=[0,0,0];
 if(voicePlaying&&voiceWho==='Certoro'&&!state.muted){
  const frames=SPEECH_FRAMES[voiceLine],t=voiceAudio?voiceAudio.currentTime:ac?Math.max(0,(ac.currentTime-voiceStartedAt)*voicePlaybackRate):0;
  if(frames){const p=t/.02,k=Math.floor(p),f=p-k;for(let j=0;j<3;j++)target[j]=lerp(frames[k*3+j]||0,frames[(k+1)*3+j]||0,f)/100}
 }
 const f=1-Math.exp(-Math.max(0,dt)*24);
 for(let j=0;j<3;j++){m.face[j]=lerp(m.face[j],target[j],f);m.mesh.morphTargetInfluences[j]=m.face[j]}
}
function advanceCertoroPose(dt){
 if(mixer)mixer.update(dt);const m=tripoMotion;if(!m)return;
 const B=n=>m.bones[n].b, R=n=>m.bones[n],W=n=>B(n).getWorldPosition(v(0,0,0));
 const moved=model.position.distanceTo(m.last);m.last.copy(model.position);m.distance+=Math.min(moved,.4);m.time+=dt;
 const walking=currentAction==='walk'||(currentAction==='point'&&moved>.014);
 const stride=1.40;
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
 const hipY=lerp(m.hip-.135*gait-.025*gait*Math.cos(phase*4*Math.PI)-.36*m.bend,.65,m.seat);
 const back=-.105*m.bend-.025*m.seat, sway=.022*gait*Math.sin(phase*2*Math.PI);
 B('Root').position.copy(R('Root').p).add(v(sway,hipY-m.hip,back).multiplyScalar(1/m.rig.scale.y));
 model.updateMatrixWorld(true);
 const mq=model.getWorldQuaternion(new T.Quaternion()),axisX=v(1,0,0);
 function orient(n,q){const b=B(n);b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));b.updateWorldMatrix(true,true)}
 function restQ(n,rx=0){return mq.clone().multiply(new T.Quaternion().setFromAxisAngle(axisX,rx)).multiply(R(n).wq)}
 function aim(n,child,p){const a=W(n),d=W(child).sub(a).normalize(),to=p.clone().sub(a).normalize();if(to.lengthSq()<.1)return;orient(n,new T.Quaternion().setFromUnitVectors(d,to).multiply(B(n).getWorldQuaternion(new T.Quaternion())))}
 // Hip hinge instead of the former simulated crouch. Counter-rotate neck for gaze.
 orient('Spine',restQ('Spine',.88*m.bend+.11*m.seat));orient('Chest',restQ('Chest',.83*m.bend+.075*m.seat));orient('Head',restQ('Head',.42*m.bend-.02*m.seat));
 for(const [side,sg] of [['L',1],['R',-1]]){
  const th='Thigh'+side,sh='Shin'+side,fo='Foot'+side,u='UpperArm'+side,f='Forearm'+side,h='Hand'+side;
  const p=((phase+(side==='R'?.5:0))%1+1)%1,stance=.60;
  let z=0,lift=0;
  if(p<stance)z=stride*(.5-p/stance)*stance;else{const t=(p-stance)/(1-stance);z=stride*stance*(motionSmooth(0,1,t)-.5);lift=.14*Math.sin(Math.PI*t)}
  const foot=R(fo).wp.clone();foot.z+=gait*z;foot.y+=gait*lift;foot.z=lerp(foot.z,.49,m.seat);foot.x+=sg*.025*m.seat;foot.z+=.07*m.bend;
  let target=model.localToWorld(foot),hip=W(th),l1=W(sh).distanceTo(hip),l2=W(fo).distanceTo(W(sh)),dir=target.clone().sub(hip);
  let d=clamp(dir.length(),Math.abs(l1-l2)+.001,l1+l2-.002);dir.normalize();
  let pole=v(sg*.06,0,1).applyQuaternion(mq);pole.addScaledVector(dir,-pole.dot(dir)).normalize();
  const along=(l1*l1-l2*l2+d*d)/(2*d),knee=hip.clone().addScaledVector(dir,along).addScaledVector(pole,Math.sqrt(Math.max(0,l1*l1-along*along)));
  target=hip.clone().addScaledVector(dir,d);
  aim(th,sh,knee);aim(sh,fo,target);orient(fo,restQ(fo,gait*lift*.85));
  const swing=sg*.38*gait*Math.cos(phase*2*Math.PI),restSwing=.035*Math.sin(m.time*2.2);
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
 const pkg=group(g,.67,1.13,-.12);let tx=texture(512,512,(c,w,h)=>{c.fillStyle='#e8e5db';c.fillRect(0,0,w,h);c.fillStyle='#293044';c.fillRect(0,0,w,100);c.fillStyle='#fff';c.font='900 52px Arial';c.fillText('MIX / 1200',24,66);c.fillStyle='#6d28d9';c.fillRect(24,130,w-48,10);c.fillStyle='#222';c.font='bold 33px Arial';c.fillText('STANDMIXER',24,190);c.font='24px Arial';c.fillText('1,5 L · 1.200 W',24,226);c.fillStyle='#7a8494';c.fillRect(205,260,105,120);c.fillStyle='#333';for(let k=0;k<50;k++)if(k%3!==1)c.fillRect(26+k*4,410,2,50);c.font='20px Arial';c.fillText('426010000100',28,490)});
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
 if(state.phase==='intro'){let q=script[intro.step];const shot=q.cam;
 if(shot==='delivery'){target=v(0,1.5,-3.4);angle=0;elev=.35;distance=portrait?16.2:13.0}
 else if(shot==='hero'){target=v(-1.52,1.66,1.0);angle=.13;elev=.12;distance=portrait?4.65:4.3}
 else if(shot==='product'){target=v(-.18,1.23,.53);angle=.17;elev=.24;distance=portrait?4.7:5.1}
 else if(shot==='desk'){target=v(.43,1.27,.60);angle=-.15;elev=.18;distance=portrait?5.25:5.2}
 else{target=v(-.05,1.31,.8);angle=.05;elev=.13;distance=portrait?8.2:7.1}}
 else if(state.phase==='outro'){target=endingScene.elapsed<3.6?v(-.8,1.1,3.2):v(4.0,1.25,3.7);angle=endingScene.elapsed<3.6?.10:.32;elev=.20;distance=portrait?7.6:6.6}
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
function worldTap(e){if(state.phase==='intro'&&intro.step===1&&!intro.completed){const r=$('world').getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(pointer,camera);if(intro.model&&ray.intersectObject(intro.model,true).length)completeIntroTask('Foto gespeichert · 1 von 3');return}if(state.phase!=='playing'||state.paused)return;const r=$('world').getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(pointer,camera);const lane=state.role==='cert'?0:1;
const hits=ray.intersectObjects(productsMeshes[lane].map(p=>p.g),true);if(hits.length){let o=hits[0].object;while(o&&!productsMeshes[lane].some(p=>p.g===o))o=o.parent;let i=productsMeshes[lane].findIndex(p=>p.g===o);if(state.role==='cert'&&['approach','photo'].includes(flow.certPhase))act();else if(state.role==='manual'&&flow.manualPhase==='photo'&&i===flow.selected)act();else if(i>=0)itemPick(i);return}
if(state.role==='cert'&&flow.certPhase==='sofa'){const hit=ray.ray.intersectPlane(new T.Plane(v(0,1,0),0),v(0,0,0));if(hit&&hit.x<-3&&hit.z>2){act();return}}
}
function bindInput(){const canvas=$('world');let startPt=null;canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};startPt={...drag};canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!drag||!startPt)return;if(Math.hypot(e.clientX-startPt.x,e.clientY-startPt.y)<10)return;autoCamera=false;yaw-=(e.clientX-drag.x)*.005;pitch=clamp(pitch+(e.clientY-drag.y)*.004,.28,1.05);drag={x:e.clientX,y:e.clientY}});canvas.addEventListener('pointerup',e=>{if(startPt&&Math.hypot(e.clientX-startPt.x,e.clientY-startPt.y)<10)worldTap(e);drag=null;startPt=null});canvas.addEventListener('pointercancel',()=>{drag=null;startPt=null});canvas.addEventListener('wheel',e=>{autoCamera=false;dist=clamp(dist+e.deltaY*.012,7,25);e.preventDefault()},{passive:false});document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.code==='Space'&&!e.repeat){if(state.phase==='intro'&&document.activeElement?.tagName==='BUTTON')return;e.preventDefault();if(state.phase==='intro'){if(!$('storyAct').disabled&&!$('storyAct').classList.contains('hidden'))$('storyAct').click()}else if(state.phase==='outro'&&!$('story').classList.contains('hidden'))$('storyAct').click();else if(state.phase==='playing'&&!$('act').disabled&&!$('act').classList.contains('hidden'))$('act').click();else if(state.phase==='menu'&&!$('start').disabled)$('start').click()}if(e.key==='Escape'&&state.phase==='playing')togglePause();if(e.key.toLowerCase()==='c')$('view').click();if(e.key==='ArrowLeft'||e.key==='ArrowRight'){autoCamera=false;yaw+=e.key==='ArrowLeft'?.1:-.1}});$('sound').onclick=()=>{state.muted=!state.muted;if(state.muted)stopVoice();else if(!$('story').classList.contains('hidden')&&voiceLine>=0)replayVoice();$('sound').textContent=state.muted?'Ton aus':'Ton an';if(!state.muted)sound()};$('pause').onclick=togglePause;$('view').onclick=()=>{overview=!overview;autoCamera=true;$('view').textContent=overview?'Fokus':'Übersicht'};$('start').onclick=start;$('act').onclick=act;$('replayVoice').onclick=replayVoice}
function act(){if(state.paused||state.ending||state.phase!=='playing')return;sound();
 if(state.role==='cert'){switch(flow.certPhase){
 case 'approach':state.autoRun=true;setCert('photo');break;
 case 'photo':capture();flow.simCert=9;state.autoTime=9;state.autoStep=1;state.autoRun=false;setCert('sofa');msg('10 Fotos im Pool');break;
 case 'sofa':state.autoRun=true;state.autoStep=2;state.autoTime=15;flow.simCert=15;beginLounge();setCert('loungeTravel');break;
 case 'addons':state.autoTime=90;flow.simCert=55;state.autoRun=false;flow.records=jobs.map(j=>({...j}));setCert('review');break;
 case 'review':if(!flow.records.length||flow.records.length!==jobs.length)return;flow.checked=new Set(flow.records.map((_,i)=>i));flow.review=-1;state.autoTime=80;flow.simCert=80;setCert('export');break;
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
function renderTask(){let cert=state.role==='cert',p=cert?flow.certPhase:flow.manualPhase,j=jobs[Math.min(9,state.manualItem)],title='',detail='',button='Weiter',disabled=false;const root=$('taskContent');const reviewScroll=root.querySelector('.bulkReviewList')?.scrollTop||0;root.replaceChildren();$('act').classList.toggle('manual',!cert);$('act').classList.remove('hidden');$('phaseLabel').textContent=cert?'CERTORO APP':'ARTIKEL '+(state.manualItem+1)+' / 10';$('taskCount').textContent=cert?({approach:'1/6',photo:'2/6',sofa:'3/6',loungeTravel:'3/6',addons:'4/6',review:'5/6',export:'6/6'}[p]):({pick:'1/11',photo:'2/11',identify:'3/11',title:'4/11',category:'5/11',description:'6/11',price:'7/11',image:'8/11',marketing:'9/11',compliance:'10/11',listing:'11/11'}[p]);
 if(cert){switch(p){
 case 'approach':title='Deine 10 Produkte';detail='Tippe auf die Palette oder den Button.';button='Zur Palette gehen';break;
 case 'photo':title='Alle Produkte fotografieren';detail='Certoro erfasst die gesamte Palette auf einmal.';button='Alle Produkte erfassen';break;
 case 'sofa':title='10 Produkte erfasst';detail='Die KI übernimmt. Hol dir einen Kaffee und entspann dich.';button='Zur Lounge gehen';break;
 case 'loungeTravel':title='Zeit für einen Kaffee';detail='Certoro holt seinen Kaffee und setzt sich aufs Sofa.';button='Unterwegs …';disabled=true;break;
 case 'addons':title='Was soll Certoro erledigen?';detail='Wähle zusätzliche Funktionen aus.';button='Auftrag ausführen';let g=document.createElement('div');g.className='task-options';for(let [k,n] of addons){let b=document.createElement('button');b.textContent=n;b.classList.toggle('selected',state.addons.has(k));b.onclick=()=>{if(state.paused)return;state.addons.has(k)?state.addons.delete(k):state.addons.add(k);b.classList.toggle('selected',state.addons.has(k));sound()};g.append(b)}root.append(g);break;
 case 'review':{
 title=flow.records.length+' fertige Verkaufsangebote';detail='Scrolle durch die Artikel und bestätige alle gemeinsam.';button='Alle geprüft – fertig';disabled=flow.records.length!==jobs.length;
 const list=document.createElement('ol');list.className='bulkReviewList';list.tabIndex=0;list.setAttribute('aria-label','Alle erstellten Verkaufsangebote');
 flow.records.forEach((r,i)=>{
  const row=document.createElement('li');row.className='bulkReviewRow';
  const cv=document.createElement('canvas');cv.width=160;cv.height=120;cv.setAttribute('aria-hidden','true');
  const ctx=cv.getContext('2d');ctx.fillStyle='#efeff2';ctx.fillRect(0,0,160,120);productArt(ctx,160,120,i);
  const info=document.createElement('div');info.className='bulkReviewInfo';
  const name=document.createElement('strong');name.textContent=r.title;
  const meta=document.createElement('span');meta.textContent=r.category+' · EAN '+r.ean;
  info.append(name,meta);
  const price=document.createElement('span');price.className='bulkReviewPrice';price.textContent=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(r.price);
  row.append(cv,info,price);list.append(row);
 });
 root.append(list);list.scrollTop=reviewScroll;break;
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
function updateUI(){if(state.phase!=='playing'&&state.phase!=='done')return;const cert=state.role==='cert',acount=cert?(flow.certPhase==='review'?10:flow.certPhase==='export'||state.ending?10:0):Math.min(10,Math.floor(Math.max(0,state.autoTime-15)/7.5));$('timer').textContent=fmt(state.elapsed);$('certScore').textContent=acount+' / 10';$('manualScore').textContent=state.manualItem+' / 10';$('certBar').style.width=(acount*10)+'%';$('manualBar').style.width=(state.manualItem*10)+'%';$('viewfinder').classList.toggle('hidden',!(state.phase==='playing'&&(cert?flow.certPhase==='photo':flow.manualPhase==='photo')));let key=[state.role,flow.certPhase,flow.manualPhase,state.manualItem,flow.review,flow.checked.size,state.paused].join('|');if(state.phase==='playing'&&key!==flow.uiKey){flow.uiKey=key;renderTask()}updateScreen()}

let endingScene={elapsed:0,said:false,observed:false,rival:false};
function finish(){
 if(state.ending)return;state.ending=true;state.paused=false;
 if(state.role!=='cert'){showResult();return}
 state.phase='outro';endingScene.elapsed=0;endingScene.said=false;endingScene.observed=false;endingScene.rival=false;
 $('hud').classList.add('hidden');$('viewfinder').classList.add('hidden');$('targetMarker').classList.add('hidden');
 $('top').classList.add('cinematic');$('chapter').classList.remove('hidden');$('chapter').textContent='04 / SCHON FERTIG';
 $('story').classList.add('hidden');$('certScore').textContent='10 / 10';$('certBar').style.width='100%';
 sound('done');autoCamera=true;
}
function watchColleague(dt,time){
 const t=endingScene.elapsed;
 if(t<1.4){certTarget.set(-4.8,0,5.35)}else if(t<4.0){certTarget.set(3.35,0,5.35)}else{certTarget.set(3.35,0,4.5)}
 const delta=certTarget.clone().sub(certPos),walking=delta.length()>.32;
 certPos.lerp(certTarget,1-Math.exp(-dt*2.3));model.position.copy(certPos);
 model.rotation.y=angleTo(model.rotation.y,walking?Math.atan2(delta.x,delta.z):Math.PI/2,dt);
 play(walking?'walk':voicePlaying&&voiceWho==='Certoro'?'talk':'idle');advanceCertoroPose(dt);updateCoffee(dt);if(phoneModel)phoneModel.visible=false;
 manualTarget.set(4.7,0,4.1);manualPos.lerp(manualTarget,1-Math.exp(-dt*4));worker.g.position.copy(manualPos);worker.g.rotation.y=lerp(worker.g.rotation.y,Math.PI,1-Math.exp(-dt*5));
 worker.arms.forEach(([a,f],i)=>{a.rotation.x=-.72+Math.sin(time*8+i)*.10;a.rotation.z=(i?1:-1)*.12;f.rotation.x=-.65+Math.sin(time*11+i)*.16});worker.legs.forEach(([a,k])=>{a.rotation.x=0;k.rotation.x=0});worker.torso.rotation.x=.10;scanBeam.visible=false;
 if(t>=5.8&&!endingScene.said){endingScene.said=true;$('story').classList.remove('hidden');$('story').classList.add('bull');$('storyTag').textContent='10 / 10 ANGEBOTE FERTIG';$('speaker').textContent='Certoro';$('storyLine').textContent='Ich bin fertig. Wie weit bist du?';$('storyTask').replaceChildren();$('storyAct').textContent='Weiter';$('storyAct').disabled=false;$('storyAct').onclick=()=>{if(endingScene.observed){$('story').classList.add('hidden');$('chapter').classList.add('hidden');showResult()}else{endingScene.observed=true;$('story').classList.remove('bull');$('speaker').textContent='Lagerleiter';$('storyTag').textContent='NOCH MITTEN IN DER ARBEIT';$('storyLine').textContent='Ich bin noch dabei, die Artikel einzeln anzulegen …';$('storyAct').textContent='Ergebnis ansehen';say($('storyLine').textContent,'Lagerleiter')}};say($('storyLine').textContent,'Certoro')}
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
function updateTarget(){let marker=$('targetMarker');if(state.phase!=='playing'||state.paused){marker.classList.add('hidden');return}let pos;if(state.role==='cert'){if(flow.certPhase==='approach'||flow.certPhase==='photo')pos=v(-3.25,1.15,-1.9);if(flow.certPhase==='sofa')pos=v(-4.8,1.0,3.25)}else if(flow.manualPhase==='pick'||flow.manualPhase==='photo'){let p=productsMeshes[1][state.manualItem];if(p)pos=p.g.getWorldPosition(v(0,0,0)).add(v(0,.85,0))}if(!pos){marker.classList.add('hidden');return}camera.updateMatrixWorld();pos.project(camera);if(pos.z>1||Math.abs(pos.x)>1||Math.abs(pos.y)>1){marker.classList.add('hidden');return}marker.style.left=(pos.x*.5+.5)*innerWidth+'px';marker.style.top=(-pos.y*.5+.5)*innerHeight+'px';marker.classList.remove('hidden')}

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
 const elbowDir=b.clone().sub(a);elbowDir.addScaledVector(axis,-elbowDir.dot(axis));
 if(elbowDir.length()<.01){elbowDir.set(0,-1,0);elbowDir.addScaledVector(axis,-elbowDir.dot(axis))}
 if(elbowDir.length()<.001)elbowDir.set(1,0,0);
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
 if(!model||!coffeeCup)return;
 if(!lounge.held&&lounge.reach<=0)return;
 model.updateMatrixWorld(true);
 if(!lounge.side){
  const target=v(...COFFEE_HOME);
  const l=model.getObjectByName('UpperArmL'),r=model.getObjectByName('UpperArmR');
  if(!l||!r)return;
  lounge.side=l.getWorldPosition(v(0,0,0)).distanceTo(target)<r.getWorldPosition(v(0,0,0)).distanceTo(target)?'L':'R';
 }
 const side=lounge.side,hand=model.getObjectByName('Hand'+side),upper=model.getObjectByName('UpperArm'+side);
 if(!hand||!upper)return;
 const sg=side==='L'?1:-1;
 const shoulder=upper.getWorldPosition(v(0,0,0));
 const forward=v(0,0,1).applyAxisAngle(v(0,1,0),model.rotation.y);
 const carry=shoulder.clone().addScaledVector(forward,.32).add(v(0,-.38,0));
 const home=v(...COFFEE_HOME).addScaledVector(forward,-.055);home.y-=.035;
 const picking=lounge.active&&LOUNGE_ROUTE[lounge.index]?.kind==='pick';
 const target=picking?(lounge.held?carry.clone().lerp(home,lounge.reach):home):carry;
 aimCoffeeArm(side,target,lounge.held?1:lounge.reach);
 if(lounge.held){
  const p=hand.getWorldPosition(v(0,0,0));
  const cupTarget=p.addScaledVector(forward,.055);cupTarget.y+=.035;
  if(picking){lounge.grabBlend=clamp((lounge.grabBlend||0)+dt/.13,0,1);coffeeCup.position.copy(v(...COFFEE_HOME)).lerp(cupTarget,motionSmooth(0,1,lounge.grabBlend))}else coffeeCup.position.copy(cupTarget);
  coffeeCup.rotation.set(0,model.rotation.y,0);
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
  if(model){model.position.copy(certPos);const angle=d>.25?Math.atan2(delta.x,delta.z):(state.role==='manual'&&auto>=3?Math.PI/2:0);model.rotation.y=angleTo(model.rotation.y,angle,dt);if(d>.15&&cp!=='sit')cp='walk';play(cp)}
 }
 if(phoneModel)phoneModel.visible=state.phase==='playing'&&auto===0&&run;
 advanceCertoroPose(state.paused?0:dt);updateCoffee(state.paused?0:dt);
 scanBeam.visible=state.phase==='playing'&&auto===0&&run;scanBeam.position.y=.28+((time*1.2)%1)*.95;scanBeam.material.opacity=.11+.10*Math.sin(time*4)**2;
 if(state.phase==='playing'||state.phase==='done'){let k=state.manualStep;manualTarget.set(k<1?3.25:4.7,0,k<1?.15:4.10);manualPose=state.manualRun?(k<1?'photo':'work'):'idle'}else{manualTarget.set(3.1,0,2.25);manualPose='idle'}let md=manualPos.distanceTo(manualTarget);manualPos.lerp(manualTarget,1-Math.exp(-dt*2.7));worker.g.position.copy(manualPos);worker.g.rotation.y=lerp(worker.g.rotation.y,manualPose==='photo'?Math.PI:manualPose==='work'?Math.PI:0,1-Math.exp(-dt*5));let t=time*5;worker.arms.forEach(([a,f],i)=>{a.rotation.x=md>.2?Math.sin(t)*(i?1:-1)*.45:manualPose==='work'?-0.65:manualPose==='photo'?-1.03:0;a.rotation.z=(i?1:-1)*.12;f.rotation.x=manualPose==='work'?-.65+Math.sin(t*2+i)*.12:manualPose==='photo'?-.80:0});worker.legs.forEach(([a,k],i)=>{a.rotation.x=md>.2?Math.sin(t)*(i?-1:1)*.38:0;k.rotation.x=md>.2?Math.max(0,-Math.sin(t)*(i?-1:1))*.5:0});worker.torso.rotation.x=manualPose==='work'?.10:0;let acount=state.autoTime<15?0:Math.min(10,Math.floor((state.autoTime-15)/7.5+1e-7)),mcount=state.manualItem;for(let lane=0;lane<2;lane++)productsMeshes[lane].forEach((p,i)=>{let done=i<(lane?mcount:acount);p.marker.material.opacity=done?.8:(state.phase==='playing'&&state.role==='manual'&&lane===1&&i===state.manualItem?.25:0);p.mesh.scale.y=1;
 let destination=p.base.clone();
 if(lane===1&&state.phase==='playing'&&state.role==='manual'&&i===flow.selected&&flow.manualPhase!=='pick'){
  if(flow.manualPhase!=='photo')destination=pallets[1].worldToLocal(v(4.05,1.11,3.20));
  else destination=pallets[1].worldToLocal(v(3.25,1.0,-.42));
 }
 p.g.position.lerp(destination,1-Math.exp(-dt*4))});}
function loop(){requestAnimationFrame(loop);let elapsedDelta=clock.getDelta(),dt=Math.min(elapsedDelta,.12),time=performance.now()/1000;tick(document.hidden?0:elapsedDelta);updateActors(state.paused?0:dt,time);animateWorkerFace(time);if(!cinematicCamera(dt)&&autoCamera){let playing=state.phase==='playing'&&!overview,portrait=innerWidth/innerHeight<.8;let focus=playing?(state.role==='cert'?(lounge.active?certPos.x:state.autoStep>=1?-4.8:-3.15):3.55):0;let targetZ=playing?(state.role==='cert'&&lounge.active?certPos.z:state.role==='cert'&&state.autoStep>=1?3.9:state.role==='manual'&&state.manualStep>0?2.3:-.15):-.2;camTarget.x=lerp(camTarget.x,focus,.035);camTarget.z=lerp(camTarget.z,targetZ,.035);camTarget.y=lerp(camTarget.y,playing?(state.role==='cert'&&state.autoStep>=2?(lounge.active?.55:.18):1.0):.8,.03);yaw=lerp(yaw,.05,.025);pitch=lerp(pitch,playing?(portrait?.54:.39):(portrait?.76:.55),.025);dist=lerp(dist,playing?(portrait?9.8:10.5):(portrait?23:17.5),.025)}camera.position.set(camTarget.x+Math.sin(yaw)*Math.cos(pitch)*dist,camTarget.y+Math.sin(pitch)*dist,camTarget.z+Math.cos(yaw)*Math.cos(pitch)*dist);camera.lookAt(camTarget);if(time-lastUi>.15){lastUi=time;updateUI()}updateTarget();renderer.render(scene,camera)}
try{init()}catch(e){console.error(e);$('loading').textContent='WebGL ist nicht verfügbar. Bitte einen aktuellen Browser verwenden.'}




