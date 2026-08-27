import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { LEVELS, WORLDS, getWorldLevels } from './levels.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const canvas = $('#scene');

const DIRS = {
  xp: new THREE.Vector3(1,0,0), xm: new THREE.Vector3(-1,0,0),
  yp: new THREE.Vector3(0,1,0), ym: new THREE.Vector3(0,-1,0),
  zp: new THREE.Vector3(0,0,1), zm: new THREE.Vector3(0,0,-1)
};
const DIR_LABELS = {xp:'RIGHT',xm:'LEFT',yp:'UP',ym:'DOWN',zp:'FRONT',zm:'BACK'};
const SAVE_KEY = 'impact_release_v1';
const defaultSave = {unlocked:1,current:1,stars:{},settings:{sound:true,haptics:true,quality:'high'}};
let save = loadSave();

function loadSave(){
  try { const raw=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'); return {...structuredClone(defaultSave), ...raw, settings:{...defaultSave.settings,...(raw.settings||{})}}; }
  catch { return structuredClone(defaultSave); }
}
function writeSave(){ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function hex(n){ return '#'+n.toString(16).padStart(6,'0'); }
function haptic(ms=14){ if(save.settings.haptics && navigator.vibrate) navigator.vibrate(ms); }
function toast(text, ms=1400){ const el=$('#toast'); el.textContent=text; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),ms); }

class AudioSystem{
  constructor(){ this.ctx=null; this.master=null; this.ambient=null; }
  init(){
    if(this.ctx) { if(this.ctx.state==='suspended') this.ctx.resume(); return; }
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    this.ctx=new AC(); this.master=this.ctx.createGain(); this.master.gain.value=save.settings.sound?.18:0; this.master.connect(this.ctx.destination);
    const low=this.ctx.createOscillator(), high=this.ctx.createOscillator(), g=this.ctx.createGain(), lfo=this.ctx.createOscillator(), lg=this.ctx.createGain();
    low.type='sine'; low.frequency.value=48; high.type='triangle'; high.frequency.value=96; g.gain.value=.035;
    lfo.frequency.value=.09; lg.gain.value=.018; lfo.connect(lg); lg.connect(g.gain); low.connect(g); high.connect(g); g.connect(this.master); low.start(); high.start(); lfo.start();
    this.ambient={low,high,g,lfo};
  }
  setEnabled(v){ if(this.master) this.master.gain.setTargetAtTime(v?.18:0,this.ctx.currentTime,.08); }
  tone(freq=440,d=.08,type='sine',gain=.08,slide=1){
    if(!save.settings.sound) return; this.init(); if(!this.ctx) return;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain(); o.type=type; o.frequency.setValueAtTime(freq,this.ctx.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),this.ctx.currentTime+d);
    g.gain.setValueAtTime(gain,this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+d); o.connect(g); g.connect(this.master); o.start(); o.stop(this.ctx.currentTime+d+.02);
  }
  click(){ this.tone(720,.055,'triangle',.045,1.18); }
  select(){ this.tone(330,.08,'sine',.055,1.35); }
  impact(receiver){ this.tone(receiver==='orb'?115:78,.16,'sawtooth',.12,1.9); this.tone(receiver==='orb'?620:280,.09,'triangle',.055,.72); }
  launch(){ this.tone(150,.22,'sawtooth',.08,2.2); }
  fail(){ this.tone(170,.32,'sawtooth',.08,.45); }
  win(){ [440,554,659,880].forEach((f,i)=>setTimeout(()=>this.tone(f,.24,'sine',.065,1.03),i*85)); }
}
const audio=new AudioSystem();

class ImpactGame{
  constructor(){
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace; this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.12;
    this.scene=new THREE.Scene(); this.camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,100);
    this.cameraState={yaw:-.72,pitch:.46,distance:17,target:new THREE.Vector3(0,2,0)};
    this.stage=new THREE.Group(); this.deco=new THREE.Group(); this.fx=new THREE.Group(); this.scene.add(this.stage,this.deco,this.fx);
    this.raycaster=new THREE.Raycaster(); this.pointer=new THREE.Vector2(); this.clock=new THREE.Clock();
    this.surfaceRuntime=[]; this.gateRuntime=[]; this.switchRuntime=[]; this.hazardRuntime=[]; this.particles=[]; this.editSet=new Set(); this.cooldowns={}; this.insideSurfaces=new Set();
    this.currentLevel=null; this.currentWorld=1; this.selected=null; this.running=false; this.levelComplete=false; this.screen='mainMenu'; this.failureTimer=0;
    this.drag={active:false,moved:false,x:0,y:0,lastX:0,lastY:0,pinch:null}; this.menuTime=0;
    this.setupRenderer(); this.setupLights(); this.setupInput(); this.bindUI(); this.buildMenuScene(); this.updateMenuUI(); this.animate();
    setTimeout(()=>$('#boot').classList.add('hidden'),650);
  }
  setupRenderer(){
    const q=save.settings.quality; const dpr=q==='high'?Math.min(devicePixelRatio,2):q==='balanced'?Math.min(devicePixelRatio,1.5):1;
    this.renderer.setPixelRatio(dpr); this.renderer.setSize(innerWidth,innerHeight,false); this.renderer.shadowMap.enabled=q!=='battery'; this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    addEventListener('resize',()=>this.resize()); this.resize();
  }
  resize(){ this.camera.aspect=innerWidth/innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth,innerHeight,false); }
  setupLights(){
    this.hemi=new THREE.HemisphereLight(0xaedcff,0x101726,1.35); this.scene.add(this.hemi);
    this.sun=new THREE.DirectionalLight(0xffffff,2.35); this.sun.position.set(-8,13,7); this.sun.castShadow=true; this.sun.shadow.mapSize.set(1024,1024); this.sun.shadow.camera.left=-12; this.sun.shadow.camera.right=12; this.sun.shadow.camera.top=12; this.sun.shadow.camera.bottom=-12; this.scene.add(this.sun);
    this.rim=new THREE.PointLight(0x64e9ff,34,24,2); this.rim.position.set(5,5,-5); this.scene.add(this.rim);
  }
  bindUI(){
    $('#continueBtn').onclick=()=>{ audio.init(); this.startLevel(clamp(save.current,1,save.unlocked)); };
    $('#newGameBtn').onclick=()=>{ audio.init(); if(save.unlocked>1 && !confirm('Start a new campaign? Your existing stars will remain.')) return; this.startLevel(1); };
    $('#levelSelectBtn').onclick=()=>this.openWorldSelect(); $('#menuSettings').onclick=()=>this.openSettings();
    $$('.back').forEach(b=>b.onclick=()=>this.showScreen(b.dataset.back)); $('#levelBack').onclick=()=>this.openWorldSelect();
    $('#pauseBtn').onclick=()=>this.pause(); $('#resetBtn').onclick=()=>this.restartLevel(true); $('#resumeBtn').onclick=()=>this.resume(); $('#restartBtn').onclick=()=>{this.closeOverlay('#pauseOverlay');this.restartLevel(true)};
    $('#pauseLevelsBtn').onclick=()=>{this.closeOverlay('#pauseOverlay');this.openLevelSelect(this.currentLevel?.world||1)}; $('#pauseMenuBtn').onclick=()=>{this.closeOverlay('#pauseOverlay');this.goMenu()};
    $('#resultLevelsBtn').onclick=()=>{this.closeOverlay('#resultOverlay');this.openLevelSelect(this.currentLevel.world)}; $('#nextBtn').onclick=()=>this.nextLevel();
    $('#hintBtn').onclick=()=>{ if(this.currentLevel) toast(this.currentLevel.hint,3200); };
    $('#launchBtn').onclick=()=>this.running?this.retryRun():this.launch();
    $$('.receiver').forEach(b=>b.onclick=()=>this.setReceiver(b.dataset.receiver)); $$('.vector').forEach(b=>b.onclick=()=>this.setDirection(b.dataset.dir));
    $('#closeSettings').onclick=()=>this.closeOverlay('#settingsOverlay'); $('#soundToggle').onchange=e=>{save.settings.sound=e.target.checked;audio.setEnabled(e.target.checked);writeSave()};
    $('#hapticToggle').onchange=e=>{save.settings.haptics=e.target.checked;writeSave()}; $('#qualitySelect').onchange=e=>{save.settings.quality=e.target.value;writeSave();this.setupRenderer();toast('Quality updated')};
    $('#resetProgress').onclick=()=>{if(confirm('Reset all IMPACT progress?')){save=structuredClone(defaultSave);writeSave();this.updateMenuUI();this.closeOverlay('#settingsOverlay');toast('Save data reset')}};
    document.addEventListener('visibilitychange',()=>{ if(document.hidden && this.screen==='gameHud' && !this.levelComplete) this.pause(); });
  }
  setupInput(){
    canvas.addEventListener('pointerdown',e=>{
      if(this.screen!=='gameHud'||this.running) return; audio.init(); canvas.setPointerCapture?.(e.pointerId); this.drag.active=true; this.drag.moved=false; this.drag.x=this.drag.lastX=e.clientX; this.drag.y=this.drag.lastY=e.clientY;
    });
    canvas.addEventListener('pointermove',e=>{
      if(!this.drag.active||this.screen!=='gameHud'||this.running) return; const dx=e.clientX-this.drag.lastX,dy=e.clientY-this.drag.lastY; if(Math.abs(e.clientX-this.drag.x)+Math.abs(e.clientY-this.drag.y)>7)this.drag.moved=true;
      if(this.drag.moved){this.cameraState.yaw-=dx*.006;this.cameraState.pitch=clamp(this.cameraState.pitch+dy*.005,-.05,1.12);this.drag.lastX=e.clientX;this.drag.lastY=e.clientY;}
    });
    canvas.addEventListener('pointerup',e=>{ if(!this.drag.active)return; if(!this.drag.moved&&this.screen==='gameHud'&&!this.running)this.pickSurface(e.clientX,e.clientY);this.drag.active=false; });
    canvas.addEventListener('wheel',e=>{if(this.screen==='gameHud'){this.cameraState.distance=clamp(this.cameraState.distance+Math.sign(e.deltaY),10,25);e.preventDefault()}},{passive:false});
    let touchDist=0;
    canvas.addEventListener('touchstart',e=>{if(e.touches.length===2)touchDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)},{passive:true});
    canvas.addEventListener('touchmove',e=>{if(e.touches.length===2&&this.screen==='gameHud'){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(touchDist){this.cameraState.distance=clamp(this.cameraState.distance+(touchDist-d)*.025,10,25)}touchDist=d}},{passive:true});
  }
  showScreen(id){ $$('.screen').forEach(s=>s.classList.remove('active')); $('#'+id).classList.add('active'); this.screen=id; }
  openOverlay(id){ $(id).classList.add('active'); }
  closeOverlay(id){ $(id).classList.remove('active'); }
  openSettings(){ $('#soundToggle').checked=save.settings.sound;$('#hapticToggle').checked=save.settings.haptics;$('#qualitySelect').value=save.settings.quality;this.openOverlay('#settingsOverlay'); }
  updateMenuUI(){
    $('#continueMeta').textContent=`Level ${String(save.current).padStart(2,'0')}`; const solved=Object.keys(save.stars).filter(k=>save.stars[k]>0).length; $('#progressMeta').textContent=`${solved} / 50 solved`;
  }
  openWorldSelect(){
    this.clearStage(); this.buildMenuScene(); this.showScreen('worldSelect'); const wrap=$('#worldCards'); wrap.innerHTML='';
    WORLDS.forEach(w=>{const levels=getWorldLevels(w.id),first=levels[0].id,unlocked=save.unlocked>=first;const earned=levels.reduce((a,l)=>a+(save.stars[l.id]||0),0);const b=document.createElement('button');b.className='worldCard'+(unlocked?'':' locked');b.style.setProperty('--cardAccent',hex(w.accent));b.innerHTML=`<span class="eyebrow">WORLD ${w.id}</span><strong>${w.title}</strong><span>${w.subtitle}</span><div class="worldMeta"><span>${unlocked?'10 LEVELS':'LOCKED'}</span><b>${earned} / 30 ★</b></div>`;if(unlocked)b.onclick=()=>this.openLevelSelect(w.id);wrap.appendChild(b)});
  }
  openLevelSelect(worldId){
    this.currentWorld=worldId; this.clearStage();this.buildMenuScene(worldId);this.showScreen('levelSelect'); const w=WORLDS[worldId-1]; $('#levelWorldEyebrow').textContent=`WORLD ${w.id}`;$('#levelWorldTitle').textContent=w.title;
    const levels=getWorldLevels(worldId),earned=levels.reduce((a,l)=>a+(save.stars[l.id]||0),0);$('#worldStars').textContent=`${earned} / 30 ★`; const grid=$('#levelGrid');grid.innerHTML='';
    levels.forEach(l=>{const unlocked=l.id<=save.unlocked,stars=save.stars[l.id]||0,b=document.createElement('button');b.className='levelBtn'+(unlocked?'':' locked')+(l.id===save.current?' current':'');b.innerHTML=`<strong>${String(l.id).padStart(2,'0')}</strong><small>${stars?'★'.repeat(stars):'· · ·'}</small>`;if(unlocked)b.onclick=()=>this.startLevel(l.id);grid.appendChild(b)});
  }
  goMenu(){ this.running=false;this.levelComplete=false;this.clearStage();this.buildMenuScene();this.showScreen('mainMenu');this.updateMenuUI(); }
  buildMenuScene(worldId=1){
    this.menuMode=true; const w=WORLDS[worldId-1]; this.applyTheme(w); this.cameraState.target.set(0,1.5,0);this.cameraState.distance=15;this.cameraState.yaw=-.7;this.cameraState.pitch=.35;
    const floor=this.makeFloor(w);this.deco.add(floor); const mat=new THREE.MeshStandardMaterial({color:0x192b3a,metalness:.72,roughness:.23,emissive:w.accent,emissiveIntensity:.04});
    for(let i=0;i<9;i++){const g=new RoundedBoxGeometry(1.4+Math.random()*1.5,.32+Math.random()*1.1,1.1+Math.random()*1.8,4,.11);const m=new THREE.Mesh(g,mat.clone());m.position.set((i%3-1)*3.1,1+(i%4)*1.2,(Math.floor(i/3)-1)*2.7);m.rotation.set(Math.random()*.35,Math.random()*.6,Math.random()*.25);m.userData.floatSeed=Math.random()*10;m.castShadow=m.receiveShadow=true;this.deco.add(m)}
    const orb=this.createOrb(w.accent);orb.scale.setScalar(1.45);orb.position.set(0,3.2,0);orb.userData.menuOrb=true;this.deco.add(orb);
  }
  clearGroup(group){ while(group.children.length){const o=group.children.pop();o.traverse?.(c=>{c.geometry?.dispose?.(); if(Array.isArray(c.material))c.material.forEach(m=>m.dispose?.());else c.material?.dispose?.()});} }
  clearStage(){ this.clearGroup(this.stage);this.clearGroup(this.deco);this.clearGroup(this.fx);this.surfaceRuntime=[];this.gateRuntime=[];this.switchRuntime=[];this.hazardRuntime=[];this.particles=[];this.selected=null;this.orb=null;this.goalMesh=null; }
  applyTheme(w){
    this.scene.background=new THREE.Color(w.sky);this.scene.fog=new THREE.FogExp2(w.fog,.026);this.rim.color.setHex(w.accent);this.hemi.color.setHex(new THREE.Color(w.accent).lerp(new THREE.Color(0xffffff),.55).getHex());
    document.documentElement.style.setProperty('--accent',hex(w.accent));
  }
  makeFloor(w){
    const g=new THREE.PlaneGeometry(34,28,1,1),m=new THREE.MeshStandardMaterial({color:w.floor,roughness:.82,metalness:.15});const mesh=new THREE.Mesh(g,m);mesh.rotation.x=-Math.PI/2;mesh.position.y=-.25;mesh.receiveShadow=true;
    const grid=new THREE.GridHelper(30,30,w.accent,0x273343);grid.position.y=-.235;grid.material.opacity=.16;grid.material.transparent=true;const grp=new THREE.Group();grp.add(mesh,grid);return grp;
  }
  createOrb(accent){
    const grp=new THREE.Group();const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.28,3),new THREE.MeshStandardMaterial({color:0xf2fbff,metalness:.25,roughness:.12,emissive:accent,emissiveIntensity:.9}));core.castShadow=true;grp.add(core);
    const ringMat=new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.5,side:THREE.DoubleSide});for(let i=0;i<2;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.42,.015,8,64),ringMat.clone());ring.rotation.set(i?Math.PI/2:0,i?0:Math.PI/2,0);grp.add(ring)}grp.userData.core=core;return grp;
  }
  startLevel(id){
    audio.init(); const level=LEVELS.find(l=>l.id===id); if(!level)return;this.currentLevel=level;this.currentWorld=level.world;save.current=id;writeSave();this.levelComplete=false;this.menuMode=false;this.showScreen('gameHud');this.buildLevel(level);this.updateHud(); if(id===1 && !localStorage.getItem('impact_tutorial_seen')){setTimeout(()=>toast('Tap the glowing surface. Choose WHO + WHERE. Then LAUNCH.',4300),500);localStorage.setItem('impact_tutorial_seen','1');}
  }
  buildLevel(level, keepRules=null){
    this.running=false; $('#launchBtn')?.classList.remove('running'); if($('#launchBtn')){$('#launchBtn span').textContent='LAUNCH CORE';$('#launchBtn b').textContent='▶';} this.clearStage(); const w=WORLDS[level.world-1];this.applyTheme(w);this.stage.add(this.makeFloor(w));this.editSet=keepRules?.editSet||new Set();this.cooldowns={};this.insideSurfaces=new Set();
    this.cameraState.target.set(0,2,0);this.cameraState.yaw=-.72;this.cameraState.pitch=.46;this.cameraState.distance=17;
    for(let i=-1;i<=1;i+=2){const frame=new THREE.Mesh(new RoundedBoxGeometry(.22,7,10,2,.08),new THREE.MeshStandardMaterial({color:0x172335,metalness:.8,roughness:.3,emissive:w.accent,emissiveIntensity:.025}));frame.position.set(i*7.6,3.1,0);frame.castShadow=true;this.deco.add(frame)}
    const launcher=new THREE.Group();const baseMat=new THREE.MeshStandardMaterial({color:0x203247,metalness:.75,roughness:.22,emissive:w.accent,emissiveIntensity:.08});const base=new THREE.Mesh(new RoundedBoxGeometry(1.3,.7,1.3,3,.12),baseMat);const ring=new THREE.Mesh(new THREE.TorusGeometry(.48,.08,10,32),new THREE.MeshStandardMaterial({color:w.accent,emissive:w.accent,emissiveIntensity:1.2,metalness:.2,roughness:.2}));ring.rotation.y=Math.PI/2;launcher.add(base,ring);launcher.position.fromArray(level.launcher.pos);this.stage.add(launcher);this.launcher=launcher;
    this.goalMesh=new THREE.Group();const goalRing=new THREE.Mesh(new THREE.TorusGeometry(level.goal.r,.08,12,48),new THREE.MeshStandardMaterial({color:0xffffff,emissive:w.accent,emissiveIntensity:2.3,metalness:.1,roughness:.15,transparent:true,opacity:.95}));goalRing.rotation.y=Math.PI/2;const halo=new THREE.Mesh(new THREE.SphereGeometry(level.goal.r*.72,24,24),new THREE.MeshBasicMaterial({color:w.accent,transparent:true,opacity:.08,depthWrite:false}));this.goalMesh.add(goalRing,halo);this.goalMesh.position.fromArray(level.goal.pos);this.stage.add(this.goalMesh);
    level.surfaces.forEach(cfg=>{
      const old=keepRules?.rules?.[cfg.id];const rule=old?{...old}:{...cfg.rule};const geom=new RoundedBoxGeometry(cfg.size[0],cfg.size[1],cfg.size[2],4,.09);const mat=this.surfaceMaterial(cfg,w,rule);const mesh=new THREE.Mesh(geom,mat);mesh.position.fromArray(cfg.pos);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.surfaceId=cfg.id;this.stage.add(mesh);
      const arrow=this.makeArrow(rule.dir,w.accent,cfg.editable);mesh.add(arrow);const rt={cfg,mesh,arrow,rule,velocity:new THREE.Vector3(),start:new THREE.Vector3().fromArray(cfg.pos),active:true,dynamic:!!cfg.dynamic};this.surfaceRuntime.push(rt);
    });
    level.gates.forEach(cfg=>{const mesh=new THREE.Mesh(new RoundedBoxGeometry(...cfg.size,3,.08),new THREE.MeshStandardMaterial({color:0x55192a,emissive:0xff385f,emissiveIntensity:.8,metalness:.48,roughness:.24,transparent:true,opacity:.92}));mesh.position.fromArray(cfg.pos);mesh.castShadow=true;this.stage.add(mesh);this.gateRuntime.push({cfg,mesh,open:false})});
    level.switches.forEach(cfg=>{const mesh=new THREE.Mesh(new RoundedBoxGeometry(...cfg.size,3,.08),new THREE.MeshStandardMaterial({color:0x183e2a,emissive:0x5dff9c,emissiveIntensity:.65,metalness:.42,roughness:.28}));mesh.position.fromArray(cfg.pos);this.stage.add(mesh);this.switchRuntime.push({cfg,mesh,on:false})});
    level.hazards.forEach(cfg=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(...cfg.size),new THREE.MeshBasicMaterial({color:0xff315a,transparent:true,opacity:.1,wireframe:false,depthWrite:false}));const wire=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:0xff5576,transparent:true,opacity:.7}));mesh.add(wire);mesh.position.fromArray(cfg.pos);this.stage.add(mesh);this.hazardRuntime.push({cfg,mesh})});
    this.orb=this.createOrb(w.accent);this.orb.position.fromArray(level.launcher.pos);this.stage.add(this.orb);this.orbVel=new THREE.Vector3();
    const first=this.surfaceRuntime.find(s=>s.cfg.editable);if(first)this.selectSurface(first);this.updateHud();
  }
  surfaceMaterial(cfg,w,rule){
    if(!cfg.editable)return new THREE.MeshStandardMaterial({color:0x314053,metalness:.72,roughness:.24,emissive:0x87a4bd,emissiveIntensity:.035});
    const c=rule.receiver==='surface'?0xffb45c:w.accent;return new THREE.MeshStandardMaterial({color:rule.receiver==='surface'?0x49301c:0x173748,metalness:.68,roughness:.2,emissive:c,emissiveIntensity:.22});
  }
  makeArrow(dir,accent,editable=true){const grp=new THREE.Group();const v=DIRS[dir].clone();const ah=new THREE.ArrowHelper(v,new THREE.Vector3(),1.05,editable?accent:0x91a4b8,.28,.16);grp.add(ah);grp.userData.arrow=ah;grp.scale.setScalar(.9);return grp;}
  refreshArrow(rt){rt.mesh.remove(rt.arrow);rt.arrow=this.makeArrow(rt.rule.dir,WORLDS[this.currentLevel.world-1].accent,rt.cfg.editable);rt.mesh.add(rt.arrow);const mat=this.surfaceMaterial(rt.cfg,WORLDS[this.currentLevel.world-1],rt.rule);rt.mesh.material.dispose();rt.mesh.material=mat;}
  updateHud(){
    if(!this.currentLevel)return;const w=WORLDS[this.currentLevel.world-1];$('#hudWorld').textContent=`WORLD ${w.id} · ${w.title}`;$('#hudLevel').textContent=`${String(this.currentLevel.id).padStart(2,'0')} · ${this.currentLevel.name}`;$('#objectiveCard b').textContent=this.currentLevel.subtitle;$('#editCount').textContent=this.editSet.size;$('#parCount').textContent=`PAR ${this.currentLevel.par}`;$('#pauseTitle').textContent=this.currentLevel.name;
    this.updateSelectionUI();
  }
  updateSelectionUI(){
    if(!this.selected){$('#surfaceName').textContent='NO SURFACE';$('#selectionTag span').textContent='SELECT A SURFACE';return}
    $('#surfaceName').textContent=`SURFACE ${this.selected.cfg.id}`;$('#selectionTag span').textContent=`${this.selected.cfg.editable?'EDITING':'FIXED'} · ${this.selected.cfg.id} · ${this.selected.rule.receiver.toUpperCase()} → ${DIR_LABELS[this.selected.rule.dir]}`;
    $$('.receiver').forEach(b=>b.classList.toggle('active',b.dataset.receiver===this.selected.rule.receiver));$$('.vector').forEach(b=>b.classList.toggle('active',b.dataset.dir===this.selected.rule.dir));
    $$('.receiver,.vector').forEach(b=>b.disabled=!this.selected.cfg.editable||this.running);
  }
  pickSurface(x,y){
    const r=canvas.getBoundingClientRect();this.pointer.x=((x-r.left)/r.width)*2-1;this.pointer.y=-((y-r.top)/r.height)*2+1;this.raycaster.setFromCamera(this.pointer,this.camera);const hits=this.raycaster.intersectObjects(this.surfaceRuntime.map(s=>s.mesh),false);if(!hits.length)return;const rt=this.surfaceRuntime.find(s=>s.mesh===hits[0].object);if(rt)this.selectSurface(rt);
  }
  selectSurface(rt){
    if(this.selected?.mesh){this.selected.mesh.scale.setScalar(1)}this.selected=rt;rt.mesh.scale.setScalar(1.045);this.updateSelectionUI();audio.select();haptic(10);
  }
  markEdited(){ if(this.selected?.cfg.editable){const initial=this.selected.cfg.rule;if(initial.receiver!==this.selected.rule.receiver||initial.dir!==this.selected.rule.dir)this.editSet.add(this.selected.cfg.id);else this.editSet.delete(this.selected.cfg.id);$('#editCount').textContent=this.editSet.size;} }
  setReceiver(receiver){if(!this.selected||!this.selected.cfg.editable||this.running)return;this.selected.rule.receiver=receiver;this.markEdited();this.refreshArrow(this.selected);this.updateSelectionUI();audio.click();haptic();}
  setDirection(dir){if(!this.selected||!this.selected.cfg.editable||this.running)return;this.selected.rule.dir=dir;this.markEdited();this.refreshArrow(this.selected);this.updateSelectionUI();audio.click();haptic();}
  launch(){
    if(!this.currentLevel||this.running||this.levelComplete)return;this.running=true;this.orbVel.fromArray(this.currentLevel.launcher.dir).normalize().multiplyScalar(this.currentLevel.launcher.speed);$('#launchBtn').classList.add('running');$('#launchBtn span').textContent='RETRY';$('#launchBtn b').textContent='↻';this.updateSelectionUI();audio.launch();haptic(18);
  }
  retryRun(){this.resetSimulation(true);}
  restartLevel(full=true){const rules=full?null:this.captureRules();this.buildLevel(this.currentLevel,rules);toast(full?'Level reset':'Ready');}
  resetSimulation(keepRules=true){const rules=keepRules?this.captureRules():null;this.buildLevel(this.currentLevel,rules);}
  captureRules(){const rules={};this.surfaceRuntime.forEach(s=>rules[s.cfg.id]={...s.rule});return{rules,editSet:new Set(this.editSet)}}
  fail(reason){if(!this.running||this.failureTimer)return;this.running=false;this.failureTimer=.65;audio.fail();haptic(30);toast(reason);$('#launchBtn').classList.remove('running');$('#launchBtn span').textContent='LAUNCH CORE';$('#launchBtn b').textContent='▶';}
  completeLevel(){
    if(this.levelComplete)return;this.levelComplete=true;this.running=false;audio.win();haptic([20,50,20]);const edits=this.editSet.size,par=this.currentLevel.par,stars=edits<=par?3:edits<=par+1?2:1;save.stars[this.currentLevel.id]=Math.max(save.stars[this.currentLevel.id]||0,stars);save.unlocked=Math.max(save.unlocked,Math.min(50,this.currentLevel.id+1));save.current=Math.min(50,this.currentLevel.id+1);writeSave();this.updateMenuUI();
    $('#resultTitle').textContent=this.currentLevel.name;$('#resultStars').textContent='★'.repeat(stars)+'☆'.repeat(3-stars);$('#resultEdits').textContent=edits;$('#resultPar').textContent=par;$('#resultCopy').textContent=stars===3?'Perfect. Minimal intervention.':stars===2?'Solved. There is a cleaner rule set.':'Solved. Now reduce your edits.';$('#nextBtn span').textContent=this.currentLevel.id===50?'RETURN TO MENU':'NEXT LEVEL';setTimeout(()=>this.openOverlay('#resultOverlay'),500);
  }
  nextLevel(){this.closeOverlay('#resultOverlay');if(this.currentLevel.id>=50){this.goMenu();return}this.startLevel(this.currentLevel.id+1);}
  pause(){if(this.screen!=='gameHud'||this.levelComplete)return;this.openOverlay('#pauseOverlay');this.pausedBefore=this.running;this.running=false;}
  resume(){this.closeOverlay('#pauseOverlay');this.running=!!this.pausedBefore;}
  sphereAABB(pos,r,mesh,sizeArr=null){
    let box;if(sizeArr){box=new THREE.Box3().setFromCenterAndSize(mesh.position,new THREE.Vector3().fromArray(sizeArr))}else{const p=mesh.geometry.parameters;const size=p?.width?new THREE.Vector3(p.width,p.height,p.depth):null;box=size?new THREE.Box3().setFromCenterAndSize(mesh.position,size):new THREE.Box3().setFromObject(mesh)}
    const closest=box.clampPoint(pos,new THREE.Vector3());const d=pos.clone().sub(closest);const dist=d.length();return{hit:dist<r,normal:dist>.0001?d.normalize():this.orbVel.clone().normalize().multiplyScalar(-1),box};
  }
  overlapMeshBox(mesh,cfg){const a=new THREE.Box3().setFromObject(mesh),b=new THREE.Box3().setFromCenterAndSize(new THREE.Vector3().fromArray(cfg.pos),new THREE.Vector3().fromArray(cfg.size));return a.intersectsBox(b);}
  updatePhysics(dt){
    if(this.failureTimer>0){this.failureTimer-=dt;if(this.failureTimer<=0)this.resetSimulation(true);return}
    if(!this.running||!this.orb)return;
    Object.keys(this.cooldowns).forEach(k=>this.cooldowns[k]=Math.max(0,this.cooldowns[k]-dt));
    this.orb.position.addScaledVector(this.orbVel,dt);this.orb.rotation.x+=dt*this.orbVel.z*.8;this.orb.rotation.z-=dt*this.orbVel.x*.8;
    this.surfaceRuntime.forEach(s=>{if(s.dynamic){s.mesh.position.addScaledVector(s.velocity,dt);s.velocity.multiplyScalar(Math.pow(.985,dt*60));}});
    this.switchRuntime.forEach(swrt=>{
      if(swrt.on)return;const orbBox=new THREE.Box3().setFromCenterAndSize(this.orb.position,new THREE.Vector3(.55,.55,.55));const switchBox=new THREE.Box3().setFromCenterAndSize(new THREE.Vector3().fromArray(swrt.cfg.pos),new THREE.Vector3().fromArray(swrt.cfg.size));let on=orbBox.intersectsBox(switchBox);if(!on)on=this.surfaceRuntime.some(s=>s.dynamic&&this.overlapMeshBox(s.mesh,swrt.cfg));if(on){swrt.on=true;swrt.mesh.material.emissiveIntensity=2.1;this.gateRuntime.filter(g=>g.cfg.id===swrt.cfg.gateId).forEach(g=>this.openGate(g));audio.tone(530,.16,'sine',.07,1.6);toast('GATE UNLOCKED');}
    });
    for(const g of this.gateRuntime){if(g.open)continue;const hit=this.sphereAABB(this.orb.position,.28,g.mesh,g.cfg.size);if(hit.hit){this.fail('Gate sealed');return}}
    for(const h of this.hazardRuntime){const box=new THREE.Box3().setFromCenterAndSize(new THREE.Vector3().fromArray(h.cfg.pos),new THREE.Vector3().fromArray(h.cfg.size));if(box.containsPoint(this.orb.position)){this.fail('Core entered a null field');return}}
    for(const s of this.surfaceRuntime){
      const col=this.sphereAABB(this.orb.position,.29,s.mesh,s.cfg.size);if(!col.hit){this.insideSurfaces.delete(s.cfg.id);continue}if(this.insideSurfaces.has(s.cfg.id))continue;this.insideSurfaces.add(s.cfg.id);const speed=Math.max(5,this.orbVel.length()),dir=DIRS[s.rule.dir].clone();
      if(s.rule.receiver==='orb'){
        this.orbVel.copy(dir).multiplyScalar(speed*1.015);this.orb.position.addScaledVector(col.normal,.18);
      }else{
        if(!s.dynamic){s.dynamic=true;}s.velocity.copy(dir).multiplyScalar(8.5);this.orb.position.addScaledVector(this.orbVel.clone().normalize(),.42);
      }
      this.spawnImpact(this.orb.position,s.rule.receiver,WORLDS[this.currentLevel.world-1].accent);audio.impact(s.rule.receiver);haptic(20);
    }
    if(this.orb.position.distanceTo(new THREE.Vector3().fromArray(this.currentLevel.goal.pos))<this.currentLevel.goal.r*1.15){this.completeLevel();return}
    const p=this.orb.position;if(Math.abs(p.x)>9.5||p.y>8.2||p.y<-3||Math.abs(p.z)>7.8){this.fail('Core left the chamber');return}
  }
  openGate(g){g.open=true;const start=performance.now();const animate=()=>{const t=clamp((performance.now()-start)/420,0,1);g.mesh.scale.y=1-t;g.mesh.material.opacity=1-t;if(t<1)requestAnimationFrame(animate);else g.mesh.visible=false};animate();}
  spawnImpact(pos,receiver,accent){
    const count=save.settings.quality==='battery'?10:22;const geom=new THREE.BufferGeometry(),arr=new Float32Array(count*3),vel=[];for(let i=0;i<count;i++){arr[i*3]=pos.x;arr[i*3+1]=pos.y;arr[i*3+2]=pos.z;vel.push(new THREE.Vector3((Math.random()-.5)*4,(Math.random()-.5)*4,(Math.random()-.5)*4))}geom.setAttribute('position',new THREE.BufferAttribute(arr,3));const mat=new THREE.PointsMaterial({color:receiver==='surface'?0xffb45c:accent,size:.09,transparent:true,opacity:1,depthWrite:false});const pts=new THREE.Points(geom,mat);this.fx.add(pts);this.particles.push({pts,vel,life:.55});
  }
  updateParticles(dt){for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i],a=p.pts.geometry.attributes.position.array;p.life-=dt;for(let j=0;j<p.vel.length;j++){a[j*3]+=p.vel[j].x*dt;a[j*3+1]+=p.vel[j].y*dt;a[j*3+2]+=p.vel[j].z*dt;p.vel[j].multiplyScalar(.95)}p.pts.geometry.attributes.position.needsUpdate=true;p.pts.material.opacity=clamp(p.life/.55,0,1);if(p.life<=0){this.fx.remove(p.pts);p.pts.geometry.dispose();p.pts.material.dispose();this.particles.splice(i,1)}}}
  updateCamera(){const c=this.cameraState;const cp=Math.cos(c.pitch),sp=Math.sin(c.pitch);this.camera.position.set(c.target.x+Math.cos(c.yaw)*cp*c.distance,c.target.y+sp*c.distance,c.target.z+Math.sin(c.yaw)*cp*c.distance);this.camera.lookAt(c.target);}
  animate(){requestAnimationFrame(()=>this.animate());const dt=Math.min(.033,this.clock.getDelta());this.menuTime+=dt;this.updateCamera();
    if(this.menuMode){this.deco.children.forEach((o,i)=>{if(o.userData.menuOrb){o.position.y=3.2+Math.sin(this.menuTime*1.2)*.28;o.rotation.y+=dt*.55}else if(o.userData.floatSeed!=null){o.position.y+=Math.sin(this.menuTime*.8+o.userData.floatSeed)*.0018;o.rotation.y+=dt*.025}})}
    if(this.goalMesh){this.goalMesh.rotation.z+=dt*.55;const halo=this.goalMesh.children[1];if(halo)halo.scale.setScalar(1+Math.sin(this.menuTime*3)*.08)}
    this.updatePhysics(dt);this.updateParticles(dt);this.renderer.render(this.scene,this.camera);
  }
}

const game=new ImpactGame();

if('serviceWorker' in navigator){addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
