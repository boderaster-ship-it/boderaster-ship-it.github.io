import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

const canvas = document.getElementById('gameCanvas');
const toastEl = document.getElementById('toast');

const ui = {
  money: document.getElementById('money'),
  lives: document.getElementById('lives'),
  wave: document.getElementById('wave'),
  phaseBadge: document.getElementById('phaseBadge'),
  startWaveBtn: document.getElementById('startWaveBtn'),
  towerDock: document.getElementById('towerDock'),
  abilityBar: document.getElementById('abilityBar'),
  wavePreview: document.getElementById('wavePreview'),
  bossWarning: document.getElementById('bossWarning'),
  buildPanel: document.getElementById('buildPanel'),
  buildTitle: document.getElementById('buildTitle'),
  cancelBuildBtn: document.getElementById('cancelBuildBtn'),
  selectionPanel: document.getElementById('selectionPanel'),
  selectedName: document.getElementById('selectedName'),
  selectedStats: document.getElementById('selectedStats'),
  upgradeDiff: document.getElementById('upgradeDiff'),
  upgradeBtn: document.getElementById('upgradeBtn'),
  sellBtn: document.getElementById('sellBtn'),
  mainMenu: document.getElementById('mainMenu'),
  pauseMenu: document.getElementById('pauseMenu'),
  pauseBtn: document.getElementById('pauseBtn'),
  resumeBtn: document.getElementById('resumeBtn'),
  menuBtn: document.getElementById('menuBtn'),
  playCampaign: document.getElementById('playCampaign'),
  playEndless: document.getElementById('playEndless'),
  playChallenge: document.getElementById('playChallenge'),
  metaTree: document.getElementById('metaTree'),
  audioToggle: document.getElementById('audioToggle'),
  shakeToggle: document.getElementById('shakeToggle'),
  perfToggle: document.getElementById('perfToggle'),
  updateBtn: document.getElementById('updateBtn'),
  overviewBtn: document.getElementById('overviewBtn'),
  speedBtn: document.getElementById('speedBtn'),
  speedLabel: document.getElementById('speedLabel'),
  nextWaveTimer: document.getElementById('nextWaveTimer'),
  campaignLevelSelect: document.getElementById('campaignLevelSelect'),
  unlockList: document.getElementById('unlockList'),
  upgradePointsLabel: document.getElementById('upgradePointsLabel'),
  levelCompleteModal: document.getElementById('levelCompleteModal'),
  levelCompleteSummary: document.getElementById('levelCompleteSummary'),
  levelRewards: document.getElementById('levelRewards'),
  continueBtn: document.getElementById('continueBtn')
};

const modeRules = {
  campaign: { scale: 1, mod: 'Standard operation' },
  endless: { scale: 1.16, mod: 'Scaling armor every wave' },
  challenge: { scale: 1.34, mod: 'Aggressive hostiles' }
};

const towerDefs = {
  cannon: { icon: '💥', name: 'Bastion', cost: 65, damage: 18, range: 5.2, rate: 0.85, color: 0x74b9ff, projectile: 'shell', aoe: 1.9 },
  laser: { icon: '🔷', name: 'Arc Prism', cost: 85, damage: 9, range: 6.4, rate: 0.25, color: 0x6fffe9, projectile: 'bolt' },
  missile: { icon: '🚀', name: 'Skyhammer', cost: 120, damage: 28, range: 7.1, rate: 1.2, color: 0xffd166, projectile: 'missile', aoe: 2.6 },
  cryo: { icon: '❄️', name: 'Frost Coil', cost: 90, damage: 6, range: 5.8, rate: 0.55, color: 0x9bf6ff, projectile: 'ice', slow: 0.45 },
  flame: { icon: '🔥', name: 'Pyre', cost: 105, damage: 4, range: 4.4, rate: 0.12, color: 0xff8c42, projectile: 'flame', burn: 1.4 }
};

const enemyArchetypes = {
  runner: { color: 0x8effbd, speed: 1.2, hp: 50, size: 0.28 },
  tank: { color: 0xffc857, speed: 0.82, hp: 130, size: 0.42 },
  shielded: { color: 0x9d7cff, speed: 0.95, hp: 90, size: 0.34, shield: 60 },
  flyer: { color: 0x85d9ff, speed: 1.35, hp: 65, size: 0.24, flying: true }
};

const abilities = {
  freeze: { name: 'Freeze', icon: '🧊', cd: 22, text: 'Stop enemies 2.5s', use: () => state.enemies.forEach(e => e.freeze = Math.max(e.freeze, 2.5)) },
  nuke: { name: 'Nuke', icon: '☢️', cd: 35, text: 'Huge AoE blast', use: () => triggerNuke() },
  overclock: { name: 'Overclock', icon: '⚡', cd: 26, text: '+40% fire rate 7s', use: () => state.buffs.overclock = 7 },
  repair: { name: 'Repair', icon: '🛠️', cd: 28, text: '+3 lives', use: () => state.lives = Math.min(30, state.lives + 3) }
};

const metaDefs = [
  { key: 'branchCrit', name: 'Precision Core', affects: 'Bastion critical chance', desc: 'Adds critical strikes for Bastion towers.', max: 1, unit: '%' },
  { key: 'branchChain', name: 'Relay Core', affects: 'Arc Prism chaining', desc: 'Arc Prism bolts can chain to extra targets.', max: 1, unit: 'targets' },
  { key: 'dot', name: 'Burning Payloads', affects: 'Damage-over-time strength', desc: 'Projectiles apply stronger burn after impact.', max: 3, unit: 'stacks' },
  { key: 'econ', name: 'Supply Cache', affects: 'Starting credits', desc: 'Begin each level with extra credits.', max: 3, unit: 'credits' }
];

const pathCells = [
  [1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3],
  [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3], [14, 4], [14, 5], [13, 5], [12, 5],
  [11, 5], [10, 5], [9, 5], [8, 5], [7, 5], [6, 5], [5, 5], [4, 5], [3, 5], [2, 5], [1, 5],
  [1, 6], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7],
  [11, 7], [12, 7], [13, 7], [14, 7], [14, 8], [14, 9], [13, 9], [12, 9], [11, 9], [10, 9],
  [9, 9], [8, 9], [7, 9], [6, 9], [5, 9], [4, 9], [3, 9], [2, 9], [1, 9], [1, 10], [1, 11],
  [2, 11], [3, 11], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11], [10, 11], [11, 11], [12, 11], [13, 11], [14, 11], [14, 12], [14, 13], [14, 14], [13, 14], [12, 14], [11, 14]
];

const state = {
  money: 220,
  lives: 20,
  mode: 'campaign',
  wave: 0,
  inWave: false,
  buildPhase: true,
  spawnTimer: 0,
  remainingInWave: 0,
  towers: [],
  enemies: [],
  projectiles: [],
  effects: [],
  selectedTowerType: null,
  selectedTower: null,
  buildMode: false,
  hoverCell: null,
  abilityCooldowns: { freeze: 0, nuke: 0, overclock: 0, repair: 0 },
  buffs: { overclock: 0 },
  paused: false,
  gameSpeed: 1,
  betweenWaveCountdown: 0,
  gameStarted: false,
  shake: 0,
  meta: JSON.parse(localStorage.getItem('aegis-meta') || '{"upgradePoints":5,"unlockedTowers":["cannon","laser"]}'),
  pools: { enemies: [], projectiles: [], effects: [] },
  campaign: JSON.parse(localStorage.getItem('aegis-campaign') || '{"selectedLevel":1,"completed":{},"unlockedLevel":1}'),
  currentLevel: 1,
  levelWaves: 10,
  pendingLevelRewards: null
};

state.meta.unlockedTowers = state.meta.unlockedTowers || ['cannon', 'laser'];
state.meta.unlockedAbilities = state.meta.unlockedAbilities || ['freeze'];
state.campaign = state.campaign || {};
state.campaign.completed = state.campaign.completed || {};
state.campaign.unlockedLevel = state.campaign.unlockedLevel || 1;
state.campaign.selectedLevel = state.campaign.selectedLevel || 1;
syncProgressUnlocks();

const board = { w: 16, h: 16, tile: 1.12, blocked: new Set(), path: pathCells };
const pathCellSet = new Set(board.path.map(([x, z]) => `${x},${z}`));

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd5ff);
scene.fog = new THREE.Fog(0xbfdff4, 45, 130);
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 220);
const cam = { yaw: 0.6, pitch: 0.98, dist: 24, target: new THREE.Vector3(0, 0, 8.2), velYaw: 0, velPitch: 0, velDist: 0, panVel: new THREE.Vector2(), transitioning: null };

scene.add(new THREE.HemisphereLight(0xd9efff, 0x6f9269, 1.05));
const dir = new THREE.DirectionalLight(0xfff5dd, 1.6);
dir.position.set(9, 18, 9);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
dir.shadow.camera.left = -22;
dir.shadow.camera.right = 22;
dir.shadow.camera.top = 22;
dir.shadow.camera.bottom = -22;
dir.shadow.radius = 4;
scene.add(dir);

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(190, 32, 24),
  new THREE.MeshBasicMaterial({ color: 0xc8e7ff, side: THREE.BackSide })
);
scene.add(sky);

const world = new THREE.Group();
scene.add(world);

const terrain = buildTerrain();
world.add(terrain);
buildPath();
buildEnvironmentProps();
createMarker(board.path[0], 0x4ef5ad);
createMarker(board.path[board.path.length - 1], 0xff7d8d);

const ghost = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.25, 10), new THREE.MeshStandardMaterial({ color: 0x57ffa3, transparent: true, opacity: 0.45 }));
ghost.visible = false;
const hoverTile = new THREE.Mesh(new THREE.BoxGeometry(board.tile * 0.96, 0.05, board.tile * 0.96), new THREE.MeshStandardMaterial({ color: 0x57ffa3, transparent: true, opacity: 0.45 }));
hoverTile.visible = false;
const rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.03, 48), new THREE.MeshBasicMaterial({ color: 0x57ffa3, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
rangeRing.rotation.x = -Math.PI / 2;
rangeRing.visible = false;
world.add(ghost, hoverTile, rangeRing);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let last = performance.now();

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function cellToWorld(x, z) {
  return new THREE.Vector3((x - board.w / 2) * board.tile + board.tile * 0.5, getHeight(x, z), z * board.tile);
}

function worldToCell(pos) {
  const x = Math.floor((pos.x + board.w * board.tile * 0.5) / board.tile);
  const z = Math.floor(pos.z / board.tile);
  if (x < 0 || z < 0 || x >= board.w || z >= board.h) return null;
  return [x, z];
}

function getHeight(x, z) {
  const n = Math.sin(x * 0.61) * 0.2 + Math.cos(z * 0.54) * 0.2 + Math.sin((x + z) * 0.33) * 0.3;
  return n * 0.42;
}

function buildTerrain() {
  const extra = 14;
  const terrainW = (board.w + extra * 2) * board.tile;
  const terrainH = (board.h + extra * 2) * board.tile;
  const segW = board.w + extra * 2;
  const segH = board.h + extra * 2;
  const geometry = new THREE.PlaneGeometry(terrainW, terrainH, segW, segH);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i) / board.tile + board.w / 2 + extra;
    const vz = pos.getY(i) / board.tile + extra;
    pos.setZ(i, getHeight(vx, vz));
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x314f3a, roughness: 0.96, metalness: 0.02 }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  mesh.position.set(0, -0.03, board.h * board.tile * 0.5 - board.tile * 0.5);
  return mesh;
}

function buildPath() {
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x6a5643, roughness: 0.92, metalness: 0.02 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x9f8a6f, roughness: 0.8 });
  for (const [x, z] of board.path) {
    const center = cellToWorld(x, z);
    const pathTile = new THREE.Mesh(new THREE.BoxGeometry(board.tile * 0.93, 0.07, board.tile * 0.86), roadMat);
    pathTile.position.copy(center).setY(center.y + 0.07);
    pathTile.receiveShadow = true;
    world.add(pathTile);

    const leftEdge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, board.tile * 0.82), edgeMat);
    const rightEdge = leftEdge.clone();
    leftEdge.position.copy(center).add(new THREE.Vector3(-board.tile * 0.45, 0.11, 0));
    rightEdge.position.copy(center).add(new THREE.Vector3(board.tile * 0.45, 0.11, 0));
    leftEdge.receiveShadow = rightEdge.receiveShadow = true;
    world.add(leftEdge, rightEdge);
  }
}

function buildEnvironmentProps() {
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x70787a, roughness: 0.86 });
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4f3b2f, roughness: 0.96 });
  const treeLeafMat = new THREE.MeshStandardMaterial({ color: 0x3a6543, roughness: 0.9 });
  for (let z = 0; z < board.h; z++) {
    for (let x = 0; x < board.w; x++) {
      if (pathCellSet.has(`${x},${z}`)) continue;
      const worldPos = cellToWorld(x, z);
      const seed = Math.abs(Math.sin(x * 12.99 + z * 78.23));
      if (seed > 0.82) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26 + seed * 0.28, 0), rockMat);
        rock.position.copy(worldPos).add(new THREE.Vector3(0, 0.2, 0));
        rock.castShadow = rock.receiveShadow = true;
        world.add(rock);
      } else if (seed < 0.22) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.45, 8), treeTrunkMat);
        const crown = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 8), treeLeafMat);
        trunk.position.copy(worldPos).add(new THREE.Vector3(0, 0.25, 0));
        crown.position.copy(worldPos).add(new THREE.Vector3(0, 0.75, 0));
        trunk.castShadow = crown.castShadow = true;
        world.add(trunk, crown);
      }
    }
  }
}

function createMarker(cell, color) {
  const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 16), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 }));
  const p = cellToWorld(cell[0], cell[1]);
  marker.position.copy(p).setY(p.y + 0.25);
  world.add(marker);
}

function showToast(text, good = true) {
  toastEl.textContent = text;
  toastEl.style.background = good ? '#154926' : '#5a1f2f';
  toastEl.style.borderColor = good ? '#6ccf96' : '#ff7b9a';
  toastEl.classList.add('show');
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => toastEl.classList.remove('show'), 1600);
}



const campaignDefs = Array.from({ length: 6 }, (_, i) => ({
  level: i + 1,
  waves: 10,
  rewardCredits: 140 + i * 35,
  rewardTokens: 2 + (i > 1 ? 1 : 0),
  unlockTower: i === 1 ? 'missile' : i === 3 ? 'cryo' : i === 5 ? 'flame' : null
}));

function saveMeta() { localStorage.setItem('aegis-meta', JSON.stringify(state.meta)); }
function saveCampaign() { localStorage.setItem('aegis-campaign', JSON.stringify(state.campaign)); }

function getTowerUnlockLevel(key) {
  return key === 'missile' ? 2 : key === 'cryo' ? 4 : key === 'flame' ? 6 : 1;
}

function getAbilityUnlockLevel(key) {
  return key === 'freeze' ? 1 : key === 'overclock' ? 2 : key === 'repair' ? 3 : 5;
}

function isAbilityUnlocked(key) {
  return (state.meta.unlockedAbilities || ['freeze']).includes(key);
}

function unlockAbility(key) {
  state.meta.unlockedAbilities = state.meta.unlockedAbilities || ['freeze'];
  if (!state.meta.unlockedAbilities.includes(key)) state.meta.unlockedAbilities.push(key);
}

function syncProgressUnlocks() {
  Object.keys(towerDefs).forEach(k => {
    if ((state.campaign.unlockedLevel || 1) >= getTowerUnlockLevel(k)) unlockTower(k);
  });
  Object.keys(abilities).forEach(k => {
    if ((state.campaign.unlockedLevel || 1) >= getAbilityUnlockLevel(k)) unlockAbility(k);
  });
}

function isTowerUnlocked(key) {
  return (state.meta.unlockedTowers || []).includes(key);
}

function unlockTower(key) {
  state.meta.unlockedTowers = state.meta.unlockedTowers || ['cannon', 'laser'];
  if (!state.meta.unlockedTowers.includes(key)) state.meta.unlockedTowers.push(key);
}

function tweenCamera(target, ms = 700) {
  cam.transitioning = {
    start: performance.now(), dur: ms,
    from: { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, tx: cam.target.x, tz: cam.target.z },
    to: target
  };
}

function unifiedOverview(animated = true) {
  const target = { yaw: 0.58, pitch: 1.27, dist: 39, tx: 0, tz: board.h * board.tile * 0.52 };
  if (animated) tweenCamera(target, 650);
  else { cam.yaw = target.yaw; cam.pitch = target.pitch; cam.dist = target.dist; cam.target.set(target.tx, 0, target.tz); }
}

function buildMeta() {
  if (!state.meta || typeof state.meta !== 'object') state.meta = { upgradePoints: 5, unlockedTowers: ['cannon', 'laser'], unlockedAbilities: ['freeze'] };
  state.meta.upgradePoints = state.meta.upgradePoints || 0;
  state.meta.unlockedTowers = state.meta.unlockedTowers || ['cannon', 'laser'];
  ui.upgradePointsLabel.textContent = `Upgrade Points: ${state.meta.upgradePoints}`;
  ui.metaTree.innerHTML = '';
  for (const m of metaDefs) {
    const lvl = state.meta[m.key] || 0;
    const cost = 2 + lvl;
    const reqText = m.key === 'branchChain' ? 'Unlock: Complete Level 2' : m.key === 'dot' ? 'Unlock: Complete Level 3' : 'Unlock: Complete Level 1';
    const valueCur = m.key === 'econ' ? `${lvl * 45} credits` : `${lvl} ${m.unit}`;
    const valueNextRaw = Math.min(m.max, lvl + 1);
    const valueNext = m.key === 'econ' ? `${valueNextRaw * 45} credits` : `${valueNextRaw} ${m.unit}`;
    const btn = document.createElement('button');
    btn.innerHTML = `<strong>${m.name}</strong><br><small>${m.affects}</small><br><small>${valueCur} → ${valueNext} · Cost ${cost}</small><br><small>${reqText}</small>`;
    btn.disabled = lvl >= m.max || state.meta.upgradePoints < cost;
    btn.onclick = () => {
      if ((state.meta.upgradePoints || 0) < cost || lvl >= m.max) return;
      state.meta.upgradePoints -= cost;
      state.meta[m.key] = (state.meta[m.key] || 0) + 1;
      saveMeta();
      buildMeta();
    };
    ui.metaTree.appendChild(btn);
  }
}

function buildCampaignMenu() {
  ui.campaignLevelSelect.innerHTML = '';
  campaignDefs.forEach(def => {
    const btn = document.createElement('button');
    const completed = !!state.campaign.completed[def.level];
    const unlocked = def.level <= state.campaign.unlockedLevel;
    btn.className = 'levelBtn';
    btn.disabled = !unlocked;
    btn.innerHTML = `Level ${def.level}<br><small>${completed ? 'Completed' : unlocked ? 'Unlocked' : `Locked · Complete Level ${def.level - 1}`}</small>`;
    btn.onclick = () => {
      state.campaign.selectedLevel = def.level;
      saveCampaign();
      if (unlocked) start('campaign');
    };
    if (state.campaign.selectedLevel === def.level) btn.classList.add('active');
    ui.campaignLevelSelect.appendChild(btn);
  });
  const towerRows = Object.keys(towerDefs).map(k => {
    const lv = getTowerUnlockLevel(k);
    return `<div>${towerDefs[k].icon} ${towerDefs[k].name} — ${isTowerUnlocked(k) ? 'Unlocked' : `Locked: Complete Level ${lv}`}</div>`;
  });
  const abilityRows = Object.keys(abilities).map(k => `<div>${abilities[k].icon} ${abilities[k].name} — ${isAbilityUnlocked(k) ? 'Unlocked' : `Locked: Complete Level ${getAbilityUnlockLevel(k)}`}</div>`);
  ui.unlockList.innerHTML = [...towerRows, ...abilityRows].join('');
}

function initDock() {
  ui.towerDock.innerHTML = '';
  Object.entries(towerDefs).forEach(([key, d]) => {
    if (!isTowerUnlocked(key)) return;
    const btn = document.createElement('button');
    btn.className = 'dockBtn';
    btn.innerHTML = `${d.icon}`;
    btn.title = `${d.name} · ${d.cost}¢`;
    btn.onclick = () => {
      state.selectedTowerType = key;
      state.buildMode = true;
      ui.buildPanel.classList.remove('hidden');
      ui.buildTitle.textContent = `${d.icon} ${d.name} (${d.cost}¢)`;
      updateDock();
    };
    btn.id = `dock-${key}`;
    ui.towerDock.appendChild(btn);
  });
}

function updateDock() {
  Object.keys(towerDefs).forEach(key => {
    const el = document.getElementById(`dock-${key}`);
    if (!el) return;
    el.classList.toggle('active', state.selectedTowerType === key && state.buildMode);
    el.classList.toggle('locked', state.money < towerDefs[key].cost || !isTowerUnlocked(key));
  });
}

function initAbilities() {
  ui.abilityBar.innerHTML = '';
  Object.entries(abilities).forEach(([k, a]) => {
    if (!isAbilityUnlocked(k)) return;
    const btn = document.createElement('button');
    btn.className = 'abilityBtn';
    btn.id = `ability-${k}`;
    btn.innerHTML = `${a.icon}`;
    btn.title = a.name;
    btn.onclick = () => {
      if (state.abilityCooldowns[k] > 0 || state.buildPhase || !state.inWave) return;
      a.use();
      state.abilityCooldowns[k] = a.cd;
    };
    ui.abilityBar.appendChild(btn);
  });
}

function refreshWavePreview() {
  const txt = state.wave % 5 === 4 ? '👹 Boss + mixed escorts' : 'Fast + tank + shield mix';
  const levelText = state.mode === 'campaign' ? ` · Level ${state.currentLevel} Wave ${Math.min(state.wave + 1, state.levelWaves)}/${state.levelWaves}` : '';
  ui.wavePreview.textContent = `Next Wave: ${txt} · ${modeRules[state.mode].mod}${levelText}`;
}

function spawnWave() {
  state.wave += 1;
  const count = 8 + Math.floor(state.wave * 1.6);
  state.remainingInWave = count;
  state.spawnTimer = 0.2;
  state.inWave = true;
  state.buildPhase = false;
  if (state.wave % 5 === 0) ui.bossWarning.classList.remove('hidden');
  syncProgressUnlocks();
  initDock();
  initAbilities();
  refreshWavePreview();
  unifiedOverview(false);
}

function beginBuildPhase() {
  state.buildPhase = true;
  state.inWave = false;
  ui.bossWarning.classList.add('hidden');
  if (state.mode === 'campaign' && state.wave >= state.levelWaves) { handleLevelComplete(); return; }
  state.betweenWaveCountdown = 5;
}



function handleLevelComplete() {
  const def = campaignDefs.find(x => x.level === state.currentLevel) || campaignDefs[0];
  const rewards = { credits: def.rewardCredits, tokens: def.rewardTokens, unlockTower: def.unlockTower };
  state.money += rewards.credits;
  state.meta.upgradePoints += rewards.tokens;
  if (rewards.unlockTower) unlockTower(rewards.unlockTower);
  Object.keys(abilities).forEach(k => { if (state.currentLevel >= getAbilityUnlockLevel(k)) unlockAbility(k); });
  state.campaign.completed[state.currentLevel] = true;
  state.campaign.unlockedLevel = Math.max(state.campaign.unlockedLevel || 1, state.currentLevel + 1);
  saveMeta();
  saveCampaign();
  ui.levelCompleteSummary.textContent = `Level ${state.currentLevel} cleared: ${state.levelWaves} / ${state.levelWaves} waves survived.`;
  ui.levelRewards.innerHTML = `<div>+${rewards.credits} credits</div><div>+${rewards.tokens} upgrade points</div>${rewards.unlockTower ? `<div>Unlocked tower: ${towerDefs[rewards.unlockTower].name}</div>` : ''}`;
  ui.levelCompleteModal.classList.remove('hidden');
  state.paused = true;
  buildCampaignMenu();
  buildMeta();
}

function makeTower(type, cell) {
  const d = towerDefs[type];
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 0.55, 14), new THREE.MeshStandardMaterial({ color: 0x3f4859, roughness: 0.5, metalness: 0.6 }));
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.42, 10), new THREE.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 0.35 }));
  core.position.y = 0.46;
  const barrelGeo = type === 'laser' ? new THREE.CylinderGeometry(0.08, 0.08, 0.9, 10) : type === 'missile' ? new THREE.ConeGeometry(0.13, 0.9, 10) : type === 'cryo' ? new THREE.BoxGeometry(0.12, 0.3, 0.82) : type === 'flame' ? new THREE.TorusGeometry(0.22, 0.06, 8, 16) : new THREE.BoxGeometry(0.16, 0.16, 0.9);
  const barrel = new THREE.Mesh(barrelGeo, new THREE.MeshStandardMaterial({ color: type === 'flame' ? 0xffbc74 : 0xdce7f8, roughness: 0.3, metalness: 0.7 }));
  barrel.position.set(0, 0.62, 0.22);
  g.add(base, core, barrel);
  const p = cellToWorld(cell[0], cell[1]);
  g.position.copy(p).setY(p.y + 0.3);
  g.castShadow = true;
  world.add(g);
  return { type, cell, level: 1, cooldown: 0, mesh: g, barrel, core, branch: state.meta.branchCrit ? 'crit' : state.meta.branchChain ? 'chain' : 'none' };
}

function spawnEnemy(boss = false) {
  const keys = Object.keys(enemyArchetypes);
  const archetype = boss ? 'tank' : keys[Math.floor(Math.random() * keys.length)];
  const def = enemyArchetypes[archetype];
  const geo = boss ? new THREE.CapsuleGeometry(0.5, 1.1, 6, 10) : def.flying ? new THREE.OctahedronGeometry(def.size * 1.25, 0) : new THREE.CapsuleGeometry(def.size, def.size * 0.8, 6, 8);
  const mat = new THREE.MeshStandardMaterial({ color: boss ? 0xff557f : def.color, emissive: boss ? 0x65172e : def.color, emissiveIntensity: boss ? 0.4 : 0.2 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  world.add(mesh);
  const hp = (boss ? 540 : def.hp + state.wave * 8) * modeRules[state.mode].scale;
  return { mesh, t: 0, speed: (boss ? 0.58 : def.speed) + state.wave * 0.01, hp, maxHp: hp, freeze: 0, archetype, boss, shield: boss ? 120 : (def.shield || 0), flying: !!def.flying, bob: Math.random() * 5 };
}

function getProjectile() {
  const p = state.pools.projectiles.pop() || { mesh: new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff3a5 })), alive: false };
  p.mesh.visible = true;
  if (!p.mesh.parent) world.add(p.mesh);
  return p;
}

function fireTower(tower, enemy) {
  const d = towerDefs[tower.type];
  const p = getProjectile();
  p.alive = true;
  p.kind = d.projectile;
  p.damage = d.damage * tower.level;
  p.aoe = d.aoe || 0;
  p.slow = d.slow || 0;
  p.pos = tower.mesh.position.clone().add(new THREE.Vector3(0, 0.6, 0));
  p.target = enemy;
  p.speed = d.projectile === 'missile' ? 8.5 : d.projectile === 'flame' ? 11 : 14;
  p.mesh.position.copy(p.pos);
  p.mesh.material.color.setHex(d.color);
  state.projectiles.push(p);
  tower.barrel.position.z = -0.08;
  tower.recoil = 0.11;
  state.effects.push({ pos: p.pos.clone(), life: 0.18, color: d.color, radius: 0.8 });
}

function applyHit(enemy, damage, slow = 0, burn = 0) {
  if (enemy.shield > 0) {
    enemy.shield -= damage;
    if (enemy.shield < 0) enemy.hp += enemy.shield;
  } else {
    enemy.hp -= damage;
  }
  enemy.freeze = Math.max(enemy.freeze, slow > 0 ? 0.6 : enemy.freeze);
  enemy.burn = Math.max(enemy.burn || 0, burn || 0);
  state.effects.push({ pos: enemy.mesh.position.clone(), life: 0.34, color: enemy.boss ? 0xff7d8d : 0xffd6a5 });
  if (ui.shakeToggle.checked) state.shake = Math.min(0.22, state.shake + 0.035);
}

function triggerNuke() {
  const center = cellToWorld(Math.floor(board.w / 2), Math.floor(board.h / 2));
  state.effects.push({ pos: center.clone(), life: 0.95, color: 0xff6b6b, radius: 8.2 });
  state.enemies.forEach(e => {
    if (e.mesh.position.distanceTo(center) < 8.2) applyHit(e, 130);
  });
}

function placeTowerAt(cell) {
  const key = `${cell[0]},${cell[1]}`;
  if (board.blocked.has(key) || pathCellSet.has(key)) return false;
  const def = towerDefs[state.selectedTowerType];
  if (!def || state.money < def.cost) return false;
  state.money -= def.cost;
  board.blocked.add(key);
  state.towers.push(makeTower(state.selectedTowerType, cell));
  state.buildMode = false;
  ui.buildPanel.classList.add('hidden');
  showToast(`${def.name} deployed`);
  return true;
}

function updateUI() {
  ui.money.textContent = Math.floor(state.money);
  ui.lives.textContent = state.lives;
  ui.wave.textContent = state.mode === 'campaign' ? `${state.wave}/${state.levelWaves}` : `${state.wave}`;
  ui.phaseBadge.textContent = state.buildPhase ? 'Build' : 'Wave';
  ui.phaseBadge.classList.toggle('build', state.buildPhase);
  ui.phaseBadge.classList.toggle('wave', !state.buildPhase);
  ui.startWaveBtn.disabled = !state.buildPhase;

  Object.entries(abilities).forEach(([k, a]) => {
    const el = document.getElementById(`ability-${k}`);
    if (!el) return;
    const cd = state.abilityCooldowns[k];
    el.classList.toggle('disabled', cd > 0 || state.buildPhase);
    el.textContent = cd > 0 ? `${Math.ceil(cd)}` : a.icon;
  });
  ui.speedLabel.textContent = `x${state.gameSpeed}`;
  ui.nextWaveTimer.classList.toggle('hidden', state.betweenWaveCountdown <= 0 || state.inWave);
  ui.nextWaveTimer.textContent = state.betweenWaveCountdown > 0 && !state.inWave ? `Next wave in ${Math.ceil(state.betweenWaveCountdown)}…` : '';

  if (state.selectedTower) {
    const d = towerDefs[state.selectedTower.type];
    const lvl = state.selectedTower.level;
    const next = { damage: Math.round(d.damage * (lvl + 1)), rate: Math.max(0.12, d.rate - 0.07 * lvl).toFixed(2) };
    ui.selectionPanel.classList.remove('hidden');
    ui.selectedName.textContent = `${d.name} Lv.${lvl} [${state.selectedTower.branch}]`;
    ui.selectedStats.textContent = `DMG ${Math.round(d.damage * lvl)} | RNG ${(d.range + 0.45 * (lvl - 1)).toFixed(1)} | CD ${Math.max(0.12, d.rate - 0.07 * (lvl - 1)).toFixed(2)}`;
    ui.upgradeDiff.innerHTML = `<span class="deltaUp">+${next.damage - Math.round(d.damage * lvl)} damage</span> · <span class="deltaUp">visual tier +</span> · <span class="deltaDown">-${(Math.max(0.12, d.rate - 0.07 * (lvl - 1)) - next.rate).toFixed(2)}s cooldown</span>`;
  } else {
    ui.selectionPanel.classList.add('hidden');
  }

  updateDock();
}

function updateCamera() {
  cam.yaw += cam.velYaw;
  cam.pitch = clamp(cam.pitch + cam.velPitch, 0.58, 1.34);
  cam.dist = clamp(cam.dist + cam.velDist, 9, 44);
  cam.target.x = clamp(cam.target.x + cam.panVel.x, -10, 10);
  cam.target.z = clamp(cam.target.z + cam.panVel.y, -2, board.h * board.tile + 5);
  cam.velYaw *= 0.9;
  cam.velPitch *= 0.9;
  cam.velDist *= 0.84;
  cam.panVel.multiplyScalar(0.86);

  if (cam.transitioning) {
    const tNow = performance.now();
    const k = Math.min(1, (tNow - cam.transitioning.start) / cam.transitioning.dur);
    const e = 1 - Math.pow(1 - k, 3);
    const tr = cam.transitioning;
    cam.yaw = tr.from.yaw + (tr.to.yaw - tr.from.yaw) * e;
    cam.pitch = tr.from.pitch + (tr.to.pitch - tr.from.pitch) * e;
    cam.dist = tr.from.dist + (tr.to.dist - tr.from.dist) * e;
    cam.target.x = tr.from.tx + (tr.to.tx - tr.from.tx) * e;
    cam.target.z = tr.from.tz + (tr.to.tz - tr.from.tz) * e;
    if (k >= 1) cam.transitioning = null;
  }

  const p = new THREE.Vector3(
    Math.sin(cam.yaw) * Math.cos(cam.pitch),
    Math.sin(cam.pitch),
    Math.cos(cam.yaw) * Math.cos(cam.pitch)
  ).multiplyScalar(cam.dist).add(cam.target);
  camera.position.copy(p);
  camera.lookAt(cam.target);
  if (state.shake > 0) {
    camera.position.add(new THREE.Vector3((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake, 0));
    state.shake *= 0.83;
  }
}

function releaseProjectile(i) {
  const p = state.projectiles[i];
  p.mesh.visible = false;
  state.pools.projectiles.push(p);
  state.projectiles.splice(i, 1);
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.paused || !state.gameStarted) {
    renderer.render(scene, camera);
    return;
  }

  const simDt = dt * state.gameSpeed;
  for (const k of Object.keys(state.abilityCooldowns)) state.abilityCooldowns[k] = Math.max(0, state.abilityCooldowns[k] - simDt);
  state.buffs.overclock = Math.max(0, state.buffs.overclock - simDt);

  if (!state.inWave && state.betweenWaveCountdown > 0 && !state.paused) {
    state.betweenWaveCountdown = Math.max(0, state.betweenWaveCountdown - dt);
    if (state.betweenWaveCountdown <= 0) spawnWave();
  }

  if (state.inWave) {
    state.spawnTimer -= simDt;
    if (state.spawnTimer <= 0 && state.remainingInWave > 0) {
      const boss = state.wave % 5 === 0 && state.remainingInWave === 1;
      state.enemies.push(spawnEnemy(boss));
      state.remainingInWave--;
      state.spawnTimer = boss ? 1.4 : 0.45;
    }
    if (state.remainingInWave === 0 && state.enemies.length === 0) beginBuildPhase();
  }

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (e.hp <= 0) {
      state.money += e.boss ? 70 : 12;
      state.meta.upgradePoints = (state.meta.upgradePoints || 0) + (e.boss ? 1 : 0);
      e.mesh.visible = false;
      world.remove(e.mesh);
      state.pools.enemies.push(e.mesh);
      state.enemies.splice(i, 1);
      continue;
    }

    const speed = e.freeze > 0 ? 0 : e.speed * (state.mode === 'challenge' ? 1.15 : 1);
    e.freeze = Math.max(0, e.freeze - simDt);
    if (e.burn > 0) { e.hp -= simDt * (2.2 * e.burn); e.burn = Math.max(0, e.burn - simDt); }
    e.t += simDt * speed / (board.path.length * 0.58);
    const idx = Math.floor(e.t * (board.path.length - 1));
    if (idx >= board.path.length - 1) {
      state.lives -= e.boss ? 4 : 1;
      state.enemies.splice(i, 1);
      world.remove(e.mesh);
      state.pools.enemies.push(e.mesh);
      if (state.lives <= 0) {
        state.paused = true;
        ui.mainMenu.classList.remove('hidden');
        showToast('Defeat. Restarting...', false);
      }
      continue;
    }

    const f = e.t * (board.path.length - 1) - idx;
    const a = cellToWorld(...board.path[idx]);
    const b = cellToWorld(...board.path[idx + 1]);
    const yLift = e.flying ? 0.6 + Math.sin(now * 0.006 + e.bob) * 0.18 : 0.3;
    e.mesh.position.lerpVectors(a, b, f).setY((a.y * (1 - f) + b.y * f) + yLift);
    e.mesh.rotation.y += dt * 1.8;
    e.mesh.scale.setScalar(e.boss ? 1.45 : 1);
    e.mesh.material.emissive = new THREE.Color(e.freeze > 0 ? 0x8edbff : (e.shield > 0 ? 0x7f8cff : 0x14222f));
  }

  for (const t of state.towers) {
    t.cooldown -= simDt;
    t.recoil = Math.max(0, (t.recoil || 0) - simDt * 1.8);
    t.barrel.position.z = 0.22 - t.recoil;
    t.mesh.rotation.y += dt * 0.25;
    t.core.material.emissiveIntensity = 0.3 + Math.sin(now * 0.008) * 0.08 + t.level * 0.05;
    const range = towerDefs[t.type].range + (t.level - 1) * 0.45;
    const target = state.enemies.find(e => e.mesh.position.distanceTo(t.mesh.position) < range);
    const mult = state.buffs.overclock > 0 ? 0.62 : 1;
    if (target && t.cooldown <= 0 && state.inWave) {
      fireTower(t, target);
      t.cooldown = Math.max(0.12, (towerDefs[t.type].rate - (t.level - 1) * 0.07) * mult);
    }
  }

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    if (!p.target || !p.target.mesh.parent) {
      releaseProjectile(i);
      continue;
    }
    const dirV = p.target.mesh.position.clone().sub(p.pos);
    const step = Math.min(dirV.length(), p.speed * simDt);
    p.pos.add(dirV.normalize().multiplyScalar(step));
    p.mesh.position.copy(p.pos);
    if (step < 0.2) {
      if (p.aoe) state.enemies.forEach(e => { if (e.mesh.position.distanceTo(p.pos) < p.aoe) applyHit(e, p.damage, p.slow, p.kind === 'flame' ? 1.4 : 0); });
      else applyHit(p.target, p.damage, p.slow, p.kind === 'flame' ? 1.4 : 0);
      releaseProjectile(i);
    }
  }

  for (let i = state.effects.length - 1; i >= 0; i--) {
    const fx = state.effects[i];
    fx.life -= simDt;
    if (!fx.mesh) {
      fx.mesh = state.pools.effects.pop() || new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 24), new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide }));
      fx.mesh.rotation.x = -Math.PI / 2;
      world.add(fx.mesh);
    }
    fx.mesh.visible = true;
    fx.mesh.position.copy(fx.pos).setY(fx.pos.y + 0.07);
    fx.mesh.scale.setScalar((1 - fx.life) * (fx.radius || 2.2));
    fx.mesh.material.opacity = Math.max(0, fx.life * 2);
    fx.mesh.material.color.setHex(fx.color || 0xffd6a5);
    if (fx.life <= 0) {
      fx.mesh.visible = false;
      state.pools.effects.push(fx.mesh);
      state.effects.splice(i, 1);
    }
  }

  updateCamera();
  updateUI();
  renderer.render(scene, camera);
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
  canvas.setPointerCapture(e.pointerId);
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
  if (touches.size === 1) {
    const cell = pickCell(e.clientX, e.clientY);
    if (!cell) return;
    const worldPos = cellToWorld(cell[0], cell[1]);
    state.hoverCell = cell;
    hoverTile.visible = true;
    hoverTile.position.copy(worldPos).setY(worldPos.y + 0.04);
    if (state.buildMode && state.selectedTowerType) {
      const valid = !board.blocked.has(`${cell[0]},${cell[1]}`) && !pathCellSet.has(`${cell[0]},${cell[1]}`);
      ghost.visible = true;
      ghost.position.copy(worldPos).setY(worldPos.y + 0.6);
      rangeRing.visible = true;
      rangeRing.position.copy(worldPos).setY(worldPos.y + 0.06);
      rangeRing.scale.setScalar(towerDefs[state.selectedTowerType].range);
      hoverTile.material.color.setHex(valid ? 0x57ffa3 : 0xff6b7f);
      ghost.material.color.setHex(valid ? 0x57ffa3 : 0xff6b7f);
    }
  }
  if (touches.size === 2) {
    const [a, b] = [...touches.values()];
    touches.gesture = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }
});

canvas.addEventListener('pointermove', e => {
  if (!touches.has(e.pointerId)) return;
  const prev = touches.get(e.pointerId);
  touches.set(e.pointerId, { ...prev, x: e.clientX, y: e.clientY });
  if (touches.size === 1) {
    cam.velYaw += -e.movementX * 0.0017;
    cam.velPitch += e.movementY * 0.0013;
    const cell = pickCell(e.clientX, e.clientY);
    if (!cell) return;
    const worldPos = cellToWorld(cell[0], cell[1]);
    state.hoverCell = cell;
    hoverTile.visible = true;
    hoverTile.position.copy(worldPos).setY(worldPos.y + 0.04);
    if (state.buildMode && state.selectedTowerType) {
      const valid = !board.blocked.has(`${cell[0]},${cell[1]}`) && !pathCellSet.has(`${cell[0]},${cell[1]}`);
      ghost.visible = true;
      ghost.position.copy(worldPos).setY(worldPos.y + 0.6);
      rangeRing.visible = true;
      rangeRing.position.copy(worldPos).setY(worldPos.y + 0.05);
      rangeRing.scale.setScalar(towerDefs[state.selectedTowerType].range);
      hoverTile.material.color.setHex(valid ? 0x57ffa3 : 0xff6b7f);
      ghost.material.color.setHex(valid ? 0x57ffa3 : 0xff6b7f);
    }
  } else if (touches.size === 2) {
    const vals = [...touches.values()].filter(v => v && v.x !== undefined);
    const [a, b] = vals;
    const g = touches.gesture;
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    cam.velDist += (g.d - d) * 0.004;
    cam.panVel.x += -(cx - g.cx) * 0.004;
    cam.panVel.y += (cy - g.cy) * 0.004;
    touches.gesture = { d, cx, cy };
  }
});

canvas.addEventListener('pointerup', e => {
  const was = touches.get(e.pointerId);
  touches.delete(e.pointerId);
  if (touches.size < 2) delete touches.gesture;
  const dt = performance.now() - (was?.t || 0);
  if (dt < 260) {
    const nowTap = performance.now();
    if (nowTap - lastTapAt < 300) {
      unifiedOverview(true);
      lastTapAt = 0;
      return;
    }
    lastTapAt = nowTap;
    const cell = pickCell(e.clientX, e.clientY);
    if (!cell) return;
    if (state.buildMode && state.selectedTowerType) placeTowerAt(cell);
    else state.selectedTower = state.towers.find(t => t.cell[0] === cell[0] && t.cell[1] === cell[1]) || null;
  }
});

canvas.addEventListener('dblclick', () => unifiedOverview(true));
canvas.addEventListener('wheel', e => {
  cam.velDist += e.deltaY * 0.004;
}, { passive: true });

ui.cancelBuildBtn.onclick = () => {
  state.buildMode = false;
  ghost.visible = false;
  rangeRing.visible = false;
  ui.buildPanel.classList.add('hidden');
};
ui.startWaveBtn.onclick = () => {
  if (!state.buildPhase) return;
  if (state.mode === 'campaign' && state.wave >= state.levelWaves) return;
  if (state.towers.length === 0) {
    showToast('Place at least one tower first.', false);
    return;
  }
  spawnWave();
};
ui.upgradeBtn.onclick = () => {
  const t = state.selectedTower;
  if (!t || t.level >= 4) return;
  const cost = 45 * t.level;
  if (state.money < cost) return showToast('Need more credits', false);
  state.money -= cost;
  t.level += 1;
  t.core.scale.setScalar(1 + t.level * 0.08);
  t.barrel.scale.z = 1 + t.level * 0.16;
  showToast('Upgraded');
};
ui.sellBtn.onclick = () => {
  const t = state.selectedTower;
  if (!t) return;
  state.money += Math.round(towerDefs[t.type].cost * 0.65);
  board.blocked.delete(`${t.cell[0]},${t.cell[1]}`);
  world.remove(t.mesh);
  state.towers = state.towers.filter(x => x !== t);
  state.selectedTower = null;
};
ui.pauseBtn.onclick = () => { state.paused = true; ui.pauseMenu.classList.remove('hidden'); };
ui.resumeBtn.onclick = () => { state.paused = false; ui.pauseMenu.classList.add('hidden'); };
ui.menuBtn.onclick = () => { state.paused = true; state.gameStarted = false; ui.pauseMenu.classList.add('hidden'); ui.mainMenu.classList.remove('hidden'); };

function start(mode) {
  state.mode = mode;
  state.currentLevel = mode === 'campaign' ? (state.campaign.selectedLevel || 1) : 1;
  state.levelWaves = mode === 'campaign' ? ((campaignDefs.find(x => x.level === state.currentLevel)?.waves) || 10) : 999;
  state.money = 220 + (state.meta.econ || 0) * 45;
  state.lives = 20;
  state.wave = 0;
  state.inWave = false;
  state.buildPhase = true;
  state.towers.forEach(t => world.remove(t.mesh));
  state.enemies.forEach(e => world.remove(e.mesh));
  state.towers = [];
  state.enemies = [];
  state.projectiles = [];
  state.effects = [];
  board.blocked.clear();
  state.paused = false;
  state.gameSpeed = 1;
  state.betweenWaveCountdown = 0;
  state.gameStarted = true;
  ui.mainMenu.classList.add('hidden');
  ui.bossWarning.classList.add('hidden');
  syncProgressUnlocks();
  initDock();
  initAbilities();
  refreshWavePreview();
  unifiedOverview(false);
}

ui.playCampaign.onclick = () => {
  const sel = state.campaign.selectedLevel || 1;
  if (sel > (state.campaign.unlockedLevel || 1)) return showToast('This level is locked.', false);
  start('campaign');
};
ui.playEndless.onclick = () => start('endless');
ui.playChallenge.onclick = () => start('challenge');
ui.overviewBtn.onclick = () => unifiedOverview(true);
ui.speedBtn.onclick = () => { state.gameSpeed = state.gameSpeed >= 4 ? 1 : state.gameSpeed + 1; };
ui.continueBtn.onclick = () => {
  ui.levelCompleteModal.classList.add('hidden');
  ui.mainMenu.classList.remove('hidden');
  state.gameStarted = false;
};

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
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

buildMeta();
buildCampaignMenu();
initDock();
initAbilities();
refreshWavePreview();
showToast('Build first, then tap ▶️. Double-tap field for overview.');
requestAnimationFrame(animate);
