const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const toastEl = document.getElementById('toast');

const ui = {
  money: document.getElementById('money'),
  lives: document.getElementById('lives'),
  wave: document.getElementById('wave'),
  towerBar: document.getElementById('towerBar'),
  startWaveBtn: document.getElementById('startWaveBtn'),
  speedBtn: document.getElementById('speedBtn'),
  rotateBtn: document.getElementById('rotateBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  modeBtn: document.getElementById('modeBtn'),
  selectionPanel: document.getElementById('selectionPanel'),
  selectedName: document.getElementById('selectedName'),
  selectedStats: document.getElementById('selectedStats'),
  upgradePreview: document.getElementById('upgradePreview'),
  upgradeBtn: document.getElementById('upgradeBtn'),
  sellBtn: document.getElementById('sellBtn'),
  closeSelectionBtn: document.getElementById('closeSelectionBtn'),
  researchPoints: document.getElementById('researchPoints'),
  difficultySelect: document.getElementById('difficultySelect'),
  difficultyLabel: document.getElementById('difficultyLabel'),
};

const towerDefs = {
  basic: { name:'Archer', cost:60, color:'#8cd0ff', range:2.2, damage:10, rate:0.7, splash:0, slow:0, unlock:'base' },
  aoe: { name:'Mortar', cost:95, color:'#ffcb72', range:2.8, damage:18, rate:1.2, splash:1.1, slow:0, unlock:'base' },
  slow: { name:'Cryo', cost:85, color:'#9bf8ff', range:2.5, damage:5, rate:0.4, splash:0, slow:0.35, unlock:'base' },
  sniper: { name:'Rail', cost:140, color:'#ff87b7', range:4.2, damage:48, rate:1.8, splash:0, slow:0, unlock:'base' },
  special: { name:'Pulse', cost:130, color:'#d5a2ff', range:2.3, damage:12, rate:1.4, splash:0.8, slow:0.15, unlock:'unlockPulse' },
  late: { name:'Nova Core', cost:240, color:'#98ff8b', range:3.4, damage:42, rate:0.9, splash:1.4, slow:0, unlock:'unlockNova' },
};
const enemyDefs = {
  grunt:{ hp:40,speed:0.85,reward:11,color:'#f6d376' },
  fast:{ hp:28,speed:1.35,reward:12,color:'#ffa0a0' },
  tank:{ hp:130,speed:0.5,reward:25,color:'#92a4b2' },
  armored:{ hp:90,speed:0.7,reward:20,armor:0.25,color:'#c7a684' },
  flying:{ hp:52,speed:1.1,reward:17,flying:true,color:'#b0e7ff' },
  shielded:{ hp:72,speed:0.8,reward:18,shield:35,color:'#9db5ff' },
  regen:{ hp:78,speed:0.72,reward:19,regen:2.4,color:'#8cf0a5' },
  phase:{ hp:65,speed:1.0,reward:20,evasion:0.2,color:'#d9c0ff' },
  splitter:{ hp:56,speed:0.82,reward:20,split:true,color:'#ffbd74' },
  berserk:{ hp:68,speed:1.0,reward:22,berserk:true,color:'#ff7a7a' },
  bossA:{ hp:650,speed:0.5,reward:140,boss:true,armor:0.12,regen:3,color:'#ffd1f8' },
  bossB:{ hp:900,speed:0.55,reward:200,boss:true,shield:180,color:'#ffc28a' },
};
const levels = Array.from({length:10}, (_,i)=>({
  id:i+1,
  name:`Sector ${i+1}`,
  bonus: i%2===0 ? 'Solar Surge (+10% enemy speed)' : 'Supply Cache (+10 start cash)',
  path: i%2===0 ? [[0,1],[1,1],[2,2],[3,2],[4,3],[5,3],[6,4],[7,4],[8,5],[9,5]] : [[0,5],[1,5],[2,4],[3,4],[4,3],[5,3],[6,2],[7,2],[8,1],[9,1]],
  waves:[
    [['grunt',8],['fast',4]],
    [['grunt',10],['armored',5]],
    [['fast',10],['shielded',6]],
    [['tank',7],['regen',4]],
    [['flying',12],['phase',6]],
    [['splitter',10],['berserk',6]],
    [['tank',10],['shielded',8]],
    [['regen',12],['phase',8]],
    [['armored',14],['flying',10]],
    [[i<8?'bossA':'bossB',1],['berserk',10]],
  ]
}));

const difficulties = {
  easy:{ hpMul:0.82, speedMul:0.9, rewardMul:1.12, lives:24 },
  normal:{ hpMul:1, speedMul:1, rewardMul:1, lives:20 },
  hard:{ hpMul:1.2, speedMul:1.18, rewardMul:0.9, lives:16 },
};

const state = {
  mapW:10,mapH:8,tile:56,
  cameraYaw:0.8,pitch:0.66,zoom:1,
  money:140,lives:20,levelIndex:0,waveIndex:0,spawnQueue:[],spawnCooldown:0,
  towers:[], enemies:[], projectiles:[], selectedTowerType:'basic', selectedTower:null,
  speed:1,paused:false, endless:false, gameOver:false, victory:false,
  effects:[], meta:loadMeta(), settings:loadSettings(),
};

function loadMeta(){
  return JSON.parse(localStorage.getItem('td_meta')||'{"research":0,"economy":0,"armor":0,"arsenal":0,"unlockPulse":0,"unlockNova":0}');
}
function saveMeta(){ localStorage.setItem('td_meta', JSON.stringify(state.meta)); }
function loadSettings(){
  return JSON.parse(localStorage.getItem('td_settings')||'{"audio":true,"effects":true,"shake":true,"accessibility":false,"performance":false}');
}
function saveSettings(){ localStorage.setItem('td_settings', JSON.stringify(state.settings)); }

function showToast(msg,ok=true){ toastEl.textContent=msg; toastEl.style.background=ok?'#1f5838':'#5a2432'; toastEl.classList.add('show'); clearTimeout(showToast.t); showToast.t=setTimeout(()=>toastEl.classList.remove('show'),1400); }

function worldToScreen(x,y,z){
  const cx=state.mapW/2, cz=state.mapH/2;
  const dx=x-cx, dz=z-cz;
  const cos=Math.cos(state.cameraYaw), sin=Math.sin(state.cameraYaw);
  const rx=dx*cos-dz*sin;
  const rz=dx*sin+dz*cos;
  const scale=state.tile*state.zoom;
  const sx=canvas.width/2 + rx*scale;
  const sy=canvas.height*0.58 + (rz*Math.cos(state.pitch)-y)*scale;
  return [sx,sy,rz];
}
function screenToGrid(sx,sy){
  const scale=state.tile*state.zoom;
  const rx=(sx-canvas.width/2)/scale;
  const rz=(sy-canvas.height*0.58)/(scale*Math.cos(state.pitch));
  const cos=Math.cos(-state.cameraYaw), sin=Math.sin(-state.cameraYaw);
  const dx=rx*cos-rz*sin, dz=rx*sin+rz*cos;
  return [Math.floor(dx+state.mapW/2),Math.floor(dz+state.mapH/2)];
}
function pathCells(){ return new Set(levels[state.levelIndex].path.map(([x,z])=>`${x},${z}`)); }

function canPlace(x,z){
  if (x<0||z<0||x>=state.mapW||z>=state.mapH) return false;
  if (pathCells().has(`${x},${z}`)) return false;
  return !state.towers.some(t=>t.x===x&&t.z===z);
}
function addTower(type,x,z){
  const d=towerDefs[type];
  if (!d || state.money<d.cost || !canPlace(x,z)) return false;
  state.money-=d.cost;
  state.towers.push({type,x,z,tier:1,cooldown:0});
  playTone(420,0.08); return true;
}
function towerStats(t){
  const base=towerDefs[t.type]; const mul=1+(t.tier-1)*0.4;
  return { damage:Math.round(base.damage*mul*(1+state.meta.arsenal*0.06)), range:base.range+(t.tier-1)*0.28, rate:Math.max(0.18,base.rate-(t.tier-1)*0.12), splash:base.splash+(t.tier-1)*0.12, slow:Math.min(.65,base.slow+(t.tier-1)*0.08) };
}
function upgradeCost(t){ return Math.round(towerDefs[t.type].cost*(0.75+t.tier*0.55)); }

function spawnEnemy(type){
  const def=enemyDefs[type]; const diff=difficulties[ui.difficultySelect.value]; const lvl=state.levelIndex;
  const hpMul=(1+lvl*0.14+(state.endless?state.waveIndex*0.04:0))*diff.hpMul;
  const speedMul=(1+lvl*0.04)*diff.speedMul*(levels[state.levelIndex].bonus.includes('speed')?1.1:1);
  state.enemies.push({
    type, pathPos:0, hp:def.hp*hpMul, maxHp:def.hp*hpMul, speed:def.speed*speedMul, reward:Math.round(def.reward*diff.rewardMul),
    armor:def.armor||0, flying:def.flying||false, shield:def.shield||0, regen:def.regen||0, evasion:def.evasion||0,
    split:def.split||false, berserk:def.berserk||false, boss:def.boss||false, slowFactor:1, y:def.flying?0.9:0
  });
}
function queueWave(){
  const level=levels[state.levelIndex];
  const wave = level.waves[state.waveIndex % level.waves.length];
  if (!wave) return;
  state.spawnQueue=[];
  for (const [type,count] of wave) for(let i=0;i<count;i++) state.spawnQueue.push(type);
  state.spawnCooldown=0;
}
function nextWave(){
  if (state.waveIndex>=levels[state.levelIndex].waves.length && !state.endless) {
    state.meta.research += 2 + Math.floor(state.levelIndex/2);
    state.levelIndex = Math.min(levels.length-1,state.levelIndex+1);
    state.waveIndex=0; saveMeta(); showToast(`Level cleared! Entering ${levels[state.levelIndex].name}`); return;
  }
  queueWave();
}

function dealDamage(e, dmg){
  if (Math.random()<e.evasion) return;
  if (e.shield>0){ const block=Math.min(e.shield,dmg); e.shield-=block; dmg-=block; }
  dmg *= (1-e.armor);
  e.hp -= dmg;
  if (state.settings.effects) state.effects.push({x:e.x,z:e.z,t:0.22,color:'#ffd'});
  if (e.hp<=0){
    state.money += e.reward;
    if (e.split) { spawnChild(e); spawnChild(e); }
    playTone(220,0.05);
  }
}
function spawnChild(e){ state.enemies.push({ ...e, hp:e.maxHp*0.35, maxHp:e.maxHp*0.35, speed:e.speed*1.28, split:false, reward:Math.round(e.reward*0.3), shield:0 }); }

function gameStep(dt){
  if(state.paused||state.gameOver) return;
  const simDt=dt*state.speed;
  if (state.spawnQueue.length){ state.spawnCooldown-=simDt; if(state.spawnCooldown<=0){ spawnEnemy(state.spawnQueue.shift()); state.spawnCooldown=0.45; }}

  for (const e of state.enemies){
    const path=levels[state.levelIndex].path;
    const pIdx=Math.min(path.length-2, Math.floor(e.pathPos));
    const [x1,z1]=path[pIdx], [x2,z2]=path[pIdx+1];
    const frac=e.pathPos-pIdx;
    e.x=x1+(x2-x1)*frac; e.z=z1+(z2-z1)*frac;
    const bers=e.berserk && e.hp<e.maxHp*0.45 ? 1.45 : 1;
    e.pathPos += (e.speed*bers*e.slowFactor*simDt)*0.38;
    e.slowFactor += (1-e.slowFactor)*simDt*2.2;
    if (e.regen) e.hp=Math.min(e.maxHp,e.hp+e.regen*simDt);
  }
  for(const e of state.enemies){ if(e.pathPos>=levels[state.levelIndex].path.length-1){ state.lives -= e.boss?3:1; e.hp=-1; if(state.settings.shake) shake=10; }}

  for (const t of state.towers){
    t.cooldown -= simDt;
    if (t.cooldown>0) continue;
    const s=towerStats(t);
    let target=null, best=-1;
    for(const e of state.enemies){
      const dx=e.x-t.x, dz=e.z-t.z, d=Math.hypot(dx,dz);
      if(d<=s.range && e.pathPos>best){ target=e; best=e.pathPos; }
    }
    if(!target) continue;
    t.cooldown=s.rate;
    const hit=(victim)=>{ dealDamage(victim,s.damage); victim.slowFactor=Math.max(0.35, victim.slowFactor - s.slow); };
    hit(target);
    if(s.splash>0){ for(const e of state.enemies){ if(e!==target&&Math.hypot(e.x-target.x,e.z-target.z)<=s.splash) hit(e); }}
    if (state.settings.effects) state.effects.push({x:t.x,z:t.z,t:0.15,color:towerDefs[t.type].color});
  }

  state.enemies = state.enemies.filter(e=>e.hp>0);
  state.effects = state.effects.filter(f=>(f.t-=simDt)>0);
  if (!state.spawnQueue.length && !state.enemies.length && !state.gameOver) { state.waveIndex++; nextWave(); }
  if (state.lives<=0){ state.gameOver=true; showToast('Defeat. Try meta upgrades.', false); }
}

let shake=0;
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#08101a'; ctx.fillRect(0,0,canvas.width,canvas.height);
  const tiles=[];
  for(let x=0;x<state.mapW;x++) for(let z=0;z<state.mapH;z++){
    const p=worldToScreen(x,0,z); tiles.push({x,z,p});
  }
  tiles.sort((a,b)=>a.p[2]-b.p[2]);
  const path=pathCells();
  for(const t of tiles){
    const [sx,sy]=t.p;
    ctx.fillStyle = path.has(`${t.x},${t.z}`)?'#3e5a74':'#253746';
    const w=state.tile*0.92;
    ctx.beginPath();
    ctx.moveTo(sx,sy-w*0.36);ctx.lineTo(sx+w*0.5,sy);ctx.lineTo(sx,sy+w*0.36);ctx.lineTo(sx-w*0.5,sy);ctx.closePath();
    ctx.fill();
  }

  for(const tw of state.towers){
    const s=worldToScreen(tw.x,0.6,tw.z); const d=towerDefs[tw.type];
    ctx.fillStyle=d.color; ctx.beginPath(); ctx.arc(s[0],s[1],9+tw.tier*3,0,Math.PI*2); ctx.fill();
    if (state.selectedTower===tw){
      const st=towerStats(tw); const g=worldToScreen(tw.x,0,tw.z);
      ctx.strokeStyle='rgba(120,210,255,.35)'; ctx.beginPath(); ctx.arc(g[0],g[1],st.range*state.tile,0,Math.PI*2); ctx.stroke();
    }
  }

  for(const e of state.enemies){
    const s=worldToScreen(e.x,e.y||0.35,e.z);
    ctx.fillStyle=e.boss?'#ff4f7f':e.color||enemyDefs[e.type].color;
    ctx.beginPath(); ctx.arc(s[0],s[1],e.boss?13:8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#111'; ctx.fillRect(s[0]-14,s[1]-14,28,4);
    ctx.fillStyle='#3bf58d'; ctx.fillRect(s[0]-14,s[1]-14,28*(e.hp/e.maxHp),4);
    if(e.shield>0){ ctx.strokeStyle='#89a6ff'; ctx.strokeRect(s[0]-14,s[1]-19,28*(e.shield/(enemyDefs[e.type].shield||e.shield)),3); }
  }
  for(const fx of state.effects){ const s=worldToScreen(fx.x,0.6,fx.z); ctx.strokeStyle=fx.color; ctx.globalAlpha=Math.max(.1,fx.t*4); ctx.beginPath(); ctx.arc(s[0],s[1],(1-fx.t)*28,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1; }

  if(shake>0){ shake*=0.78; canvas.style.transform=`translate(${(Math.random()-.5)*shake}px,${(Math.random()-.5)*shake}px)`; } else canvas.style.transform='';
}

function refreshUI(){
  ui.money.textContent=Math.floor(state.money);
  ui.lives.textContent=state.lives;
  ui.wave.textContent=`${Math.min(state.waveIndex+1, levels[state.levelIndex].waves.length)}/${levels[state.levelIndex].waves.length}`;
  ui.researchPoints.textContent=state.meta.research;
  ui.difficultyLabel.textContent=ui.difficultySelect.value;
  ui.modeBtn.textContent=`Endless: ${state.endless?'On':'Off'}`;
  if (state.selectedTower){
    const s=towerStats(state.selectedTower), c=upgradeCost(state.selectedTower), next={...s,damage:Math.round(s.damage*1.4),range:(s.range+0.28).toFixed(2),rate:Math.max(0.18,s.rate-0.12).toFixed(2)};
    ui.selectionPanel.classList.remove('hidden');
    ui.selectedName.textContent=`${towerDefs[state.selectedTower.type].name} T${state.selectedTower.tier}`;
    ui.selectedStats.textContent=`DMG ${s.damage} | RNG ${s.range.toFixed(2)} | CD ${s.rate.toFixed(2)} | Cost ${c}`;
    ui.upgradePreview.textContent= state.selectedTower.tier>=3 ? 'Max tier reached.' : `Next → DMG ${next.damage}, RNG ${next.range}, CD ${next.rate}`;
  } else ui.selectionPanel.classList.add('hidden');

  document.querySelectorAll('.metaBtn').forEach(btn=>{
    const key=btn.dataset.upgrade, lvl=state.meta[key]||0, cap=key.startsWith('unlock')?1:5;
    btn.textContent = `${btn.textContent.split(' [')[0]} [${lvl}/${cap}]`;
    btn.disabled = lvl>=cap || state.meta.research<1+lvl;
  });
}

function initTowerBar(){
  ui.towerBar.innerHTML='';
  for(const [key,d] of Object.entries(towerDefs)){
    const b=document.createElement('button'); b.className='towerBtn'; b.textContent=`${d.name}\n$${d.cost}`;
    if (d.unlock!=='base' && !state.meta[d.unlock]) b.classList.add('locked');
    b.onclick=()=>{ if (d.unlock!=='base' && !state.meta[d.unlock]) return showToast('Locked in meta tree',false); state.selectedTowerType=key; showToast(`${d.name} selected`); };
    ui.towerBar.appendChild(b);
  }
}

canvas.addEventListener('pointerdown',e=>{
  const rect=canvas.getBoundingClientRect();
  const sx=(e.clientX-rect.left)*(canvas.width/rect.width), sy=(e.clientY-rect.top)*(canvas.height/rect.height);
  const [gx,gz]=screenToGrid(sx,sy);
  const existing=state.towers.find(t=>t.x===gx&&t.z===gz);
  if (existing){ state.selectedTower=existing; refreshUI(); return; }
  state.selectedTower=null;
  if(addTower(state.selectedTowerType,gx,gz)) showToast('Tower placed');
  else showToast('Cannot place here / insufficient funds', false);
  refreshUI();
});

ui.upgradeBtn.onclick=()=>{
  const t=state.selectedTower; if(!t||t.tier>=3) return;
  const c=upgradeCost(t); if(state.money<c) return showToast('Not enough currency',false);
  state.money-=c; t.tier++; refreshUI(); playTone(540,.08);
};
ui.sellBtn.onclick=()=>{
  const t=state.selectedTower; if(!t) return;
  state.money += Math.round((towerDefs[t.type].cost + (t.tier-1)*upgradeCost(t)*.4)*0.6);
  state.towers = state.towers.filter(x=>x!==t); state.selectedTower=null; refreshUI();
};
ui.closeSelectionBtn.onclick=()=>{ state.selectedTower=null; refreshUI(); };

ui.startWaveBtn.onclick=()=>{ if(!state.spawnQueue.length && !state.enemies.length) queueWave(); };
ui.speedBtn.onclick=()=>{ state.speed = state.speed===1?2:state.speed===2?3:1; ui.speedBtn.textContent=`${state.speed}x`; };
ui.rotateBtn.onclick=()=>{ state.cameraYaw += Math.PI/2; };
ui.pauseBtn.onclick=()=>{ state.paused=!state.paused; ui.pauseBtn.textContent=state.paused?'Resume':'Pause'; };
ui.modeBtn.onclick=()=>{ state.endless=!state.endless; refreshUI(); };
ui.difficultySelect.onchange=()=>resetRun();

document.querySelectorAll('.metaBtn').forEach(btn=>btn.onclick=()=>{
  const key=btn.dataset.upgrade; const lvl=state.meta[key]||0; const cap=key.startsWith('unlock')?1:5; const cost=1+lvl;
  if(lvl>=cap||state.meta.research<cost) return;
  state.meta.research-=cost; state.meta[key]=lvl+1; saveMeta(); initTowerBar(); refreshUI();
});

['audio','effects','shake','accessibility','performance'].forEach(k=>{
  const el=document.getElementById(`${k}Toggle`);
  el.checked=state.settings[k];
  el.onchange=()=>{ state.settings[k]=el.checked; saveSettings(); if(k==='accessibility') document.body.style.fontSize=el.checked?'17px':''; };
});

function resetRun(){
  const diff=difficulties[ui.difficultySelect.value];
  state.money=Math.round((140+state.meta.economy*7+(levels[state.levelIndex].bonus.includes('cash')?10:0)));
  state.lives=diff.lives+state.meta.armor*2; state.waveIndex=0; state.spawnQueue=[]; state.towers=[]; state.enemies=[]; state.selectedTower=null; state.gameOver=false;
  refreshUI();
}

let audioCtx;
function playTone(freq,dur){
  if(!state.settings.audio) return;
  audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
  const o=audioCtx.createOscillator(), g=audioCtx.createGain();
  o.frequency.value=freq; o.type='triangle'; g.gain.value=0.03; o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+dur);
}

function resize(){
  canvas.width = Math.floor(window.innerWidth*devicePixelRatio);
  canvas.height = Math.floor(window.innerHeight*devicePixelRatio);
  ctx.setTransform(1,0,0,1,0,0); ctx.scale(1/devicePixelRatio,1/devicePixelRatio);
  canvas.width = Math.floor(window.innerWidth);
  canvas.height = Math.floor(window.innerHeight);
}
window.addEventListener('resize',resize);
resize();
initTowerBar();
resetRun();
refreshUI();
queueWave();

let last=performance.now();
(function loop(now){ const dt=Math.min(0.05,(now-last)/1000); last=now; gameStep(dt); draw(); refreshUI(); requestAnimationFrame(loop); })(last);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
