import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

const canvas = document.getElementById('gameCanvas');
const toastEl = document.getElementById('toast');

const ui = {
  money: document.getElementById('money'), lives: document.getElementById('lives'), wave: document.getElementById('wave'), mode: document.getElementById('mode'),
  towerDock: document.getElementById('towerDock'), abilityBar: document.getElementById('abilityBar'), wavePreview: document.getElementById('wavePreview'), bossWarning: document.getElementById('bossWarning'),
  buildPanel: document.getElementById('buildPanel'), buildTitle: document.getElementById('buildTitle'), cancelBuildBtn: document.getElementById('cancelBuildBtn'),
  selectionPanel: document.getElementById('selectionPanel'), selectedName: document.getElementById('selectedName'), selectedStats: document.getElementById('selectedStats'), upgradeDiff: document.getElementById('upgradeDiff'),
  upgradeBtn: document.getElementById('upgradeBtn'), sellBtn: document.getElementById('sellBtn'),
  mainMenu: document.getElementById('mainMenu'), pauseMenu: document.getElementById('pauseMenu'), pauseBtn: document.getElementById('pauseBtn'), resumeBtn: document.getElementById('resumeBtn'), menuBtn: document.getElementById('menuBtn'),
  playCampaign: document.getElementById('playCampaign'), playEndless: document.getElementById('playEndless'), playChallenge: document.getElementById('playChallenge'),
  metaTree: document.getElementById('metaTree'), audioToggle: document.getElementById('audioToggle'), shakeToggle: document.getElementById('shakeToggle'), perfToggle: document.getElementById('perfToggle'),
  updateBtn: document.getElementById('updateBtn')
};

const modeRules = {
  campaign: { scale: 1, mod: 'Standard operation' },
  endless: { scale: 1.16, mod: 'Scaling armor every wave' },
  challenge: { scale: 1.34, mod: 'Fog + aggressive enemies' }
};

const towerDefs = {
  cannon: { icon: '💥', name: 'Cannon', cost: 65, damage: 18, range: 5.2, rate: 0.85, color: 0x74b9ff, projectile: 'shell', aoe: 1.9 },
  laser: { icon: '🔷', name: 'Laser', cost: 85, damage: 9, range: 6.4, rate: 0.25, color: 0x6fffe9, projectile: 'bolt' },
  missile: { icon: '🚀', name: 'Missile', cost: 120, damage: 28, range: 7.1, rate: 1.2, color: 0xffd166, projectile: 'missile', aoe: 2.6 },
  cryo: { icon: '❄️', name: 'Cryo', cost: 90, damage: 6, range: 5.8, rate: 0.55, color: 0x9bf6ff, projectile: 'ice', slow: 0.45 }
};

const abilities = {
  freeze: { name: 'Freeze', icon: '🧊', cd: 22, text: 'Stop enemies 2.5s', use: () => state.enemies.forEach(e => e.freeze = Math.max(e.freeze, 2.5)) },
  nuke: { name: 'Nuke', icon: '☢️', cd: 35, text: 'Huge AoE blast', use: () => triggerNuke() },
  overclock: { name: 'Overclock', icon: '⚡', cd: 26, text: '+40% fire rate 7s', use: () => state.buffs.overclock = 7 },
  repair: { name: 'Repair', icon: '🛠️', cd: 28, text: '+3 lives', use: () => state.lives = Math.min(30, state.lives + 3) }
};

const metaDefs = [
  { key: 'branchCrit', label: 'Crit branch', max: 1 }, { key: 'branchChain', label: 'Chain branch', max: 1 },
  { key: 'dot', label: 'DoT stacks', max: 3 }, { key: 'econ', label: 'Start cash+', max: 3 }
];

const state = {
  money: 220, lives: 20, mode: 'campaign', wave: 0, inWave: false, spawnTimer: 0, remainingInWave: 0,
  towers: [], enemies: [], projectiles: [], effects: [],
  selectedTowerType: null, selectedTower: null, buildMode: false, hoverCell: null,
  abilityCooldowns: { freeze: 0, nuke: 0, overclock: 0, repair: 0 }, buffs: { overclock: 0 },
  paused: false, gameStarted: false, shake: 0,
  meta: JSON.parse(localStorage.getItem('aegis-meta') || '{"research":5}'),
  pools: { enemies: [], projectiles: [], effects: [] }
};

const board = { w: 12, h: 14, tile: 1.3, blocked: new Set(), path: [] };
for (let z = 0; z < board.h; z++) board.path.push([5 + (z > 6 ? 1 : 0), z]);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07101c);
scene.fog = new THREE.Fog(0x07101c, 12, 38);
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 120);
const cam = { yaw: 0.7, pitch: 0.92, dist: 16, target: new THREE.Vector3(0, 0, 8), velYaw: 0, velPitch: 0, velDist: 0, panVel: new THREE.Vector2() };

scene.add(new THREE.HemisphereLight(0x9ac9ff, 0x12161d, 0.45));
const dir = new THREE.DirectionalLight(0xffffff, 1.05);
dir.position.set(6, 14, 10);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
dir.shadow.camera.left = -15; dir.shadow.camera.right = 15; dir.shadow.camera.top = 15; dir.shadow.camera.bottom = -15;
scene.add(dir);

const terrain = new THREE.Mesh(new THREE.PlaneGeometry(board.w * board.tile, board.h * board.tile), new THREE.MeshStandardMaterial({ color: 0x17263a, roughness: 0.9 }));
terrain.rotation.x = -Math.PI / 2;
terrain.receiveShadow = true;
terrain.position.set(0, 0, board.h * board.tile * 0.5 - board.tile * 0.5);
scene.add(terrain);

const pathMat = new THREE.MeshStandardMaterial({ color: 0x3b415f, emissive: 0x262f54, emissiveIntensity: 0.7 });
for (const [x, z] of board.path) {
  const t = new THREE.Mesh(new THREE.BoxGeometry(board.tile * 0.88, 0.12, board.tile * 0.88), pathMat);
  t.position.copy(cellToWorld(x, z)).setY(0.06); t.receiveShadow = true; scene.add(t);
}
createMarker(board.path[0], 0x36f9a8);
createMarker(board.path[board.path.length - 1], 0xff6b6b);

const ghost = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.1, 10), new THREE.MeshStandardMaterial({ color: 0x57ffa3, transparent: true, opacity: 0.45 }));
ghost.visible = false; ghost.position.y = 0.58; scene.add(ghost);
const rangeRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.03, 48), new THREE.MeshBasicMaterial({ color: 0x57ffa3, side: THREE.DoubleSide, transparent: true, opacity: .7 }));
rangeRing.rotation.x = -Math.PI / 2; rangeRing.visible = false; rangeRing.position.y = 0.04; scene.add(rangeRing);
const hoverTile = new THREE.Mesh(new THREE.PlaneGeometry(board.tile * .9, board.tile * .9), new THREE.MeshBasicMaterial({ color: 0x57ffa3, side: THREE.DoubleSide, transparent: true, opacity: 0.35 }));
hoverTile.rotation.x = -Math.PI / 2; hoverTile.visible = false; hoverTile.position.y = 0.03; scene.add(hoverTile);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const worldUp = new THREE.Vector3(0, 1, 0);
let last = performance.now();

function createMarker([x, z], color) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.3, 16), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 }));
  m.position.copy(cellToWorld(x, z)).setY(0.2); m.castShadow = true; scene.add(m);
}

function cellToWorld(x, z) {
  return new THREE.Vector3((x - board.w / 2 + 0.5) * board.tile, 0, z * board.tile);
}
function worldToCell(v) {
  return [Math.floor(v.x / board.tile + board.w / 2), Math.floor(v.z / board.tile + 0.5)];
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function showToast(text, ok = true) {
  toastEl.textContent = text; toastEl.style.background = ok ? '#154926' : '#51242b';
  toastEl.classList.add('show'); clearTimeout(showToast.t); showToast.t = setTimeout(() => toastEl.classList.remove('show'), 1200);
}

function buildMeta() {
  ui.metaTree.innerHTML = '';
  metaDefs.forEach(m => {
    const b = document.createElement('button');
    const lvl = state.meta[m.key] || 0;
    b.textContent = `${m.label} (${lvl}/${m.max})`;
    b.disabled = lvl >= m.max || (state.meta.research || 0) < (lvl + 1);
    b.onclick = () => { state.meta[m.key] = lvl + 1; state.meta.research -= lvl + 1; saveMeta(); buildMeta(); };
    ui.metaTree.appendChild(b);
  });
}
function saveMeta() { localStorage.setItem('aegis-meta', JSON.stringify(state.meta)); }

function initDock() {
  ui.towerDock.innerHTML = '';
  Object.entries(towerDefs).forEach(([k, t]) => {
    const b = document.createElement('button'); b.className = 'dockBtn'; b.innerHTML = `${t.icon}<small>${t.name}<br>$${t.cost}</small>`;
    b.onclick = () => { state.selectedTowerType = k; state.buildMode = true; ui.buildPanel.classList.remove('hidden'); updateDock(); };
    b.id = `dock-${k}`;
    ui.towerDock.appendChild(b);
  });
  updateDock();
}
function updateDock() {
  Object.keys(towerDefs).forEach(k => document.getElementById(`dock-${k}`)?.classList.toggle('active', state.selectedTowerType === k && state.buildMode));
}

function initAbilities() {
  ui.abilityBar.innerHTML = '';
  Object.entries(abilities).forEach(([k, a]) => {
    const b = document.createElement('button'); b.className = 'abilityBtn'; b.id = `ability-${k}`;
    b.onclick = () => {
      if (state.abilityCooldowns[k] > 0) return;
      a.use(); state.abilityCooldowns[k] = a.cd; showToast(`${a.name} activated`);
    };
    ui.abilityBar.appendChild(b);
  });
}

function spawnWave() {
  state.wave += 1; state.inWave = true; state.remainingInWave = 8 + state.wave * 2; state.spawnTimer = 0;
  if (state.wave % 5 === 0) ui.bossWarning.classList.remove('hidden');
  refreshWavePreview();
}

function refreshWavePreview() {
  const txt = state.wave % 5 === 4 ? '👹 x1  🐜 x10  🛡️ x5' : '🐜 x8  🛡️ x4';
  ui.wavePreview.textContent = `Next Wave: ${txt}`;
}

function makeTower(type, cell) {
  const d = towerDefs[type];
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.45, .5, .7, 12), new THREE.MeshStandardMaterial({ color: d.color }));
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(.22, .16, .8), new THREE.MeshStandardMaterial({ color: 0xdce7f8 })); barrel.position.set(0, .4, .2);
  g.add(base, barrel); g.position.copy(cellToWorld(cell[0], cell[1])).setY(0.35); g.castShadow = true; scene.add(g);
  return { type, cell, level: 1, cooldown: 0, mesh: g, barrel, branch: (state.meta.branchCrit ? 'crit' : state.meta.branchChain ? 'chain' : 'none') };
}

function spawnEnemy(boss = false) {
  const mesh = state.pools.enemies.pop() || new THREE.Mesh(new THREE.SphereGeometry(boss ? .5 : .34, 12, 10), new THREE.MeshStandardMaterial({ color: boss ? 0xff4d6d : 0x8effbd }));
  mesh.visible = true; mesh.castShadow = true; scene.add(mesh);
  const start = cellToWorld(...board.path[0]);
  const hp = (boss ? 420 : 58 + state.wave * 6) * modeRules[state.mode].scale;
  return { mesh, t: 0, speed: (boss ? 0.62 : 1.04) + state.wave * 0.015, hp, maxHp: hp, freeze: 0, dot: 0, boss, shield: boss ? 80 : (state.wave > 3 ? 18 : 0) };
}

function getProjectile() {
  const p = state.pools.projectiles.pop() || { mesh: new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff3a5 })), alive: false };
  p.mesh.visible = true; p.mesh.frustumCulled = true; if (!p.mesh.parent) scene.add(p.mesh); return p;
}

function fireTower(tower, enemy) {
  const d = towerDefs[tower.type], p = getProjectile();
  p.alive = true; p.kind = d.projectile; p.damage = d.damage * tower.level; p.aoe = d.aoe || 0; p.slow = d.slow || 0;
  p.pos = tower.mesh.position.clone().add(new THREE.Vector3(0, .5, 0)); p.target = enemy; p.speed = d.projectile === 'missile' ? 9 : 14;
  p.mesh.position.copy(p.pos); p.mesh.material.color.setHex(d.color); state.projectiles.push(p);
  tower.barrel.position.z = -.1; tower.recoil = .1;
}

function applyHit(enemy, damage, slow = 0) {
  if (enemy.shield > 0) { enemy.shield -= damage; if (enemy.shield < 0) enemy.hp += enemy.shield; }
  else enemy.hp -= damage;
  enemy.freeze = Math.max(enemy.freeze, slow > 0 ? 0.6 : enemy.freeze);
  state.effects.push({ pos: enemy.mesh.position.clone(), life: .34, color: 0xffd6a5 });
  if (ui.shakeToggle.checked) state.shake = Math.min(0.22, state.shake + 0.035);
}

function triggerNuke() {
  const center = cellToWorld(Math.floor(board.w / 2), Math.floor(board.h / 2));
  state.effects.push({ pos: center.clone(), life: 0.85, color: 0xff6b6b, radius: 7.4 });
  state.enemies.forEach(e => { if (e.mesh.position.distanceTo(center) < 7.4) applyHit(e, 130); });
}

function placeTowerAt(cell) {
  const key = `${cell[0]},${cell[1]}`;
  if (board.blocked.has(key) || board.path.some(p => p[0] === cell[0] && p[1] === cell[1])) return false;
  const def = towerDefs[state.selectedTowerType];
  if (!def || state.money < def.cost) return false;
  state.money -= def.cost; board.blocked.add(key); state.towers.push(makeTower(state.selectedTowerType, cell));
  state.buildMode = false; ui.buildPanel.classList.add('hidden'); showToast(`${def.name} deployed`); return true;
}

function updateUI() {
  ui.money.textContent = Math.floor(state.money);
  ui.lives.textContent = state.lives;
  ui.wave.textContent = state.wave;
  ui.mode.textContent = state.mode[0].toUpperCase() + state.mode.slice(1);
  Object.entries(abilities).forEach(([k, a]) => {
    const cd = state.abilityCooldowns[k];
    const el = document.getElementById(`ability-${k}`);
    el.classList.toggle('disabled', cd > 0);
    el.innerHTML = `${a.icon}<small>${a.name}<br>${cd > 0 ? `${cd.toFixed(1)}s` : 'Ready'}</small>`;
  });
  if (state.selectedTower) {
    const d = towerDefs[state.selectedTower.type], lvl = state.selectedTower.level;
    const next = { damage: Math.round(d.damage * (lvl + 1)), range: (d.range + 0.45 * lvl).toFixed(1), rate: Math.max(0.12, d.rate - 0.07 * lvl).toFixed(2) };
    ui.selectionPanel.classList.remove('hidden');
    ui.selectedName.textContent = `${d.name} Lv.${lvl} [${state.selectedTower.branch}]`;
    ui.selectedStats.textContent = `DMG ${Math.round(d.damage * lvl)} | RNG ${(d.range + 0.45 * (lvl - 1)).toFixed(1)} | CD ${Math.max(0.12, d.rate - 0.07 * (lvl - 1)).toFixed(2)}`;
    ui.upgradeDiff.innerHTML = `<span class="deltaUp">+${next.damage - Math.round(d.damage * lvl)} damage</span> · <span class="deltaUp">+0.4 range</span> · <span class="deltaDown">-${(Math.max(0.12, d.rate - 0.07 * (lvl - 1)) - next.rate).toFixed(2)}s cooldown</span>`;
  } else ui.selectionPanel.classList.add('hidden');
}

function updateCamera(dt) {
  cam.yaw += cam.velYaw; cam.pitch = clamp(cam.pitch + cam.velPitch, 0.45, 1.23); cam.dist = clamp(cam.dist + cam.velDist, 8, 26);
  cam.target.x = clamp(cam.target.x + cam.panVel.x, -4, 4); cam.target.z = clamp(cam.target.z + cam.panVel.y, 3, 15);
  cam.velYaw *= 0.9; cam.velPitch *= 0.9; cam.velDist *= 0.84; cam.panVel.multiplyScalar(0.86);
  const p = new THREE.Vector3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch)).multiplyScalar(cam.dist).add(cam.target);
  camera.position.copy(p); camera.lookAt(cam.target);
  if (state.shake > 0) { camera.position.add(new THREE.Vector3((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake, 0)); state.shake *= 0.83; }
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (state.paused || !state.gameStarted) { renderer.render(scene, camera); return; }

  for (const k of Object.keys(state.abilityCooldowns)) state.abilityCooldowns[k] = Math.max(0, state.abilityCooldowns[k] - dt);
  state.buffs.overclock = Math.max(0, state.buffs.overclock - dt);

  if (!state.inWave && state.enemies.length === 0) spawnWave();
  if (state.inWave) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.remainingInWave > 0) {
      const boss = state.wave % 5 === 0 && state.remainingInWave === 1;
      state.enemies.push(spawnEnemy(boss)); state.remainingInWave--; state.spawnTimer = boss ? 1.2 : 0.52;
      if (state.remainingInWave === 0) { state.inWave = false; ui.bossWarning.classList.add('hidden'); }
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (e.hp <= 0) {
      state.money += e.boss ? 60 : 12; state.meta.research = (state.meta.research || 0) + (e.boss ? 2 : 0);
      e.mesh.visible = false; scene.remove(e.mesh); state.pools.enemies.push(e.mesh);
      state.enemies.splice(i, 1); continue;
    }
    const speed = e.freeze > 0 ? 0 : e.speed * (state.mode === 'challenge' ? 1.2 : 1);
    e.freeze = Math.max(0, e.freeze - dt);
    e.t += dt * speed / (board.path.length * 0.68);
    const idx = Math.floor(e.t * (board.path.length - 1));
    if (idx >= board.path.length - 1) {
      state.lives -= e.boss ? 4 : 1; state.enemies.splice(i, 1); scene.remove(e.mesh); state.pools.enemies.push(e.mesh);
      if (state.lives <= 0) { state.paused = true; ui.mainMenu.classList.remove('hidden'); showToast('Defeat. Restarting...', false); }
      continue;
    }
    const f = e.t * (board.path.length - 1) - idx;
    const a = cellToWorld(...board.path[idx]), b = cellToWorld(...board.path[idx + 1]);
    e.mesh.position.lerpVectors(a, b, f).setY(e.boss ? 0.56 : 0.34);
    e.mesh.material.emissive = new THREE.Color(e.freeze > 0 ? 0x8edbff : (e.shield > 0 ? 0x7f8cff : 0x14222f));
  }

  for (const t of state.towers) {
    t.cooldown -= dt;
    t.recoil = Math.max(0, (t.recoil || 0) - dt * 1.6); t.barrel.position.z = 0.2 - t.recoil;
    const range = towerDefs[t.type].range + (t.level - 1) * 0.45;
    const target = state.enemies.find(e => e.mesh.position.distanceTo(t.mesh.position) < range);
    const mult = state.buffs.overclock > 0 ? 0.62 : 1;
    if (target && t.cooldown <= 0) {
      fireTower(t, target);
      t.cooldown = Math.max(0.12, (towerDefs[t.type].rate - (t.level - 1) * 0.07) * mult);
    }
  }

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    if (!p.target || !p.target.mesh.parent) { releaseProjectile(i); continue; }
    const dir = p.target.mesh.position.clone().sub(p.pos);
    const step = Math.min(dir.length(), p.speed * dt);
    p.pos.add(dir.normalize().multiplyScalar(step));
    p.mesh.position.copy(p.pos);
    if (step < 0.2) {
      if (p.aoe) state.enemies.forEach(e => { if (e.mesh.position.distanceTo(p.pos) < p.aoe) applyHit(e, p.damage, p.slow); });
      else applyHit(p.target, p.damage, p.slow);
      releaseProjectile(i);
    }
  }

  for (let i = state.effects.length - 1; i >= 0; i--) {
    const fx = state.effects[i]; fx.life -= dt;
    if (!fx.mesh) {
      fx.mesh = state.pools.effects.pop() || new THREE.Mesh(new THREE.RingGeometry(.2, .25, 24), new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide }));
      fx.mesh.rotation.x = -Math.PI / 2; scene.add(fx.mesh);
    }
    fx.mesh.visible = true; fx.mesh.position.copy(fx.pos).setY(0.05); fx.mesh.scale.setScalar((1 - fx.life) * (fx.radius || 2.2));
    fx.mesh.material.opacity = Math.max(0, fx.life * 2); fx.mesh.material.color.setHex(fx.color || 0xffd6a5);
    if (fx.life <= 0) { fx.mesh.visible = false; state.pools.effects.push(fx.mesh); state.effects.splice(i, 1); }
  }

  updateCamera(dt);
  updateUI();
  renderer.render(scene, camera);
}

function releaseProjectile(i) {
  const p = state.projectiles[i]; p.mesh.visible = false; state.pools.projectiles.push(p); state.projectiles.splice(i, 1);
}

function pickCell(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(terrain);
  if (!hits.length) return null;
  return worldToCell(hits[0].point);
}

let touches = new Map();
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId); touches.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
  if (touches.size === 1) {
    const cell = pickCell(e.clientX, e.clientY); if (!cell) return;
    const world = cellToWorld(cell[0], cell[1]);
    state.hoverCell = cell; hoverTile.visible = true; hoverTile.position.copy(world).setY(0.04);
    if (state.buildMode && state.selectedTowerType) {
      const valid = !board.blocked.has(`${cell[0]},${cell[1]}`) && !board.path.some(p => p[0] === cell[0] && p[1] === cell[1]);
      ghost.visible = true; ghost.position.copy(world).setY(0.58); rangeRing.visible = true; rangeRing.position.copy(world).setY(0.05);
      rangeRing.scale.setScalar(towerDefs[state.selectedTowerType].range); hoverTile.material.color.setHex(valid ? 0x57ffa3 : 0xff6b7f); ghost.material.color.setHex(valid ? 0x57ffa3 : 0xff6b7f);
    }
  }
  if (touches.size === 2) {
    const [a, b] = [...touches.values()];
    touches.gesture = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }
});

canvas.addEventListener('pointermove', e => {
  if (!touches.has(e.pointerId)) return;
  const prev = touches.get(e.pointerId); touches.set(e.pointerId, { ...prev, x: e.clientX, y: e.clientY });
  if (touches.size === 1) {
    cam.velYaw += -(e.movementX) * 0.0018; cam.velPitch += e.movementY * 0.0014;
    const cell = pickCell(e.clientX, e.clientY); if (!cell) return;
    const world = cellToWorld(cell[0], cell[1]); state.hoverCell = cell; hoverTile.visible = true; hoverTile.position.copy(world).setY(0.04);
    if (state.buildMode && state.selectedTowerType) {
      const valid = !board.blocked.has(`${cell[0]},${cell[1]}`) && !board.path.some(p => p[0] === cell[0] && p[1] === cell[1]);
      ghost.visible = true; ghost.position.copy(world).setY(0.58); rangeRing.visible = true; rangeRing.position.copy(world).setY(0.05);
      rangeRing.scale.setScalar(towerDefs[state.selectedTowerType].range); hoverTile.material.color.setHex(valid ? 0x57ffa3 : 0xff6b7f); ghost.material.color.setHex(valid ? 0x57ffa3 : 0xff6b7f);
    }
  } else if (touches.size === 2) {
    const vals = [...touches.values()].filter(v => v && v.x !== undefined);
    const [a, b] = vals;
    const g = touches.gesture;
    const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    cam.velDist += (g.d - d) * 0.004;
    cam.panVel.x += -(cx - g.cx) * 0.004; cam.panVel.y += (cy - g.cy) * 0.004;
    touches.gesture = { d, cx, cy };
  }
});

canvas.addEventListener('pointerup', e => {
  const was = touches.get(e.pointerId); touches.delete(e.pointerId);
  if (touches.size < 2) delete touches.gesture;
  const dt = performance.now() - (was?.t || 0);
  if (dt < 260) {
    const cell = pickCell(e.clientX, e.clientY); if (!cell) return;
    if (state.buildMode && state.selectedTowerType) {
      placeTowerAt(cell);
    } else {
      state.selectedTower = state.towers.find(t => t.cell[0] === cell[0] && t.cell[1] === cell[1]) || null;
    }
  }
});

canvas.addEventListener('dblclick', () => { cam.target.set(0, 0, 8); cam.yaw = 0.7; cam.pitch = 0.92; cam.dist = 16; });

ui.cancelBuildBtn.onclick = () => { state.buildMode = false; ghost.visible = false; rangeRing.visible = false; ui.buildPanel.classList.add('hidden'); updateDock(); };
ui.upgradeBtn.onclick = () => {
  const t = state.selectedTower; if (!t || t.level >= 4) return;
  const cost = 45 * t.level; if (state.money < cost) return showToast('Need more credits', false);
  state.money -= cost; t.level += 1; showToast('Upgraded');
};
ui.sellBtn.onclick = () => {
  const t = state.selectedTower; if (!t) return;
  state.money += Math.round(towerDefs[t.type].cost * 0.65); board.blocked.delete(`${t.cell[0]},${t.cell[1]}`);
  scene.remove(t.mesh); state.towers = state.towers.filter(x => x !== t); state.selectedTower = null;
};
ui.pauseBtn.onclick = () => { state.paused = true; ui.pauseMenu.classList.remove('hidden'); };
ui.resumeBtn.onclick = () => { state.paused = false; ui.pauseMenu.classList.add('hidden'); };
ui.menuBtn.onclick = () => { state.paused = true; state.gameStarted = false; ui.pauseMenu.classList.add('hidden'); ui.mainMenu.classList.remove('hidden'); };

function start(mode) {
  state.mode = mode; state.money = 220 + (state.meta.econ || 0) * 45; state.lives = 20; state.wave = 0; state.inWave = false;
  state.towers.forEach(t => scene.remove(t.mesh)); state.enemies.forEach(e => scene.remove(e.mesh));
  state.towers = []; state.enemies = []; state.projectiles = []; board.blocked.clear();
  state.paused = false; state.gameStarted = true; ui.mainMenu.classList.add('hidden'); refreshWavePreview();
}
ui.playCampaign.onclick = () => start('campaign');
ui.playEndless.onclick = () => start('endless');
ui.playChallenge.onclick = () => start('challenge');

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
});

document.addEventListener('visibilitychange', () => { if (document.hidden) state.paused = true; });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) ui.updateBtn.classList.remove('hidden');
      });
    });
  });
  ui.updateBtn.onclick = () => window.location.reload();
}

buildMeta(); initDock(); initAbilities(); refreshWavePreview();
showToast('Use 1 finger rotate, 2 fingers pan/zoom');
requestAnimationFrame(animate);
