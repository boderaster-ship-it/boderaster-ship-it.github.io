import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';

const canvas = document.getElementById('gameCanvas');
const toastEl = document.getElementById('toast');

function safeJSONParse(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`[MenuBootstrap] Failed to parse ${key}; resetting save data.`, err);
    return fallback;
  }
}

function showMenuFallback(message, err = null) {
  console.error('[MenuBootstrap] ' + message, err || '');
  const menu = document.getElementById('mainMenu');
  if (!menu) return;
  menu.classList.remove('hidden');
  menu.innerHTML = `<div class="sheet"><h2>Menu failed to load</h2><p>${message}</p><button id="menuReloadBtn">Tap to reload</button></div>`;
  const reloadBtn = document.getElementById('menuReloadBtn');
  reloadBtn?.addEventListener('click', async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    window.location.reload();
  });
}

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
  obstaclePanel: document.getElementById('obstaclePanel'),
  obstacleTitle: document.getElementById('obstacleTitle'),
  clearObstacleBtn: document.getElementById('clearObstacleBtn'),
  castlePalette: document.getElementById('castlePalette'),
  castleTextureList: document.getElementById('castleTextureList'),
  castlePartList: document.getElementById('castlePartList'),
  castleSelectionStatus: document.getElementById('castleSelectionStatus'),
  castlePreview: document.getElementById('castlePreview'),
  castleResetBtn: document.getElementById('castleResetBtn'),
  castleRandomizeBtn: document.getElementById('castleRandomizeBtn'),
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
  playCampaignStart: document.getElementById('playCampaignStart'),
  playEndlessStart: document.getElementById('playEndlessStart'),
  playChallengeStart: document.getElementById('playChallengeStart'),
  openCastle: document.getElementById('openCastle'),
  openUpgrades: document.getElementById('openUpgrades'),
  openUnlockSettings: document.getElementById('openUnlockSettings'),
  metaTree: document.getElementById('metaTree'),
  audioToggle: document.getElementById('audioToggle'),
  shakeToggle: document.getElementById('shakeToggle'),
  perfToggle: document.getElementById('perfToggle'),
  updateBtn: document.getElementById('updateBtn'),
  overviewBtn: document.getElementById('overviewBtn'),
  cineCamBtn: document.getElementById('cineCamBtn'),
  speedBtn: document.getElementById('speedBtn'),
  speedLabel: document.getElementById('speedLabel'),
  nextWaveTimer: document.getElementById('nextWaveTimer'),
  towerBuilderModal: document.getElementById('towerBuilderModal'),
  builderModules: document.getElementById('builderModules'),
  builderSlots: document.getElementById('builderSlots'),
  builderPreview: document.getElementById('builderPreview'),
  savedBuilds: document.getElementById('savedBuilds'),
  builderConfirmBtn: document.getElementById('builderConfirmBtn'),
  builderCancelBtn: document.getElementById('builderCancelBtn'),
  campaignWorldSelect: document.getElementById('campaignWorldSelect'),
  campaignLevelSelect: document.getElementById('campaignLevelSelect'),
  endlessWorldSelect: document.getElementById('endlessWorldSelect'),
  challengeWorldSelect: document.getElementById('challengeWorldSelect'),
  finalBossUnlock: document.getElementById('finalBossUnlock'),
  playFinalBoss: document.getElementById('playFinalBoss'),
  unlockList: document.getElementById('unlockList'),
  upgradePointsLabel: document.getElementById('upgradePointsLabel'),
  levelCompleteModal: document.getElementById('levelCompleteModal'),
  levelCompleteSummary: document.getElementById('levelCompleteSummary'),
  levelRewards: document.getElementById('levelRewards'),
  continueBtn: document.getElementById('continueBtn')
};

const menuPages = Array.from(document.querySelectorAll('.menuPage'));
let activeMenuPage = 'home';

const modeRules = {
  campaign: { scale: 1, mod: 'Standardbetrieb' },
  endless: { scale: 1.16, mod: 'Skalierende Panzerung pro Welle' },
  challenge: { scale: 1.34, mod: 'Aggressive Feinde' }
};

const towerDefs = {
  cannon: { icon: '💥', name: 'Bastion', cost: 65, damage: 18, range: 5.2, rate: 0.85, color: 0x74b9ff, projectile: 'shell', aoe: 1.9 },
  laser: { icon: '🔷', name: 'Arc Prism', cost: 85, damage: 9, range: 6.4, rate: 0.25, color: 0x6fffe9, projectile: 'bolt' },
  missile: { icon: '🚀', name: 'Skyhammer', cost: 120, damage: 28, range: 7.1, rate: 1.2, color: 0xffd166, projectile: 'missile', aoe: 2.6 },
  cryo: { icon: '❄️', name: 'Frost Coil', cost: 90, damage: 6, range: 5.8, rate: 0.55, color: 0x9bf6ff, projectile: 'ice', slow: 0.45 },
  flame: { icon: '🔥', name: 'Pyre', cost: 105, damage: 4, range: 4.4, rate: 0.12, color: 0xff8c42, projectile: 'flame', burn: 1.4 }
};


const builderModules = {
  kinetic: { icon: '🔩', name: 'Kinetik', cost: 34, dmg: 1.2, range: 0.2, cd: -0.02, effects: 'Verstärkte Panzerung + ballistischer Rückstoß. Erhöht den Grundschaden.' },
  cryo: { icon: '🧊', name: 'Kryo', cost: 40, dmg: 0.82, range: 0.15, cd: 0.02, effects: 'Verursacht Kältestapel und eine Chance auf Einfrieren.' },
  arc: { icon: '⚡', name: 'Lichtbogen', cost: 46, dmg: 0.88, range: 0.25, cd: 0.01, effects: 'Fügt Kettenblitze und Schockverstärkung hinzu.' },
  explosive: { icon: '💣', name: 'Explosiv', cost: 52, dmg: 1.05, range: -0.05, cd: 0.08, effects: 'Fügt Flächentreffer, Rückstoßimpuls und Flächenkontrolle hinzu.' },
  beam: { icon: '🎯', name: 'Strahl', cost: 58, dmg: 1.26, range: 0.3, cd: 0.14, effects: 'Fokuslinse für Präzisionsschaden und Panzerungsdurchdringung.' }
};

const moduleKeys = Object.keys(builderModules);
const PROJECTILE_FIRE_DEBUG = new URLSearchParams(window.location.search).has('projectileDebug');

const enemyArchetypes = {
  runner: { color: 0x67d98a, speed: 1.2, hp: 50, size: 0.28, accents: 0x294c33, type: 'runner' },
  tank: { color: 0xbf6a44, speed: 0.82, hp: 130, size: 0.42, accents: 0x5a3327, type: 'tank' },
  shielded: { color: 0x7b67d9, speed: 0.95, hp: 90, size: 0.34, shield: 60, accents: 0xaad9ff, type: 'shielded' },
  flyer: { color: 0x6dcaf2, speed: 1.35, hp: 65, size: 0.24, flying: true, accents: 0xd9f4ff, type: 'flyer' }
};

const abilities = {
  freeze: {
    name: 'Einfrieren',
    icon: '🧊',
    cd: 22,
    text: 'Stoppt Feinde für 2,5 s',
    use: () => {
      launchAbilityStorm('freeze', 0x9ce9ff, {
        onTouch: enemy => {
          enemy.freeze = Math.max(enemy.freeze, 2.5);
        }
      });
    }
  },
  nuke: {
    name: 'Nuklear',
    icon: '☢️',
    cd: 35,
    text: 'Gewaltige Flächenexplosion',
    use: () => {
      launchAbilityStorm('nuke', 0xff7b66, {
        onTouch: enemy => {
          applyHit(enemy, 130, 0, 0, null, 'explosive');
        }
      });
    }
  },
  overclock: {
    name: 'Blitzangriff',
    icon: '⚡',
    cd: 26,
    text: 'Durchdringt Gegner und fügt Blitzschaden zu',
    use: () => {
      launchAbilityStorm('overclock', 0xffdd73, {
        onTouch: enemy => {
          applyHit(enemy, 36, 0, 0, null, 'arc');
        }
      });
    }
  },
  poison: {
    name: 'Gift',
    icon: '☠️',
    cd: 28,
    text: 'Vergiftet Feinde für 5 s',
    use: () => {
      launchAbilityStorm('poison', 0x89ff62, {
        onTouch: enemy => {
          enemy.poison = Math.max(enemy.poison || 0, 5);
        }
      });
    }
  }
};

const towerUnlockOrder = ['laser', 'missile', 'cryo'];
const abilityUnlockOrder = ['overclock', 'poison', 'nuke'];
const TOWER_BUILDER_UNLOCK_LEVEL = 18;

const metaDefs = [
  { key: 'upCannon', icon: towerDefs.cannon.icon, name: 'Bastion-Upgrade', tower: 'cannon', affects: 'Bastion-Schaden', desc: 'Erhöht den Schaden der Bastion.', unit: '%', perLevel: 10 },
  { key: 'upLaser', icon: towerDefs.laser.icon, name: 'Arc-Prisma-Upgrade', tower: 'laser', affects: 'Arc-Prisma-Schaden', desc: 'Erhöht den Schaden des Arc Prism.', unit: '%', perLevel: 10 },
  { key: 'upMissile', icon: towerDefs.missile.icon, name: 'Skyhammer-Upgrade', tower: 'missile', affects: 'Skyhammer-Schaden', desc: 'Erhöht den Schaden des Skyhammer.', unit: '%', perLevel: 10 },
  { key: 'upCryo', icon: towerDefs.cryo.icon, name: 'Frost-Coil-Upgrade', tower: 'cryo', affects: 'Frost-Coil-Schaden', desc: 'Erhöht den Schaden der Frost Coil.', unit: '%', perLevel: 10 },
  { key: 'upFlame', icon: towerDefs.flame.icon, name: 'Pyre-Upgrade', tower: 'flame', affects: 'Pyre-Schaden', desc: 'Erhöht den Schaden der Pyre.', unit: '%', perLevel: 10 },
  { key: 'econ', icon: '💰', name: 'Versorgungslager', affects: 'Startguthaben', desc: 'Beginne jedes Level mit zusätzlichem Guthaben.', unit: 'Credits', perLevel: 45 }
];

const worldPaths = {
  1: {
    1: [[1,1],[1,2],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[11,3],[12,3],[13,3],[14,3],[14,4],[14,5],[13,5],[12,5],[11,5],[10,5],[9,5],[8,5],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[1,5],[1,6],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7],[7,7],[8,7],[9,7],[10,7],[11,7],[12,7],[13,7],[14,7],[14,8],[14,9],[13,9],[12,9],[11,9],[10,9],[9,9],[8,9],[7,9],[6,9],[5,9],[4,9],[3,9],[2,9],[1,9],[1,10],[1,11],[2,11],[3,11],[4,11],[5,11],[6,11],[7,11],[8,11],[9,11],[10,11],[11,11],[12,11],[13,11],[14,11],[14,12],[14,13],[14,14],[13,14],[12,14],[11,14]],
    2: [[1,1],[2,1],[3,1],[4,1],[4,2],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[10,4],[10,5],[9,5],[8,5],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[2,6],[2,7],[3,7],[4,7],[5,7],[6,7],[7,7],[8,7],[9,7],[10,7],[11,7],[12,7],[12,8],[12,9],[11,9],[10,9],[9,9],[8,9],[7,9],[6,9],[5,9],[4,9],[3,9],[2,9],[2,10],[2,11],[3,11],[4,11],[5,11],[6,11],[7,11],[8,11],[9,11],[10,11],[11,11],[12,11],[13,11],[14,11],[14,12],[14,13],[13,13],[12,13]],
    3: [[2,1],[2,2],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[11,3],[12,3],[13,3],[13,4],[13,5],[12,5],[11,5],[10,5],[9,5],[8,5],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[2,6],[2,7],[3,7],[4,7],[5,7],[6,7],[7,7],[8,7],[9,7],[10,7],[11,7],[12,7],[13,7],[13,8],[13,9],[12,9],[11,9],[10,9],[9,9],[8,9],[7,9],[6,9],[5,9],[4,9],[3,9],[2,9],[2,10],[2,11],[3,11],[4,11],[5,11],[6,11],[7,11],[8,11],[9,11],[10,11],[11,11],[12,11],[13,11],[13,12],[13,13],[12,13],[11,13],[10,13]],
    4: [[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],[13,2],[14,2],[14,3],[14,4],[13,4],[12,4],[11,4],[10,4],[9,4],[8,4],[7,4],[6,4],[5,4],[4,4],[3,4],[2,4],[1,4],[1,5],[1,6],[2,6],[3,6],[4,6],[5,6],[6,6],[7,6],[8,6],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],[13,8],[12,8],[11,8],[10,8],[9,8],[8,8],[7,8],[6,8],[5,8],[4,8],[3,8],[2,8],[1,8],[1,9],[1,10],[2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[11,10],[12,10],[13,10],[14,10],[14,11],[14,12],[13,12],[12,12]],
    5: [[1,1],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2],[12,2],[13,2],[14,2],[14,3],[14,4],[13,4],[12,4],[11,4],[10,4],[9,4],[8,4],[7,4],[6,4],[5,4],[4,4],[3,4],[2,4],[1,4],[1,5],[1,6],[2,6],[3,6],[4,6],[5,6],[6,6],[7,6],[8,6],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],[13,8],[12,8],[11,8],[10,8],[9,8],[8,8],[7,8],[6,8],[5,8],[4,8],[3,8],[2,8],[1,8],[1,9],[1,10],[2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[11,10],[12,10],[13,10],[14,10],[14,11],[14,12],[13,12],[12,12],[11,12]],
    6: [[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[9,1],[10,1],[11,1],[12,1],[13,1],[14,1],[14,2],[14,3],[13,3],[12,3],[11,3],[10,3],[9,3],[8,3],[7,3],[6,3],[5,3],[4,3],[3,3],[2,3],[1,3],[1,4],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],[11,5],[12,5],[13,5],[14,5],[14,6],[14,7],[13,7],[12,7],[11,7],[10,7],[9,7],[8,7],[7,7],[6,7],[5,7],[4,7],[3,7],[2,7],[1,7],[1,8],[1,9],[2,9],[3,9],[4,9],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[11,9],[12,9],[13,9],[14,9],[14,10],[14,11],[13,11],[12,11],[11,11],[10,11],[9,11]]
  },
  2: {},3:{},4:{}
};
const mirrorX = p => p.map(([x,z]) => [15 - x, z]);
const shiftZ = (p, d) => p.map(([x,z]) => [x, Math.max(1, Math.min(14, z + d))]);
Object.entries(worldPaths[1]).forEach(([k,v]) => { worldPaths[2][k] = mirrorX(v); worldPaths[3][k] = shiftZ(v, (Number(k)%2===0?1:-1)); worldPaths[4][k] = mirrorX(shiftZ(v, (Number(k)%2===0?-1:1))); });

const worldThemes = {
  1:{name:'World 1 · Forest', bg:0x9fd5ff, fog:0xb8d7bc, terrain:0x3f6a45, road:0x6b5a42, edge:0xa18b6c, ambient:0xcce7cf, sun:0xfff2dc, sunIntensity:1.45, fogFar:130, sky:0xc8e7ff, prop:'forest', vfx:'pollen', intro:'Wald-Biome: Bäume, Felsen und klare Tageslicht-Sicht.'},
  2:{name:'World 2 · Ice', bg:0xcde6ff, fog:0xd8edff, terrain:0x9dbbcf, road:0x6f8ea4, edge:0xc6e1f3, ambient:0xd8edff, sun:0xe4f2ff, sunIntensity:1.25, fogFar:108, sky:0xe5f4ff, prop:'ice', vfx:'frost', intro:'Eis-Biome: gefrorene Hindernisse, kaltes Licht, Nebel.'},
  3:{name:'World 3 · Lava', bg:0x381b14, fog:0x5a2a1e, terrain:0x5f2c1f, road:0x8e5332, edge:0xd3905e, ambient:0x694033, sun:0xffb073, sunIntensity:1.95, fogFar:96, sky:0x58362d, prop:'lava', vfx:'embers', intro:'Lava-Biome: vulkanischer Boden, Asche und Hitze.'},
  4:{name:'World 4 · Convergence Arena', bg:0x67543a, fog:0x8d7b65, terrain:0x4f5944, road:0x8b7150, edge:0xc0aa86, ambient:0xb8c4ad, sun:0xffd8b0, sunIntensity:1.58, fogFar:102, sky:0x8ea8a1, prop:'hybrid', vfx:'hybrid', intro:'Finale Arena: gezielte Fusion aus Wald, Eis und Lava.'}
};

const campaignDefs = Array.from({ length: 24 }, (_, i) => {
  const world = Math.floor(i / 6) + 1;
  const levelInWorld = (i % 6) + 1;
  const level = i + 1;
  const difficulty = 1 + i * 0.12;
  const recommendedTowers = world === 1 ? (levelInWorld >= 3 ? 2 : 1) : world === 2 ? 3 : world === 3 ? 4 : 5;
  return {
    level, world, levelInWorld, waves: 10 + (world >= 3 ? 1 : 0), difficulty,
    rewardCredits: 170 + i * 32,
    rewardTokens: 2 + Math.floor(i / 4),
    unlockTower: level % 3 === 0 ? towerUnlockOrder[Math.floor(level / 3) - 1] || null : null,
    waveTheme: world === 4 ? 'Elite / Tank / Rage' : world === 3 ? 'Frost rush / Shield wall' : world === 2 ? 'Rush / Ökonomie-Druck' : 'Basis-Mix',
    recommendedTowers,
    intro: worldThemes[world].intro
  };
});

const FINAL_BOSS_LEVEL = 25;
const WORLD_MENU_LABELS = { 1: 'World 1 = Forest', 2: 'World 2 = Ice', 3: 'World 3 = Lava', 4: 'World 4 = Endboss (combined)' };

const CASTLE_CUSTOMIZATION_VERSION = 1;
const CASTLE_RANDOM_SEQUENCE = ['#5FA8D3', '#82C091', '#D9A066', '#D97575', '#7D6BFF', '#E7D96F', '#9EA3AB', '#7082A9'];
const CASTLE_TEXTURE_KEYS = ['stone', 'wood', 'metal', 'dark', 'ice', 'lava'];

/**
 * Castle part registry is the single source of truth for modular goal-castle parts.
 * Save format: state.campaign.castleCustomization = { version, parts: { [partId]: { color, texture } } }
 */
const castleParts = {
  wall: { label: 'wall', defaultColor: '#9EA3AB', defaultTexture: 'stone' },
  keep: { label: 'keep', defaultColor: '#9EA3AB', defaultTexture: 'stone' },
  gate: { label: 'gate', defaultColor: '#4A3524', defaultTexture: 'wood' },
  tower_1: { label: 'tower1', defaultColor: '#7082A9', defaultTexture: 'metal' },
  tower_2: { label: 'tower2', defaultColor: '#7082A9', defaultTexture: 'metal' },
  tower_3: { label: 'tower3', defaultColor: '#7082A9', defaultTexture: 'metal' },
  tower_4: { label: 'tower4', defaultColor: '#7082A9', defaultTexture: 'metal' },
  roof_1: { label: 'roof1', defaultColor: '#5B4D6D', defaultTexture: 'dark' },
  roof_2: { label: 'roof2', defaultColor: '#5B4D6D', defaultTexture: 'dark' },
  roof_3: { label: 'roof3', defaultColor: '#5B4D6D', defaultTexture: 'dark' },
  roof_4: { label: 'roof4', defaultColor: '#5B4D6D', defaultTexture: 'dark' },
  banner: { label: 'banner', defaultColor: '#D97575', defaultTexture: 'lava' }
};

const CASTLE_TEXTURE_PRESETS = {
  stone: { roughness: 0.82, metalness: 0.08, emissive: 0x000000, emissiveIntensity: 0 },
  wood: { roughness: 0.9, metalness: 0.02, emissive: 0x000000, emissiveIntensity: 0 },
  metal: { roughness: 0.4, metalness: 0.68, emissive: 0x0a0d12, emissiveIntensity: 0.05 },
  dark: { roughness: 0.62, metalness: 0.1, emissive: 0x111111, emissiveIntensity: 0.1 },
  ice: { roughness: 0.22, metalness: 0.18, emissive: 0x1e4f7d, emissiveIntensity: 0.2 },
  lava: { roughness: 0.7, metalness: 0.06, emissive: 0x5a1b0d, emissiveIntensity: 0.28 }
};

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
  abilityCooldowns: { freeze: 0, nuke: 0, overclock: 0, poison: 0 },
  paused: false,
  gameSpeed: 1,
  betweenWaveCountdown: 0,
  gameStarted: false,
  shake: 0,
  meta: safeJSONParse('aegis-meta', { upgradePoints: 5, unlockedTowers: ['cannon'] }),
  pools: { projectiles: [], effects: [], healthBars: [], fragments: [], particles: [], shockwaves: [], stormHeads: [] },
  particlesFrame: 0,
  maxParticlesFrame: 70,
  campaign: safeJSONParse('aegis-campaign', { selectedLevel: 1, selectedWorld: 1, completed: {}, unlockedLevel: 1, clearedObstacles: {}, castleCustomization: { version: CASTLE_CUSTOMIZATION_VERSION, parts: {} } }),
  currentLevel: 1,
  endlessWorld: 1,
  challengeWorld: 1,
  levelWaves: 10,
  pendingLevelRewards: null,
  activeBuild: null,
  builderDraft: [],
  unlocks: safeJSONParse('aegis-unlocks', { towerBuilder: false }),
  obstacleTap: { key: null, expires: 0 },
  selectedCastleColor: '#9EA3AB',
  selectedCastleTexture: 'stone',
  selectedCastlePart: 'wall'
};

state.meta.unlockedTowers = state.meta.unlockedTowers || ['cannon'];
state.meta.unlockedAbilities = state.meta.unlockedAbilities || ['freeze'];
if (state.meta.unlockedAbilities.includes('repair')) {
  state.meta.unlockedAbilities = state.meta.unlockedAbilities.map(key => key === 'repair' ? 'poison' : key);
}
state.meta.savedBuilds = state.meta.savedBuilds || [];
state.unlocks = state.unlocks || { towerBuilder: false };
state.campaign = state.campaign || {};
state.campaign.completed = state.campaign.completed || {};
state.campaign.unlockedLevel = state.campaign.unlockedLevel || 1;
state.campaign.selectedWorld = Number(state.campaign.selectedWorld) || 1;
state.campaign.selectedLevel = Number(state.campaign.selectedLevel) || 1;
state.campaign.finalBossUnlocked = !!state.campaign.finalBossUnlocked;
state.campaign.bossCompleted = !!state.campaign.bossCompleted;
state.campaign.clearedObstacles = state.campaign.clearedObstacles || {};

syncProgressUnlocks();
sanitizeCastleColorState();

const board = { w: 16, h: 16, tile: 1.12, blocked: new Set(), path: [...worldPaths[1][1]] };
let pathCellSet = new Set(board.path.map(([x, z]) => `${x},${z}`));
const GROUND_Y = 0;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(1, 1, false);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd5ff);
scene.fog = new THREE.Fog(0xbfdff4, 45, 130);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 220);
const cam = { yaw: 0.6, pitch: 0.98, dist: 24, target: new THREE.Vector3(0, 0, 8.2), velYaw: 0, velPitch: 0, velDist: 0, panVel: new THREE.Vector2(), transitioning: null, cine: { active: false, targetEnemy: null, travelStart: 0, travelDur: 820, pathStart: 0, pathProgress: 1, camT: 0, followOffsetT: 0.11, smoothPos: null, smoothLook: null, baseYaw: 0, basePitch: 0, baseDist: 0, userYawOffset: 0, userPitchOffset: 0, userDistOffset: 0, userPanOffset: new THREE.Vector2(), baselineTarget: new THREE.Vector3(0, 0, 8.2) } };

const hemi = new THREE.HemisphereLight(0xd9efff, 0x6f9269, 1.05);
scene.add(hemi);
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
const rimLight = new THREE.DirectionalLight(0x9fc7ff, 0.4);
rimLight.position.set(-10, 7, -8);
scene.add(rimLight);
const fillLight = new THREE.DirectionalLight(0xffd5ab, 0.28);
fillLight.position.set(6, 5, -4);
scene.add(fillLight);

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(190, 32, 24),
  new THREE.MeshBasicMaterial({ color: 0xc8e7ff, side: THREE.BackSide })
);
scene.add(sky);

const world = new THREE.Group();
scene.add(world);

const objectiveVisuals = (() => {
  const shared = {
    spawnBaseGeom: new THREE.CylinderGeometry(0.56, 0.66, 0.28, 14),
    spawnHoleGeom: new THREE.CylinderGeometry(0.26, 0.28, 0.19, 14),
    rockChunkGeom: new THREE.DodecahedronGeometry(0.24, 0),
    iceShardGeom: new THREE.BoxGeometry(0.14, 0.05, 0.27),
    flameCoreGeom: new THREE.ConeGeometry(0.22, 0.7, 10),
    sparkGeom: new THREE.SphereGeometry(0.05, 6, 6),
    portalCenterGeom: new THREE.CylinderGeometry(0.34, 0.38, 0.1, 20),
    ringGeom: new THREE.TorusGeometry(0.34, 0.06, 8, 24),
    w1RimGeom: new THREE.TorusGeometry(0.24, 0.04, 6, 12),
    w2MistGeom: new THREE.RingGeometry(0.28, 0.5, 24),
    w4DistortionGeom: new THREE.RingGeometry(0.48, 0.66, 26),
    castleBaseGeom: new THREE.CylinderGeometry(0.74, 0.88, 0.5, 20),
    castleKeepGeom: new THREE.BoxGeometry(1.02, 1.02, 1.02),
    castleTowerGeom: new THREE.CylinderGeometry(0.21, 0.25, 0.9, 10),
    castleRoofGeom: new THREE.ConeGeometry(0.28, 0.42, 10),
    spawnMats: {
      w1Rock: new THREE.MeshStandardMaterial({ color: 0x5f5d5f, roughness: 0.92, metalness: 0.02 }),
      w1Cave: new THREE.MeshStandardMaterial({ color: 0x17151a, emissive: 0x141322, emissiveIntensity: 0.18, roughness: 0.95, metalness: 0.02 }),
      w1Rim: new THREE.MeshStandardMaterial({ color: 0x5e6174, emissive: 0x354c66, emissiveIntensity: 0.24, roughness: 0.85, metalness: 0.06 }),
      w2Ice: new THREE.MeshStandardMaterial({ color: 0xa4d6f4, roughness: 0.24, metalness: 0.22, emissive: 0x243f58, emissiveIntensity: 0.12 }),
      w2Hole: new THREE.MeshStandardMaterial({ color: 0x132238, emissive: 0x0a213b, emissiveIntensity: 0.18, roughness: 0.55, metalness: 0.08 }),
      w2Mist: new THREE.MeshBasicMaterial({ color: 0xb7e9ff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
      w3Rim: new THREE.MeshStandardMaterial({ color: 0x503127, roughness: 0.87, metalness: 0.06 }),
      w3Core: new THREE.MeshStandardMaterial({ color: 0xffa13b, emissive: 0xff4d00, emissiveIntensity: 0.75, roughness: 0.3, metalness: 0.08 }),
      w3Flame: new THREE.MeshStandardMaterial({ color: 0xffd18a, emissive: 0xff701f, emissiveIntensity: 1.05, roughness: 0.18, metalness: 0.04 }),
      w3Spark: new THREE.MeshBasicMaterial({ color: 0xffcb82, transparent: true, opacity: 0.85, depthWrite: false }),
      w4Void: new THREE.MeshStandardMaterial({ color: 0x0b0c17, emissive: 0x04040a, emissiveIntensity: 0.34, roughness: 0.7, metalness: 0.1 }),
      w4Ring: new THREE.MeshStandardMaterial({ color: 0x4d4a7a, emissive: 0x7d6dff, emissiveIntensity: 0.66, roughness: 0.22, metalness: 0.38 }),
      w4Distortion: new THREE.MeshBasicMaterial({ color: 0x8477ff, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide })
    },
    castleMaterialCache: new Map()
  };


  function getCastleMaterial(textureKey, colorHex) {
    const texture = CASTLE_TEXTURE_PRESETS[textureKey] ? textureKey : 'stone';
    const color = normalizeColorHex(colorHex);
    const key = `${texture}|${color}`;
    if (shared.castleMaterialCache.has(key)) return shared.castleMaterialCache.get(key);
    const preset = CASTLE_TEXTURE_PRESETS[texture];
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: preset.roughness,
      metalness: preset.metalness,
      emissive: preset.emissive,
      emissiveIntensity: preset.emissiveIntensity
    });
    shared.castleMaterialCache.set(key, material);
    return material;
  }

  function getPathDirection(path, fromStart = true) {
    if (!Array.isArray(path) || path.length < 2) return new THREE.Vector3(0, 0, 1);
    const a = fromStart ? path[0] : path[path.length - 2];
    const b = fromStart ? path[1] : path[path.length - 1];
    const dir = new THREE.Vector3(b[0] - a[0], 0, b[1] - a[1]);
    return dir.lengthSq() > 0 ? dir.normalize() : new THREE.Vector3(0, 0, 1);
  }

  function yawFromDirection(dir) {
    return Math.atan2(dir.x, dir.z);
  }

  class Castle {
    constructor() {
      this.group = new THREE.Group();
      this.group.name = 'castle:root';
      this.state = 'idle';
      this.health = 100;
      this.currentLevelStyle = null;
      this.model = new THREE.Group();
      this.model.name = 'castle:model';
      this.castleGroup = new THREE.Group();
      this.castleGroup.name = 'castle:group';
      this.castlePartMeshes = new Map();
      this.group.add(this.model);
      this.model.add(this.castleGroup);
      this.buildBaseModel();
      this.applyColorsFromSave();
    }

    registerPart(mesh, partId) {
      mesh.userData.castlePartId = partId;
      mesh.name = `castle:${partId}`;
      this.castlePartMeshes.set(partId, mesh);
      this.castleGroup.add(mesh);
    }

    buildBaseModel() {
      const wall = new THREE.Mesh(shared.castleBaseGeom, getCastleMaterial(castleParts.wall.defaultTexture, castleParts.wall.defaultColor));
      wall.position.y = 0.25;
      this.registerPart(wall, 'wall');

      const keep = new THREE.Mesh(shared.castleKeepGeom, getCastleMaterial(castleParts.keep.defaultTexture, castleParts.keep.defaultColor));
      keep.position.y = 0.95;
      this.registerPart(keep, 'keep');

      const gate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.1), getCastleMaterial(castleParts.gate.defaultTexture, castleParts.gate.defaultColor));
      gate.position.set(0, 0.52, 0.54);
      this.registerPart(gate, 'gate');

      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 2) * i + Math.PI / 4;
        const x = Math.cos(angle) * 0.62;
        const z = Math.sin(angle) * 0.62;
        const towerId = `tower_${i + 1}`;
        const roofId = `roof_${i + 1}`;
        const tower = new THREE.Mesh(shared.castleTowerGeom, getCastleMaterial(castleParts[towerId].defaultTexture, castleParts[towerId].defaultColor));
        tower.position.set(x, 0.86, z);
        this.registerPart(tower, towerId);
        const roof = new THREE.Mesh(shared.castleRoofGeom, getCastleMaterial(castleParts[roofId].defaultTexture, castleParts[roofId].defaultColor));
        roof.position.set(x, 1.52, z);
        this.registerPart(roof, roofId);
      }

      const banner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.58, 0.02), getCastleMaterial(castleParts.banner.defaultTexture, castleParts.banner.defaultColor));
      banner.position.set(0, 1.58, 0.46);
      this.registerPart(banner, 'banner');

      this.group.traverse(obj => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
    }

    applyPartCustomization(partId, partConfig = null) {
      const mesh = this.castlePartMeshes.get(partId);
      const part = castleParts[partId];
      if (!mesh || !part) return false;
      const color = normalizeColorHex(partConfig?.color, part.defaultColor);
      const texture = CASTLE_TEXTURE_PRESETS[partConfig?.texture] ? partConfig.texture : part.defaultTexture;
      mesh.material = getCastleMaterial(texture, color);
      mesh.userData.castleTexture = texture;
      return true;
    }

    applyColorsFromSave() {
      const saved = state.campaign.castleCustomization?.parts || {};
      Object.entries(castleParts).forEach(([partId]) => {
        this.applyPartCustomization(partId, saved[partId]);
      });
    }

    setLevel(themeOrLevelId) {
      this.currentLevelStyle = themeOrLevelId;
      return this;
    }

    setState(nextState) {
      this.state = nextState;
      return this;
    }

    setHealth(value) {
      this.health = Number.isFinite(value) ? value : this.health;
      return this;
    }

    playAnimation(name) {
      if (name === 'victory') this.group.rotation.y += 0.0001;
      return this;
    }
  }

  function createSpawnPoint(worldId, levelId, path, toWorld) {
    if (!Array.isArray(path) || !path.length) return null;
    const spawn = new THREE.Group();
    let spawnAnim = null;
    if (worldId === 2) {
      const sheet = new THREE.Mesh(shared.spawnBaseGeom, shared.spawnMats.w2Ice);
      const hole = new THREE.Mesh(shared.spawnHoleGeom, shared.spawnMats.w2Hole);
      sheet.position.y = 0.04;
      hole.position.y = 0.1;
      spawn.add(sheet, hole);
      for (let i = 0; i < 6; i++) {
        const shard = new THREE.Mesh(shared.iceShardGeom, shared.spawnMats.w2Ice);
        const t = (i / 6) * Math.PI * 2;
        shard.position.set(Math.sin(t) * 0.38, 0.12, Math.cos(t) * 0.38);
        shard.rotation.set(0, t, (i % 2 === 0 ? 1 : -1) * 0.3);
        shard.scale.setScalar(0.9 + (i % 3) * 0.12);
        spawn.add(shard);
      }
      const mist = new THREE.Mesh(shared.w2MistGeom, shared.spawnMats.w2Mist);
      mist.rotation.x = -Math.PI / 2;
      mist.position.y = 0.16;
      mist.renderOrder = 3;
      spawn.add(mist);
      spawnAnim = { type: 'iceMist', mist, phase: Math.random() * Math.PI * 2 };
    } else if (worldId === 3) {
      const rim = new THREE.Mesh(shared.spawnBaseGeom, shared.spawnMats.w3Rim);
      rim.position.y = 0.04;
      const core = new THREE.Mesh(shared.spawnHoleGeom, shared.spawnMats.w3Core);
      core.position.y = 0.11;
      const flameA = new THREE.Mesh(shared.flameCoreGeom, shared.spawnMats.w3Flame);
      flameA.position.y = 0.4;
      const flameB = new THREE.Mesh(shared.flameCoreGeom, shared.spawnMats.w3Flame);
      flameB.position.y = 0.45;
      flameB.scale.set(0.7, 0.8, 0.7);
      flameB.rotation.y = Math.PI / 3;
      spawn.add(rim, core, flameA, flameB);
      const animData = { type: 'fire', flames: [flameA, flameB], sparks: [], phase: Math.random() * Math.PI * 2 };
      if (!ui.perfToggle.checked) {
        for (let i = 0; i < 3; i++) {
          const spark = new THREE.Mesh(shared.sparkGeom, shared.spawnMats.w3Spark);
          spark.position.set(Math.sin(i * 2.2) * 0.18, 0.26 + i * 0.08, Math.cos(i * 2.2) * 0.18);
          spawn.add(spark);
          animData.sparks.push(spark);
        }
      }
      spawnAnim = animData;
    } else if (worldId === 4) {
      const voidCenter = new THREE.Mesh(shared.portalCenterGeom, shared.spawnMats.w4Void);
      const ringA = new THREE.Mesh(shared.ringGeom, shared.spawnMats.w4Ring);
      const ringB = new THREE.Mesh(shared.ringGeom, shared.spawnMats.w4Ring);
      const distortion = new THREE.Mesh(shared.w4DistortionGeom, shared.spawnMats.w4Distortion);
      voidCenter.position.y = 0.12;
      ringA.position.y = 0.21;
      ringA.rotation.x = -Math.PI / 2;
      ringB.position.y = 0.24;
      ringB.rotation.set(-Math.PI / 2 + 0.25, 0.4, 0);
      distortion.position.y = 0.2;
      distortion.rotation.x = -Math.PI / 2;
      distortion.renderOrder = 2;
      spawn.add(voidCenter, ringA, ringB, distortion);
      spawnAnim = { type: 'blackHole', rings: [ringA, ringB], distortion, phase: Math.random() * Math.PI * 2 };
    } else {
      const baseRock = new THREE.Mesh(shared.spawnBaseGeom, shared.spawnMats.w1Rock);
      baseRock.position.y = 0.03;
      const caveMouth = new THREE.Mesh(shared.spawnHoleGeom, shared.spawnMats.w1Cave);
      caveMouth.position.y = 0.12;
      spawn.add(baseRock, caveMouth);
      for (let i = 0; i < 7; i++) {
        const rock = new THREE.Mesh(shared.rockChunkGeom, shared.spawnMats.w1Rock);
        const a = (i / 7) * Math.PI * 2;
        const radius = i % 2 === 0 ? 0.37 : 0.48;
        rock.position.set(Math.sin(a) * radius, 0.15 + (i % 3) * 0.04, Math.cos(a) * radius);
        rock.rotation.set(a * 0.2, a, -a * 0.1);
        rock.scale.set(0.8 + (i % 3) * 0.22, 0.9 + (i % 2) * 0.16, 0.9 + (i % 2) * 0.14);
        spawn.add(rock);
      }
      const rim = new THREE.Mesh(shared.w1RimGeom, shared.spawnMats.w1Rim);
      rim.rotation.x = -Math.PI / 2;
      rim.position.y = 0.14;
      spawn.add(rim);
    }
    const startPos = toWorld(path[0][0], path[0][1]);
    spawn.position.copy(startPos).setY(startPos.y + 0.05);
    spawn.rotation.y = yawFromDirection(getPathDirection(path, true));
    spawn.userData = { kind: 'spawnPoint', worldId, levelId, spawnAnim };
    spawn.traverse(obj => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
    return spawn;
  }

  function updateSpawn(spawn, dt, now) {
    const anim = spawn?.userData?.spawnAnim;
    if (!anim) return;
    if (anim.type === 'fire') {
      const t = now * 0.006 + anim.phase;
      anim.flames.forEach((flame, idx) => {
        const flicker = 0.88 + Math.sin(t * (1.8 + idx * 0.35)) * 0.16;
        flame.scale.set(1, flicker, 1);
      });
      if (anim.sparks?.length) {
        anim.sparks.forEach((spark, idx) => {
          const s = now * 0.002 + idx * 2;
          spark.position.x = Math.sin(s) * 0.16;
          spark.position.z = Math.cos(s * 1.1) * 0.14;
          spark.position.y = 0.26 + Math.abs(Math.sin(s * 1.8)) * 0.18;
        });
      }
    } else if (anim.type === 'blackHole') {
      anim.rings[0].rotation.z += dt * 0.9;
      anim.rings[1].rotation.z -= dt * 0.65;
      anim.distortion.material.opacity = 0.07 + Math.sin(now * 0.0025 + anim.phase) * 0.03;
    } else if (anim.type === 'iceMist') {
      anim.mist.material.opacity = 0.1 + Math.sin(now * 0.002 + anim.phase) * 0.04;
      anim.mist.scale.setScalar(1 + Math.sin(now * 0.0016 + anim.phase) * 0.05);
    }
  }

  function createCastle(worldId, levelId, path, toWorld) {
    if (!Array.isArray(path) || !path.length) return null;
    const castle = new Castle();
    castle.setLevel({ worldId, levelId }).setState('idle');
    const endCell = path[path.length - 1];
    const endPos = toWorld(endCell[0], endCell[1]);
    castle.group.position.copy(endPos).setY(endPos.y + 0.04);
    castle.group.rotation.y = yawFromDirection(getPathDirection(path, false));
    castle.group.userData = { kind: 'castleGoal', worldId, levelId, entity: castle };
    return castle;
  }

  return { createSpawnPoint, createCastle, updateSpawn, applyCastlePartCustomization(partId, partConfig) {
    const castle = objectiveEntities.castle;
    if (!castle?.applyPartCustomization) return false;
    return castle.applyPartCustomization(partId, partConfig);
  } };
})();

const objectiveEntities = { spawnPoint: null, castle: null };

function syncObjectiveVisuals(worldId, levelId) {
  objectiveEntities.spawnPoint?.removeFromParent();
  objectiveEntities.castle?.group?.removeFromParent();
  objectiveEntities.spawnPoint = objectiveVisuals.createSpawnPoint(worldId, levelId, board.path, cellToWorld);
  objectiveEntities.castle = objectiveVisuals.createCastle(worldId, levelId, board.path, cellToWorld);
  if (objectiveEntities.spawnPoint) world.add(objectiveEntities.spawnPoint);
  if (objectiveEntities.castle?.group) world.add(objectiveEntities.castle.group);
  applyCastleColorsToModel();
}

const terrain = buildTerrain();
world.add(terrain);
buildPath();
syncObjectiveVisuals(1, 1);

const ghost = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.25, 10), new THREE.MeshStandardMaterial({ color: 0x57ffa3, transparent: true, opacity: 0.45 }));
ghost.visible = false;
const hoverTile = new THREE.Mesh(new THREE.BoxGeometry(board.tile * 0.94, 0.04, board.tile * 0.94), new THREE.MeshStandardMaterial({ color: 0x57ffa3, emissive: 0x1a5f3f, emissiveIntensity: 0.35, transparent: true, opacity: 0.4 }));
hoverTile.visible = false;
const rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.03, 48), new THREE.MeshBasicMaterial({ color: 0x57ffa3, transparent: true, opacity: 0.34, side: THREE.DoubleSide }));
rangeRing.rotation.x = -Math.PI / 2;
rangeRing.visible = false;
const blockedCross = new THREE.Group();
const crossMat = new THREE.MeshBasicMaterial({ color: 0xff667a, transparent: true, opacity: 0.75 });
const crossA = new THREE.Mesh(new THREE.BoxGeometry(board.tile * 0.66, 0.028, 0.08), crossMat);
const crossB = crossA.clone();
crossA.rotation.y = Math.PI / 4;
crossB.rotation.y = -Math.PI / 4;
blockedCross.add(crossA, crossB);
blockedCross.visible = false;
const boardPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(board.w * board.tile, board.h * board.tile),
  new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
);
boardPlane.rotation.x = -Math.PI / 2;
boardPlane.position.set(0, GROUND_Y + 0.18, board.h * board.tile * 0.5 - board.tile * 0.5);
world.add(boardPlane, ghost, hoverTile, rangeRing, blockedCross);

const buildPads = new Map();
const obstacleCells = new Map();
const BUILD_PAD_COLORS = {
  free: 0x385844,
  occupied: 0x364047,
  hoverValid: 0x67e9a8,
  hoverInvalid: 0xff7e8e
};
const BUILD_TAP_MOVE_PX = Math.min(34, Math.max(28, Math.round((window.devicePixelRatio || 1) * 16)));
const TAP_MAX_MS = 320;
const PAN_MULT = 0.00465;
const PINCH_MULT = 0.0057;
let hoverVisualState = { valid: true, pulse: 0 };

buildBuildZonePads();
buildEnvironmentProps();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let last = performance.now();
let lastTapAt = 0;

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


function getSelectedCampaignDef() {
  const worldId = Number(state.campaign.selectedWorld) || 1;
  const levelId = Number(state.campaign.selectedLevel) || 1;
  return campaignDefs.find(d => d.world === worldId && d.levelInWorld === levelId) || campaignDefs[0];
}


function getLevelKey() {
  const w = Number(state.campaign.selectedWorld) || 1;
  const l = Number(state.campaign.selectedLevel) || 1;
  return `${w}-${l}`;
}

function getClearedObstacleSet() {
  const key = getLevelKey();
  const arr = state.campaign.clearedObstacles[key] || [];
  return new Set(arr);
}

function saveClearedObstacleCell(cellKey) {
  const levelKey = getLevelKey();
  const cur = new Set(state.campaign.clearedObstacles[levelKey] || []);
  cur.add(cellKey);
  state.campaign.clearedObstacles[levelKey] = [...cur];
  saveCampaign();
}

function hpGradientColor(ratio) {
  const r = clamp(Number.isFinite(ratio) ? ratio : 1, 0, 1);
  const c = new THREE.Color();
  if (r <= 0.5) {
    c.lerpColors(new THREE.Color(0xff4040), new THREE.Color(0xffd447), r / 0.5);
  } else {
    c.lerpColors(new THREE.Color(0xffd447), new THREE.Color(0x4ee56f), (r - 0.5) / 0.5);
  }
  return c.getHex();
}

function getSafeHpRatio(hp, maxHp) {
  const hpValue = Number(hp);
  const maxValue = Number(maxHp);
  if (!Number.isFinite(maxValue) || maxValue <= 0) return 1;
  const rawRatio = hpValue / maxValue;
  if (!Number.isFinite(rawRatio)) return 1;
  return clamp(rawRatio, 0, 1);
}

function updateBarFill(fillMesh, ratio, width) {
  fillMesh.scale.x = Math.max(0.001, ratio);
  fillMesh.position.x = -width * 0.5;
}

function updateEnemyHealthBarVisual(enemy, force = false) {
  if (!enemy?.healthBar) return;
  const hpRatio = getSafeHpRatio(enemy.hp, enemy.maxHp);
  const shieldRatio = enemy.maxShield > 0 ? getSafeHpRatio(enemy.shield, enemy.maxShield) : 0;
  const visual = enemy.healthBar.userData;
  const hpChanged = force || Math.abs((visual.lastHpRatio ?? -1) - hpRatio) > 0.0005;
  const shieldChanged = force || Math.abs((visual.lastShieldRatio ?? -1) - shieldRatio) > 0.0005;
  if (hpChanged) {
    updateBarFill(visual.fill, hpRatio, visual.fillWidth);
    visual.fill.material.color.setHex(hpGradientColor(hpRatio));
    visual.lastHpRatio = hpRatio;
  }
  if (enemy.maxShield > 0) {
    visual.shield.visible = shieldRatio > 0;
    if (shieldChanged) {
      updateBarFill(visual.shield, shieldRatio, visual.fillWidth);
      visual.lastShieldRatio = shieldRatio;
    }
  } else {
    visual.shield.visible = false;
  }
}

function emitParticleBurst(base, cfg = {}) {
  const quality = ui.perfToggle.checked ? 0.55 : 1;
  const enemies = state.enemies.length;
  const lod = enemies > 45 ? 0.42 : enemies > 28 ? 0.62 : 1;
  const count = Math.min((cfg.count || 8), Math.max(2, Math.floor((cfg.count || 8) * quality * lod)));
  if (state.particlesFrame > state.maxParticlesFrame) return;
  for (let i = 0; i < count; i++) {
    if (state.particlesFrame > state.maxParticlesFrame) break;
    const particle = state.pools.particles.pop() || { mesh: new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffb78a, transparent: true, opacity: 0.9 })), vel: new THREE.Vector3(), life: 0 };
    particle.mesh.visible = true;
    if (!particle.mesh.parent) world.add(particle.mesh);
    particle.mesh.position.copy(base).add(new THREE.Vector3((Math.random()-0.5)*0.12, cfg.y || 0.2, (Math.random()-0.5)*0.12));
    const spread = cfg.spread || 2.8;
    particle.vel.set((Math.random() - 0.5) * spread, (cfg.up || 1.5) + Math.random() * spread * 0.35, (Math.random() - 0.5) * spread);
    particle.life = (cfg.life || 0.35) + Math.random() * 0.24;
    particle.mesh.material.color.setHex(cfg.color || 0xffb78a);
    state.effects.push({ kind: 'particle', particle });
    state.particlesFrame++;
  }
}

function spawnImpactFx(position, damageType = 'kinetic') {
  const map = {
    kinetic: { flash: 0xffdeb3, particle: 0xffb474, count: 7, ring: 0xffcaa2 },
    ice: { flash: 0xc8f1ff, particle: 0x9fe8ff, count: 8, ring: 0xbcefff },
    arc: { flash: 0xe1c4ff, particle: 0xaf8dff, count: 9, ring: 0xd4bbff },
    explosive: { flash: 0xffb680, particle: 0xff8f5f, count: 10, ring: 0xffa171 },
    beam: { flash: 0xfff4e5, particle: 0xffd9c6, count: 6, ring: 0xffe4cf }
  };
  const cfg = map[damageType] || map.kinetic;
  state.effects.push({ pos: position.clone(), life: 0.24, color: cfg.flash, radius: 1.1 });
  emitParticleBurst(position, { color: cfg.particle, count: cfg.count, spread: 2.4, life: 0.28, y: 0.2 });
  const shock = state.pools.shockwaves.pop() || new THREE.Mesh(new THREE.RingGeometry(0.2, 0.24, 26), new THREE.MeshBasicMaterial({ color: cfg.ring, transparent: true, opacity: 0.68, side: THREE.DoubleSide, depthWrite: false }));
  shock.visible = true;
  shock.rotation.x = -Math.PI / 2;
  shock.position.copy(position).setY(GROUND_Y + 0.08);
  if (!shock.parent) world.add(shock);
  state.effects.push({ kind: 'shockwave', mesh: shock, life: 0.24, maxLife: 0.24 });
}
function setBoardPath(path) {
  board.path = [...path];
  pathCellSet = new Set(board.path.map(([x, z]) => `${x},${z}`));
}

function applyWorldTheme(worldId) {
  const theme = worldThemes[worldId] || worldThemes[1];
  scene.background = new THREE.Color(theme.bg);
  scene.fog = new THREE.Fog(theme.fog, 38, theme.fogFar || (worldId === 4 ? 105 : 130));
  if (terrain?.material) {
    terrain.material.color.setHex(0xffffff);
    if (terrain.material.map) terrain.material.map.dispose();
    terrain.material.map = createTerrainTexture(theme);
    terrain.material.roughness = 0.97;
    terrain.material.metalness = 0.01;
    terrain.material.needsUpdate = true;
  }
  sky.material.color.setHex(theme.sky || theme.bg);
  hemi.color.setHex(theme.ambient || 0xd9efff);
  hemi.groundColor.setHex(worldId === 3 ? 0x5e3a2c : 0x6f9269);
  dir.color.setHex(theme.sun || 0xfff5dd);
  dir.intensity = theme.sunIntensity || 1.6;
  rimLight.color.setHex(worldId === 3 ? 0x8cb9ff : 0xa7cdff);
  rimLight.intensity = worldId === 3 ? 0.34 : 0.42;
  fillLight.color.setHex(worldId === 2 ? 0xffe4c7 : 0xffd1a4);
  fillLight.intensity = worldId === 3 ? 0.22 : 0.3;
}

function rebuildWorldForCampaign() {
  const def = getSelectedCampaignDef();
  setBoardPath(worldPaths[def.world][def.levelInWorld]);
  while (world.children.length) world.remove(world.children[0]);
  world.add(terrain);
  buildPath();
  buildEnvironmentProps();
  syncObjectiveVisuals(def.world, def.levelInWorld);
  world.add(boardPlane, ghost, hoverTile, rangeRing, blockedCross);
  buildPads.clear();
  buildBuildZonePads();
  applyWorldTheme(def.world);
}

function rebuildWorldForMode(worldId = 1) {
  const safeWorld = Math.max(1, Math.min(4, Number(worldId) || 1));
  setBoardPath(worldPaths[safeWorld][1]);
  while (world.children.length) world.remove(world.children[0]);
  world.add(terrain);
  buildPath();
  buildEnvironmentProps();
  syncObjectiveVisuals(safeWorld, 1);
  world.add(boardPlane, ghost, hoverTile, rangeRing, blockedCross);
  buildPads.clear();
  buildBuildZonePads();
  applyWorldTheme(safeWorld);
}

function getHeight(x, z) {
  return GROUND_Y;
}

function createBlobShadowTexture(size = 96) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.08, size * 0.5, size * 0.5, size * 0.5);
  gradient.addColorStop(0, 'rgba(12, 10, 16, 0.58)');
  gradient.addColorStop(0.55, 'rgba(10, 9, 14, 0.26)');
  gradient.addColorStop(1, 'rgba(10, 9, 14, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

const blobShadowTexture = createBlobShadowTexture();

function createBlobShadow(radius = 0.7, opacity = 0.34) {
  const material = new THREE.MeshBasicMaterial({
    map: blobShadowTexture,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false,
    toneMapped: false
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = 9;
  return shadow;
}

function createTerrainTexture(theme) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  const data = image.data;
  const base = new THREE.Color(theme.terrain);
  const warm = new THREE.Color(theme.edge || theme.terrain);
  const cool = new THREE.Color(theme.fog || theme.terrain);
  const biomeShift = theme.prop === 'ice' ? new THREE.Color(0xb7dcff) : theme.prop === 'lava' ? new THREE.Color(0xffb078) : new THREE.Color(0xa7d79c);
  const seed = (theme.terrain ^ theme.road) & 1023;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;
      const detailA = Math.sin((nx * 6.0 + seed * 0.0017) * Math.PI * 2) * Math.cos((ny * 6.0 - seed * 0.0011) * Math.PI * 2);
      const detailB = Math.sin((nx * 13.0 + seed * 0.0007) * Math.PI * 2 + Math.cos(ny * Math.PI * 2 * 5.0));
      const detailC = Math.cos((nx + ny) * Math.PI * 2 * 9.0 + seed * 0.003);
      const noise = detailA * 0.5 + detailB * 0.35 + detailC * 0.15;
      const mixAmount = 0.5 + noise * 0.22;
      const color = base.clone().lerp(noise > 0 ? warm : cool, Math.abs(noise) * 0.22).lerp(biomeShift, mixAmount * 0.1);
      const shade = 0.86 + noise * 0.12;
      color.multiplyScalar(shade);
      const idx = (y * size + x) * 4;
      data[idx] = Math.round(color.r * 255);
      data[idx + 1] = Math.round(color.g * 255);
      data[idx + 2] = Math.round(color.b * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.anisotropy = 2;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function buildTerrain() {
  const extra = 14;
  const terrainW = (board.w + extra * 2) * board.tile;
  const terrainH = (board.h + extra * 2) * board.tile;
  const segW = board.w + extra * 2;
  const segH = board.h + extra * 2;
  const geometry = new THREE.PlaneGeometry(terrainW, terrainH, segW, segH);
  const theme = worldThemes[getSelectedCampaignDef().world] || worldThemes[1];
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.97,
    metalness: 0.01,
    map: createTerrainTexture(theme)
  }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  mesh.position.set(0, GROUND_Y - 0.03, board.h * board.tile * 0.5 - board.tile * 0.5);
  return mesh;
}

function createPathStripGeometry(pathCells, width = board.tile * 0.86) {
  const centers = pathCells.map(([x, z]) => cellToWorld(x, z));
  const left = [];
  const right = [];
  const half = width * 0.5;

  for (let i = 0; i < centers.length; i++) {
    const prev = centers[Math.max(0, i - 1)];
    const next = centers[Math.min(centers.length - 1, i + 1)];
    const dir = next.clone().sub(prev);
    dir.y = 0;
    if (dir.lengthSq() < 0.0001) dir.set(0, 0, 1);
    dir.normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(half);
    const c = centers[i];
    left.push(c.clone().add(side).setY(GROUND_Y + 0.082));
    right.push(c.clone().sub(side).setY(GROUND_Y + 0.082));
  }

  const vertices = [];
  const colors = [];
  const indices = [];
  for (let i = 0; i < centers.length; i++) {
    const t = centers.length <= 1 ? 0 : i / (centers.length - 1);
    const edgeFade = 0.76 + Math.sin(t * Math.PI) * 0.18;
    const centerFade = 0.88 + Math.sin(t * Math.PI * 2) * 0.06;
    vertices.push(left[i].x, left[i].y, left[i].z);
    vertices.push(right[i].x, right[i].y, right[i].z);
    colors.push(edgeFade, edgeFade, edgeFade);
    colors.push(centerFade, centerFade, centerFade);
  }

  for (let i = 0; i < centers.length - 1; i++) {
    const idx = i * 2;
    indices.push(idx, idx + 2, idx + 1);
    indices.push(idx + 1, idx + 2, idx + 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function buildPath() {
  const w = getSelectedCampaignDef().world;
  const theme = worldThemes[w] || worldThemes[1];
  const roadMat = new THREE.MeshStandardMaterial({ color: theme.road, roughness: 0.9, metalness: w === 2 ? 0.1 : 0.03, vertexColors: true });
  const edgeMat = new THREE.MeshStandardMaterial({ color: theme.edge, roughness: 0.84, metalness: 0.04, transparent: true, opacity: 0.62 });
  const road = new THREE.Mesh(createPathStripGeometry(board.path, board.tile * 0.9), roadMat);
  const shoulders = new THREE.Mesh(createPathStripGeometry(board.path, board.tile * 1.04), edgeMat);
  shoulders.position.y = -0.004;
  road.receiveShadow = true;
  shoulders.receiveShadow = true;
  world.add(shoulders, road);
}

function buildBuildZonePads() {
  const padGeo = new THREE.CylinderGeometry(board.tile * 0.41, board.tile * 0.44, 0.055, 18);
  const topGeo = new THREE.RingGeometry(board.tile * 0.3, board.tile * 0.41, 24);
  for (let z = 0; z < board.h; z++) {
    for (let x = 0; x < board.w; x++) {
      const key = `${x},${z}`;
      if (pathCellSet.has(key)) continue;
      const p = cellToWorld(x, z);
      const pad = new THREE.Mesh(padGeo, new THREE.MeshStandardMaterial({ color: BUILD_PAD_COLORS.free, roughness: 0.9, metalness: 0.08 }));
      const ring = new THREE.Mesh(topGeo, new THREE.MeshBasicMaterial({ color: 0x8fd6b4, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
      pad.position.copy(p).setY(p.y + 0.038);
      ring.position.copy(p).setY(p.y + 0.072);
      ring.rotation.x = -Math.PI / 2;
      pad.receiveShadow = true;
      buildPads.set(key, { pad, ring });
      world.add(pad, ring);
    }
  }
}

function syncBuildPads() {
  buildPads.forEach((entry, key) => {
    const obstacle = obstacleCells.has(key);
    const occupied = board.blocked.has(key) || obstacle;
    entry.pad.material.color.setHex(obstacle ? 0x4f3e3e : (occupied ? BUILD_PAD_COLORS.occupied : BUILD_PAD_COLORS.free));
    entry.pad.material.emissive?.setHex(occupied ? 0x182129 : 0x13281d);
    entry.ring.material.opacity = occupied ? 0.12 : 0.2;
  });
}

function buildEnvironmentProps() {
  obstacleCells.clear();
  const worldId = getSelectedCampaignDef().world;
  const theme = worldThemes[worldId] || worldThemes[1];
  const cleared = getClearedObstacleSet();
  for (let z = 0; z < board.h; z++) {
    for (let x = 0; x < board.w; x++) {
      const key = `${x},${z}`;
      if (pathCellSet.has(key)) continue;
      const worldPos = cellToWorld(x, z);
      const seed = Math.abs(Math.sin(x * 12.99 + z * 78.23));
      let chance = worldId === 1 ? 0.3 : worldId === 2 ? 0.34 : worldId === 3 ? 0.36 : 0.38;
      const spawn = seed > (1 - chance) || seed < chance * 0.45;
      if (!spawn || cleared.has(key)) continue;
      const obstacle = new THREE.Group();
      obstacle.position.copy(worldPos);
      obstacle.userData = { obstacle: true, cellKey: key, world: worldId, kind: 'rock' };
      if (theme.prop === 'forest' || (theme.prop === 'hybrid' && seed < 0.33)) {
        obstacle.userData.kind = 'tree';
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x4f3b2f, roughness: 0.96 }));
        const crown = new THREE.Mesh(new THREE.ConeGeometry(0.33, 0.78, 8), new THREE.MeshStandardMaterial({ color: 0x3a6543, roughness: 0.9 }));
        trunk.position.y = 0.25; crown.position.y = 0.78;
        obstacle.add(trunk, crown);
      } else if (theme.prop === 'ice' || (theme.prop === 'hybrid' && seed < 0.66)) {
        obstacle.userData.kind = 'ice';
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), new THREE.MeshStandardMaterial({ color: 0xaad8ff, emissive: 0x7cc6ff, emissiveIntensity: 0.2, roughness: 0.25, metalness: 0.12 }));
        crystal.position.y = 0.32;
        obstacle.add(crystal);
      } else {
        obstacle.userData.kind = 'lavaRock';
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), new THREE.MeshStandardMaterial({ color: 0x5f3a2a, roughness: 0.75 }));
        const ember = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff8b3d }));
        ember.position.set(0.08, 0.2, -0.05);
        obstacle.add(rock, ember);
      }
      obstacle.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      world.add(obstacle);
      obstacleCells.set(key, obstacle);
    }
  }
}

function makeEnemyMaterial(color, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.48,
    metalness: opts.metalness ?? 0.42,
    emissive: opts.emissive ?? 0x121820,
    emissiveIntensity: opts.emissiveIntensity ?? 0.16,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1
  });
  mat.flatShading = true;
  return mat;
}

function createEnemyMesh(def, boss = false) {
  const g = new THREE.Group();
  const bodyScale = boss ? 1.34 : 1;
  const bodyMat = makeEnemyMaterial(def.color, { roughness: 0.5, metalness: 0.38, emissive: 0x132030, emissiveIntensity: 0.14 });
  const panelMat = makeEnemyMaterial(def.accents || 0xd6e0f3, { roughness: 0.36, metalness: 0.55, emissive: def.accents || 0x8fb5e8, emissiveIntensity: 0.2 });
  const darkMat = makeEnemyMaterial(0x252a36, { roughness: 0.66, metalness: 0.22, emissive: 0x0f1117, emissiveIntensity: 0.08 });
  const coreMat = makeEnemyMaterial(def.accents || 0xaad9ff, { roughness: 0.3, metalness: 0.62, emissive: def.accents || 0xaad9ff, emissiveIntensity: 0.38 });

  if (def.type === 'runner') {
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(def.size * 0.42 * bodyScale, def.size * 0.84 * bodyScale, 4, 8), bodyMat);
    torso.rotation.x = Math.PI * 0.08;
    torso.castShadow = true;
    g.add(torso);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(def.size * 0.52 * bodyScale, def.size * 0.22 * bodyScale, def.size * 0.34 * bodyScale), coreMat);
    visor.position.set(0, def.size * 0.22 * bodyScale, def.size * 0.44 * bodyScale);
    g.add(visor);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(def.size * 0.09 * bodyScale, def.size * 0.11 * bodyScale, def.size * 0.88 * bodyScale, 6), darkMat);
      leg.position.set(side * def.size * 0.2 * bodyScale, -def.size * 0.34 * bodyScale, 0);
      leg.castShadow = true;
      g.add(leg);
      const kneePlate = new THREE.Mesh(new THREE.BoxGeometry(def.size * 0.16 * bodyScale, def.size * 0.12 * bodyScale, def.size * 0.16 * bodyScale), panelMat);
      kneePlate.position.set(side * def.size * 0.2 * bodyScale, -def.size * 0.06 * bodyScale, def.size * 0.16 * bodyScale);
      g.add(kneePlate);
    }
    const rearFin = new THREE.Mesh(new THREE.ConeGeometry(def.size * 0.16 * bodyScale, def.size * 0.5 * bodyScale, 5), panelMat);
    rearFin.position.set(0, def.size * 0.1 * bodyScale, -def.size * 0.52 * bodyScale);
    rearFin.rotation.x = Math.PI;
    g.add(rearFin);
  } else if (def.type === 'tank' || boss) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(def.size * 1.78 * bodyScale, def.size * 0.82 * bodyScale, def.size * 1.55 * bodyScale), bodyMat);
    hull.position.y = def.size * 0.08 * bodyScale;
    hull.castShadow = true;
    g.add(hull);
    const topArmor = new THREE.Mesh(new THREE.BoxGeometry(def.size * 1.3 * bodyScale, def.size * 0.4 * bodyScale, def.size * 1.02 * bodyScale), panelMat);
    topArmor.position.set(0, def.size * 0.46 * bodyScale, -def.size * 0.04 * bodyScale);
    topArmor.castShadow = true;
    g.add(topArmor);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(def.size * 0.32 * bodyScale, 0), coreMat);
    core.position.set(0, def.size * 0.38 * bodyScale, def.size * 0.54 * bodyScale);
    g.add(core);
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(def.size * 0.28 * bodyScale, def.size * 0.08 * bodyScale, def.size * 0.18 * bodyScale), darkMat);
      vent.position.set((i - 1) * def.size * 0.46 * bodyScale, def.size * 0.18 * bodyScale, -def.size * 0.68 * bodyScale);
      g.add(vent);
    }
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const tread = new THREE.Mesh(new THREE.BoxGeometry(def.size * 0.42 * bodyScale, def.size * 0.42 * bodyScale, def.size * 1.46 * bodyScale), darkMat);
      tread.position.set(side * def.size * 0.98 * bodyScale, -def.size * 0.04 * bodyScale, 0);
      tread.castShadow = true;
      g.add(tread);
    }
  } else if (def.type === 'shielded') {
    const chassis = new THREE.Mesh(new THREE.CylinderGeometry(def.size * 0.5 * bodyScale, def.size * 0.64 * bodyScale, def.size * 1.08 * bodyScale, 7), bodyMat);
    chassis.rotation.z = Math.PI / 2;
    chassis.castShadow = true;
    g.add(chassis);
    const face = new THREE.Mesh(new THREE.BoxGeometry(def.size * 0.88 * bodyScale, def.size * 0.6 * bodyScale, def.size * 0.28 * bodyScale), panelMat);
    face.position.set(0, def.size * 0.08 * bodyScale, def.size * 0.5 * bodyScale);
    g.add(face);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(def.size * 0.26 * bodyScale, 0), coreMat);
    core.position.set(0, def.size * 0.16 * bodyScale, def.size * 0.58 * bodyScale);
    g.add(core);
    const backPack = new THREE.Mesh(new THREE.BoxGeometry(def.size * 0.65 * bodyScale, def.size * 0.44 * bodyScale, def.size * 0.5 * bodyScale), darkMat);
    backPack.position.set(0, def.size * 0.1 * bodyScale, -def.size * 0.44 * bodyScale);
    g.add(backPack);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(def.size * 1.38 * bodyScale, 10, 8), makeEnemyMaterial(0x7db6ff, { transparent: true, opacity: 0.18, roughness: 0.16, metalness: 0.14, emissive: 0x7db6ff, emissiveIntensity: 0.42 }));
    shell.name = 'shieldShell';
    g.add(shell);
  } else if (def.flying) {
    const cockpit = new THREE.Mesh(new THREE.OctahedronGeometry(def.size * 0.58 * bodyScale, 0), bodyMat);
    cockpit.castShadow = true;
    g.add(cockpit);
    const sensor = new THREE.Mesh(new THREE.SphereGeometry(def.size * 0.2 * bodyScale, 8, 6), coreMat);
    sensor.position.set(0, 0, def.size * 0.46 * bodyScale);
    g.add(sensor);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(def.size * 0.16 * bodyScale, def.size * 0.06 * bodyScale, def.size * 1.6 * bodyScale), panelMat);
      wing.position.set(side * def.size * 0.58 * bodyScale, 0, 0);
      wing.rotation.x = Math.PI * 0.18;
      g.add(wing);
      const thruster = new THREE.Mesh(new THREE.ConeGeometry(def.size * 0.11 * bodyScale, def.size * 0.4 * bodyScale, 6), darkMat);
      thruster.position.set(side * def.size * 0.48 * bodyScale, -def.size * 0.02 * bodyScale, -def.size * 0.62 * bodyScale);
      thruster.rotation.x = Math.PI;
      g.add(thruster);
    }
  }
  g.traverse(part => { if (part.isMesh) part.castShadow = true; });
  return g;
}

function getHealthBar() {
  const bar = state.pools.healthBars.pop() || (() => {
    const barWidth = 0.9;
    const fillWidth = 0.84;
    const fillHeight = 0.072;
    const root = new THREE.Group();
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x0d1014, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const fillMat = new THREE.MeshBasicMaterial({ color: 0x4ee56f, side: THREE.DoubleSide });
    const shieldMat = new THREE.MeshBasicMaterial({ color: 0x7d8dff, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
    [bgMat, fillMat, shieldMat].forEach(m => {
      m.depthWrite = false;
      m.depthTest = false;
      m.toneMapped = false;
    });
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(barWidth, 0.12), bgMat);
    const fillGeo = new THREE.PlaneGeometry(fillWidth, fillHeight);
    fillGeo.translate(fillWidth * 0.5, 0, 0);
    const fill = new THREE.Mesh(fillGeo, fillMat);
    fill.position.z = 0.04;
    const shieldGeo = new THREE.PlaneGeometry(fillWidth, 0.035);
    shieldGeo.translate(fillWidth * 0.5, 0, 0);
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.position.y = 0.07;
    shield.position.z = 0.06;
    bg.position.z = 0;
    bg.renderOrder = 200;
    fill.renderOrder = 201;
    shield.renderOrder = 202;
    root.frustumCulled = false;
    bg.frustumCulled = false;
    fill.frustumCulled = false;
    shield.frustumCulled = false;
    root.add(bg, fill, shield);
    root.renderOrder = 200;
    root.userData = { fill, shield, fillWidth, lastHpRatio: null, lastShieldRatio: null };
    return root;
  })();
  bar.userData.lastHpRatio = null;
  bar.userData.lastShieldRatio = null;
  bar.visible = true;
  if (!bar.parent) world.add(bar);
  return bar;
}

function releaseHealthBar(bar) {
  if (!bar) return;
  bar.visible = false;
  if (bar.parent) bar.parent.remove(bar);
  state.pools.healthBars.push(bar);
}

function spawnDeathFx(enemy) {
  const pieces = enemy.boss ? 18 : 11;
  const base = enemy.mesh.position.clone();
  for (let i = 0; i < pieces; i++) {
    const frag = state.pools.fragments.pop() || { mesh: new THREE.Mesh(new THREE.TetrahedronGeometry(0.11, 0), new THREE.MeshStandardMaterial({ color: 0xa8b0bc, roughness: 0.8 })), vel: new THREE.Vector3(), life: 0, settleY: null, groundLock: 0 };
    frag.mesh.visible = true;
    if (!frag.mesh.parent) world.add(frag.mesh);
    const sizeJitter = enemy.boss ? (0.8 + Math.random() * 1.3) : (0.65 + Math.random() * 1.05);
    frag.mesh.scale.setScalar(sizeJitter);
    frag.mesh.position.copy(base).add(new THREE.Vector3((Math.random() - 0.5) * 0.35, 0.2 + Math.random() * 0.35, (Math.random() - 0.5) * 0.35));
    frag.vel.set((Math.random() - 0.5) * 3.7, 2.2 + Math.random() * 2.6, (Math.random() - 0.5) * 3.7);
    frag.life = 2.2 + Math.random() * 0.9;
    frag.fadeDuration = 0.9;
    frag.settleY = null;
    frag.groundLock = 0;
    frag.mesh.material.color.setHex(enemy.isFinalBoss ? 0xff5d78 : enemy.def?.color || 0xc7d0db);
    frag.mesh.material.transparent = true;
    frag.mesh.material.opacity = 1;
    state.effects.push({ kind: 'fragment', frag });
  }
  emitParticleBurst(base, { color: enemy.world === 3 ? 0xff8a5f : enemy.world === 2 ? 0xade7ff : 0xffc094, count: enemy.boss ? 16 : 10, spread: enemy.world === 3 ? 3.4 : 2.7, life: 0.42, y: 0.25 });
  for (let i = 0; i < 4; i++) {
    const particle = state.pools.particles.pop() || { mesh: new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffb78a, transparent: true, opacity: 0.9 })), vel: new THREE.Vector3(), life: 0 };
    particle.mesh.visible = true;
    if (!particle.mesh.parent) world.add(particle.mesh);
    particle.mesh.position.copy(base).add(new THREE.Vector3(0, 0.25, 0));
    particle.vel.set((Math.random() - 0.5) * 2.8, 1.2 + Math.random() * 1.5, (Math.random() - 0.5) * 2.8);
    particle.life = 0.34 + Math.random() * 0.26;
    state.effects.push({ kind: 'particle', particle });
  }
  const shock = state.pools.shockwaves.pop() || new THREE.Mesh(new THREE.RingGeometry(0.2, 0.24, 26), new THREE.MeshBasicMaterial({ color: 0xffc6a5, transparent: true, opacity: 0.68, side: THREE.DoubleSide, depthWrite: false }));
  shock.visible = true;
  shock.rotation.x = -Math.PI / 2;
  shock.position.copy(base).setY(GROUND_Y + 0.06);
  if (!shock.parent) world.add(shock);
  state.effects.push({ kind: 'shockwave', mesh: shock, life: 0.42, maxLife: 0.42, radiusScale: 11.25 });
}


function showToast(text, good = true) {
  toastEl.textContent = text;
  toastEl.style.background = good ? '#154926' : '#5a1f2f';
  toastEl.style.borderColor = good ? '#6ccf96' : '#ff7b9a';
  toastEl.classList.add('show');
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => toastEl.classList.remove('show'), 1600);
}


function saveMeta() { localStorage.setItem('aegis-meta', JSON.stringify(state.meta)); }
function saveCampaign() { localStorage.setItem('aegis-campaign', JSON.stringify(state.campaign)); }
function saveUnlocks() { localStorage.setItem('aegis-unlocks', JSON.stringify(state.unlocks)); }

function normalizeColorHex(input, fallback = '#9EA3AB') {
  const candidate = typeof input === 'string' ? input.trim() : '';
  if (/^#[0-9A-Fa-f]{6}$/.test(candidate)) return candidate.toUpperCase();
  return fallback.toUpperCase();
}

function getDefaultCastleCustomization() {
  const parts = {};
  Object.entries(castleParts).forEach(([partId, partDef]) => {
    parts[partId] = {
      color: normalizeColorHex(partDef.defaultColor),
      texture: CASTLE_TEXTURE_PRESETS[partDef.defaultTexture] ? partDef.defaultTexture : 'stone'
    };
  });
  return { version: CASTLE_CUSTOMIZATION_VERSION, parts };
}

function sanitizeCastleColorState() {
  if (!state.campaign || typeof state.campaign !== 'object') state.campaign = {};
  const saved = state.campaign.castleCustomization && typeof state.campaign.castleCustomization === 'object'
    ? state.campaign.castleCustomization
    : { version: CASTLE_CUSTOMIZATION_VERSION, parts: {} };
  const next = getDefaultCastleCustomization();
  next.version = Number(saved.version) || CASTLE_CUSTOMIZATION_VERSION;
  const sourceParts = saved.parts && typeof saved.parts === 'object' ? saved.parts : {};
  Object.entries(castleParts).forEach(([partId, partDef]) => {
    const src = sourceParts[partId] || {};
    next.parts[partId] = {
      color: normalizeColorHex(src.color, partDef.defaultColor),
      texture: CASTLE_TEXTURE_PRESETS[src.texture] ? src.texture : partDef.defaultTexture
    };
  });
  state.campaign.castleCustomization = next;
}


function resolveCastlePartTarget(partId) {
  if (partId?.startsWith('tower_') || partId === 'tower') return ['tower_1', 'tower_2', 'tower_3', 'tower_4'];
  if (partId?.startsWith('roof_') || partId === 'roof') return ['roof_1', 'roof_2', 'roof_3', 'roof_4'];
  return [partId];
}

function getSelectedPartConfig(partId) {
  const defaults = getDefaultCastleCustomization().parts;
  if (partId === 'tower') return state.campaign.castleCustomization.parts.tower_1 || defaults.tower_1;
  if (partId === 'roof') return state.campaign.castleCustomization.parts.roof_1 || defaults.roof_1;
  return state.campaign.castleCustomization.parts[partId] || defaults[partId];
}

function applyCastleColorsToModel() {
  if (!objectiveEntities.castle) return;
  Object.keys(castleParts).forEach(partId => {
    objectiveVisuals.applyCastlePartCustomization(partId, state.campaign.castleCustomization.parts[partId]);
  });
}

function setCastlePartCustomization(partId, colorHex, textureKey) {
  const targets = resolveCastlePartTarget(partId);
  if (!targets.length) return false;
  let applied = false;
  state.campaign.castleCustomization.version = CASTLE_CUSTOMIZATION_VERSION;
  targets.forEach(targetId => {
    const part = castleParts[targetId];
    if (!part) return;
    const current = state.campaign.castleCustomization.parts[targetId] || {};
    const next = {
      color: normalizeColorHex(colorHex || current.color, part.defaultColor),
      texture: CASTLE_TEXTURE_PRESETS[textureKey || current.texture] ? (textureKey || current.texture) : part.defaultTexture
    };
    state.campaign.castleCustomization.parts[targetId] = next;
    applied = objectiveVisuals.applyCastlePartCustomization(targetId, next) || applied;
  });
  saveCampaign();
  return applied;
}

function resetCastleColors() {
  state.campaign.castleCustomization = getDefaultCastleCustomization();
  applyCastleColorsToModel();
  saveCampaign();
}

function randomizeCastleColors() {
  const next = getDefaultCastleCustomization();
  const ids = Object.keys(castleParts);
  ids.forEach((partId, idx) => {
    const base = next.parts[partId];
    base.color = CASTLE_RANDOM_SEQUENCE[idx % CASTLE_RANDOM_SEQUENCE.length];
    base.texture = CASTLE_TEXTURE_KEYS[idx % CASTLE_TEXTURE_KEYS.length];
  });
  state.campaign.castleCustomization = next;
  applyCastleColorsToModel();
  saveCampaign();
}

function getTowerUnlockLevel(key) {
  if (key === 'flame') return 1;
  const idx = towerUnlockOrder.indexOf(key);
  return idx >= 0 ? (idx + 1) * 3 : 1;
}

function getAbilityUnlockLevel(key) {
  const idx = abilityUnlockOrder.indexOf(key);
  return idx >= 0 ? (idx + 1) * 6 : 1;
}

function isAbilityUnlocked(key) {
  return (state.meta.unlockedAbilities || ['freeze']).includes(key);
}

function unlockAbility(key) {
  state.meta.unlockedAbilities = state.meta.unlockedAbilities || ['freeze'];
  if (!state.meta.unlockedAbilities.includes(key)) {
    state.meta.unlockedAbilities.push(key);
  }
}

function syncTowerBuilderUnlock() {
  state.unlocks.towerBuilder = (state.campaign.unlockedLevel || 1) >= TOWER_BUILDER_UNLOCK_LEVEL;
}

function syncProgressUnlocks() {
  syncTowerBuilderUnlock();
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
  state.meta.unlockedTowers = state.meta.unlockedTowers || ['cannon'];
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

function findFrontMostEnemy() {
  let front = null;
  for (const enemy of state.enemies) {
    if (!enemy?.mesh?.parent) continue;
    if (!front || enemy.t > front.t) front = enemy;
  }
  return front;
}

function resetCineCam(forceOverview = true) {
  cam.cine.active = false;
  cam.cine.targetEnemy = null;
  cam.cine.pathProgress = 1;
  cam.cine.camT = 0;
  cam.cine.smoothPos = null;
  cam.cine.smoothLook = null;
  cam.cine.userYawOffset = 0;
  cam.cine.userPitchOffset = 0;
  cam.cine.userDistOffset = 0;
  cam.cine.userPanOffset.set(0, 0);
  ui.cineCamBtn?.classList.remove('active');
  if (forceOverview) unifiedOverview(true);
}

function enableCineCam() {
  cam.cine.active = true;
  cam.transitioning = null;
  cam.cine.targetEnemy = null;
  cam.cine.travelStart = performance.now();
  cam.cine.pathProgress = 1;
  cam.cine.camT = clamp((findFrontMostEnemy()?.t ?? 0) + cam.cine.followOffsetT, 0, 1);
  cam.cine.smoothPos = camera.position.clone();
  const look = new THREE.Vector3();
  camera.getWorldDirection(look);
  cam.cine.smoothLook = camera.position.clone().add(look.multiplyScalar(8));
  cam.cine.baseYaw = cam.yaw;
  cam.cine.basePitch = cam.pitch;
  cam.cine.baseDist = cam.dist;
  cam.cine.baselineTarget.copy(cam.target);
  ui.cineCamBtn?.classList.add('active');
}

function buildMeta() {
  if (!state.meta || typeof state.meta !== 'object') state.meta = { upgradePoints: 5, unlockedTowers: ['cannon'], unlockedAbilities: ['freeze'] };
  state.meta.upgradePoints = state.meta.upgradePoints || 0;
  state.meta.unlockedTowers = state.meta.unlockedTowers || ['cannon'];
  ui.upgradePointsLabel.textContent = `Upgrade-Punkte: ${state.meta.upgradePoints}`;
  ui.metaTree.innerHTML = '';
  for (const m of metaDefs) {
    const lvl = state.meta[m.key] || 0;
    const cost = 2 + lvl;
    const valueCur = m.key === 'econ' ? `${lvl * m.perLevel} Credits` : `+${lvl * m.perLevel}${m.unit}`;
    const valueNextRaw = lvl + 1;
    const valueNext = m.key === 'econ' ? `${valueNextRaw * m.perLevel} Credits` : `+${valueNextRaw * m.perLevel}${m.unit}`;
    const reqText = m.key === 'econ' ? 'Freischaltung: Level 1 abschließen' : `Freischaltung: Level ${getTowerUnlockLevel(m.tower)} abschließen`;
    const btn = document.createElement('button');
    btn.innerHTML = `<strong>${m.icon} ${m.name}</strong><br><small>${m.affects}</small><br><small>${valueCur} → ${valueNext} · Kosten ${cost}</small><br><small>${reqText}</small>`;
    btn.disabled = state.meta.upgradePoints < cost;
    btn.onclick = () => {
      if ((state.meta.upgradePoints || 0) < cost) return;
      state.meta.upgradePoints -= cost;
      state.meta[m.key] = (state.meta[m.key] || 0) + 1;
      saveMeta();
      buildMeta();
    };
    ui.metaTree.appendChild(btn);
  }
}

function validateCampaignDefinitions() {
  if (!Array.isArray(campaignDefs) || campaignDefs.length !== 24) throw new Error(`campaignDefs invalid count: ${campaignDefs?.length || 0}`);
  for (let world = 1; world <= 4; world++) {
    const defs = campaignDefs.filter(d => d.world === world);
    if (defs.length !== 6) throw new Error(`World ${world} expected 6 levels, got ${defs.length}`);
    defs.forEach((def, idx) => {
      const expectedLevel = (world - 1) * 6 + idx + 1;
      if (!def || def.level !== expectedLevel || def.levelInWorld !== idx + 1 || !def.recommendedTowers) {
        throw new Error(`World ${world} has invalid level metadata at slot ${idx + 1}`);
      }
    });
  }
}

function sanitizeCampaignState() {
  if (!state.campaign || typeof state.campaign !== 'object') state.campaign = {};
  if (!state.campaign.completed || typeof state.campaign.completed !== 'object') state.campaign.completed = {};
  if (!state.campaign.clearedObstacles || typeof state.campaign.clearedObstacles !== 'object') state.campaign.clearedObstacles = {};
  state.campaign.selectedWorld = Math.max(1, Math.min(4, Number(state.campaign.selectedWorld) || 1));
  state.campaign.selectedLevel = Math.max(1, Math.min(6, Number(state.campaign.selectedLevel) || 1));
  state.campaign.unlockedLevel = Math.max(1, Math.min(24, Number(state.campaign.unlockedLevel) || 1));
  sanitizeCastleColorState();
}

function setCampaignSelectionToLatestPlayable() {
  const latestPlayable = Math.max(1, Math.min(24, Number(state.campaign.unlockedLevel) || 1));
  state.campaign.selectedWorld = Math.floor((latestPlayable - 1) / 6) + 1;
  state.campaign.selectedLevel = ((latestPlayable - 1) % 6) + 1;
}

function isWorldUnlockedByCampaign(worldId) {
  const safeWorld = Math.max(1, Math.min(4, Number(worldId) || 1));
  return safeWorld === 1 || !!state.campaign.completed[(safeWorld - 1) * 6];
}

function getHighestUnlockedWorld() {
  for (let worldId = 4; worldId >= 1; worldId--) {
    if (isWorldUnlockedByCampaign(worldId)) return worldId;
  }
  return 1;
}

function buildCampaignMenu() {
  const selWorld = state.campaign.selectedWorld || 1;
  ui.campaignWorldSelect.innerHTML = '';
  for (let world = 1; world <= 4; world++) {
    const unlocked = isWorldUnlockedByCampaign(world);
    const b = document.createElement('button');
    b.disabled = !unlocked;
    b.textContent = unlocked ? WORLD_MENU_LABELS[world] : `World ${world} (Gesperrt · Schließe World ${world-1} ab)`;
    b.className = 'levelBtn' + (world === selWorld ? ' active' : '');
    b.onclick = () => { state.campaign.selectedWorld = world; state.campaign.selectedLevel = 1; saveCampaign(); buildCampaignMenu(); };
    ui.campaignWorldSelect.appendChild(b);
  }
  ui.campaignLevelSelect.innerHTML = '';
  for (let lvl = 1; lvl <= 6; lvl++) {
    const abs = (selWorld - 1) * 6 + lvl;
    const completed = !!state.campaign.completed[abs];
    const unlocked = abs <= (state.campaign.unlockedLevel || 1) && (selWorld === 1 || !!state.campaign.completed[(selWorld - 1) * 6]);
    const def = campaignDefs[abs - 1];
    const btn = document.createElement('button');
    btn.className = 'levelBtn';
    btn.disabled = !unlocked;
    btn.innerHTML = `L${lvl}<br><small>${completed ? 'Abgeschlossen' : unlocked ? 'Freigeschaltet' : (lvl===1 ? `Schließe World ${selWorld-1} ab` : 'Schließe vorheriges Level ab')}</small><br><small>Empf. Türme: ${def.recommendedTowers}</small>`;
    btn.onclick = () => { state.campaign.selectedWorld = selWorld; state.campaign.selectedLevel = lvl; saveCampaign(); buildCampaignMenu(); };
    if (state.campaign.selectedLevel === lvl) btn.classList.add('active');
    ui.campaignLevelSelect.appendChild(btn);
  }
  ui.finalBossUnlock.textContent = state.campaign.finalBossUnlocked ? 'Final Boss Unlocked: Defeat the Apex Enemy' : 'Final Boss gesperrt: Schließe alle 24 Kampagnenlevel ab';
  ui.playFinalBoss.classList.toggle('hidden', !state.campaign.finalBossUnlocked);
  const towerRows = Object.keys(towerDefs).map(k => {
    const unlockLevel = getTowerUnlockLevel(k);
    const status = isTowerUnlocked(k) ? 'Freigeschaltet' : 'Gesperrt';
    return `<div>${towerDefs[k].icon} ${towerDefs[k].name} — ${status} · ab Level ${unlockLevel}</div>`;
  });
  const abilityRows = Object.keys(abilities).map(k => {
    const unlockLevel = getAbilityUnlockLevel(k);
    const status = isAbilityUnlocked(k) ? 'Freigeschaltet' : 'Gesperrt';
    return `<div>${abilities[k].icon} ${abilities[k].name} — ${status} · ab Level ${unlockLevel}</div>`;
  });
  const builderStatus = isTowerBuilderUnlocked() ? 'Freigeschaltet' : 'Gesperrt';
  const builderRow = `<div>🧩 Turm-Editor — ${builderStatus} · ab Level ${TOWER_BUILDER_UNLOCK_LEVEL}</div>`;
  ui.unlockList.innerHTML = [
    '<div><strong>Waffen</strong></div>',
    ...towerRows,
    '<div><strong>Power-ups</strong></div>',
    ...abilityRows,
    '<div><strong>Spezial</strong></div>',
    builderRow
  ].join('');
}

function buildModeWorldSelect(container, modeKey) {
  if (!container) return;
  const highestUnlockedWorld = getHighestUnlockedWorld();
  state[`${modeKey}World`] = Math.max(1, Math.min(highestUnlockedWorld, Number(state[`${modeKey}World`]) || 1));
  container.innerHTML = '';
  for (let worldId = 1; worldId <= 4; worldId++) {
    const btn = document.createElement('button');
    const unlocked = isWorldUnlockedByCampaign(worldId);
    const active = (state[`${modeKey}World`] || 1) === worldId;
    btn.className = 'levelBtn' + (active ? ' active' : '');
    btn.disabled = !unlocked;
    btn.textContent = unlocked ? WORLD_MENU_LABELS[worldId] : `World ${worldId} (Gesperrt · Kampagne abschließen)`;
    btn.onclick = () => {
      if (!unlocked) return;
      state[`${modeKey}World`] = worldId;
      buildModeWorldSelect(container, modeKey);
    };
    container.appendChild(btn);
  }
}

function showPage(pageName) {
  activeMenuPage = pageName;
  menuPages.forEach(page => page.classList.toggle('hidden', page.dataset.page !== pageName));
  if (pageName === 'campaign') buildCampaignMenu();
  if (pageName === 'endless') buildModeWorldSelect(ui.endlessWorldSelect, 'endless');
  if (pageName === 'challenge') buildModeWorldSelect(ui.challengeWorldSelect, 'challenge');
  if (pageName === 'castle') {
    const current = getSelectedPartConfig(state.selectedCastlePart);
    state.selectedCastleColor = current.color;
    state.selectedCastleTexture = current.texture;
    buildCastlePalette();
    buildCastleTextureList();
    updateCastlePartList();
    updateCastleSelectionText();
    initCastlePreview();
    syncPreviewFromSave();
  }
}


function sortedSignature(mods) {
  return [...mods].sort().join('+');
}

function countMap(mods) {
  return mods.reduce((acc, m) => (acc[m] = (acc[m] || 0) + 1, acc), {});
}

function generateBuildName(mods) {
  const map = countMap(mods);
  const parts = Object.entries(map).sort((a, b) => b[1] - a[1]).map(([k, c]) => `${builderModules[k].name}${c > 1 ? ' x' + c : ''}`);
  return parts.join(' / ') + '-Array';
}

function buildConfigFromModules(mods) {
  const map = countMap(mods);
  const count = mods.length;
  const base = { damage: 12, range: 5.4, rate: 0.72, slow: 0, freezeChance: 0, burn: 0, chain: 0, chainRange: 0, aoe: 0, pierce: 0, knockback: 0, pulse: 0, shatter: 0, shock: 0 };
  mods.forEach(m => {
    const def = builderModules[m];
    base.damage *= def.dmg;
    base.range += def.range;
    base.rate += def.cd;
  });
  if (map.cryo) { base.slow = Math.min(0.72, 0.2 + map.cryo * 0.14); base.freezeChance = Math.min(0.75, 0.08 + map.cryo * 0.12); }
  if (map.arc) { base.chain = map.arc; base.chainRange = 1.5 + map.arc * 0.6; base.shock = 0.2 + map.arc * 0.1; }
  if (map.explosive) { base.aoe = 1.5 + map.explosive * 0.55; base.knockback = 0.12 + map.explosive * 0.13; }
  if (map.beam) { base.pierce = map.beam; base.damage += map.beam * 2.5; }
  if (map.kinetic) base.damage += map.kinetic * 1.8;

  const sig = sortedSignature(mods);
  const effects = [];
  if (map.cryo >= 2) effects.push('Tieffrost-Aufbau');
  if (map.arc >= 2) effects.push('Zusätzliche Kettenverbindungen');
  if (map.explosive >= 2) effects.push('Sekundäre Explosionssplitter');
  if (map.beam >= 2) effects.push('Panzerungsdurchschlag-Kritspur');
  if (sig.includes('arc+cryo')) { base.freezeChance += 0.08; base.shock += 0.1; effects.push('Leitfähige Vereisung'); }
  if (sig.includes('cryo+explosive')) { base.shatter = 0.45; effects.push('Splitterexplosion gegen Gefrorene'); }
  if (sig.includes('arc+explosive')) { base.chain += 1; effects.push('Elektroausbruch aus dem Explosionszentrum'); }
  if (sig.includes('arc+beam')) { base.pulse = 0.22; effects.push('Strahl-Kettenimpuls'); }
  if (sig.includes('beam+cryo')) { base.slow += 0.12; effects.push('Stapelnder Kältestrahl'); }

  const moduleCost = mods.reduce((a, m) => a + builderModules[m].cost, 0);
  let duplicatePremium = 0;
  Object.values(map).forEach(c => { if (c > 1) duplicatePremium += c * c * 7; });
  const synergyTier = count >= 3 ? 1 + (count - 2) * 0.14 : 1;
  const synergyPremium = Math.round((effects.length + base.chain + base.pierce) * 6);
  const cost = Math.round((56 + moduleCost + duplicatePremium + synergyPremium) * synergyTier);
  return { mods: [...mods], map, count, name: generateBuildName(mods), cost, stats: base, effects, signature: sig };
}

function isTowerBuilderUnlocked() {
  return !!state.unlocks.towerBuilder;
}

function renderBuilderUI() {
  ui.builderModules.innerHTML = '';
  moduleKeys.forEach(k => {
    const m = builderModules[k];
    const b = document.createElement('button');
    b.className = 'builderModuleBtn';
    b.innerHTML = `<strong>${m.icon} ${m.name}</strong><span>${m.effects}</span>`;
    b.onclick = () => {
      if (state.builderDraft.length >= 5) return showToast('Maximal 5 Module', false);
      state.builderDraft.push(k);
      updateBuilderPreview();
    };
    ui.builderModules.appendChild(b);
  });
  renderSavedBuilds();
  updateBuilderPreview();
}

function renderSavedBuilds() {
  ui.savedBuilds.innerHTML = '<strong>Gespeicherte Builds (5 Plätze)</strong>';
  for (let i = 0; i < 5; i++) {
    const row = document.createElement('div');
    row.className = 'savedBuildRow';
    const entry = state.meta.savedBuilds[i];
    row.innerHTML = `<span>${entry ? `${entry.name} · ${entry.cost}¢` : `Platz ${i + 1} leer`}</span>`;
    const load = document.createElement('button');
    load.textContent = entry ? 'Laden' : 'Speichern';
    load.onclick = () => {
      if (entry) state.builderDraft = [...entry.mods];
      else {
        if (state.builderDraft.length < 2) return showToast('Zuerst mindestens 2 Module wählen', false);
        const cfg = buildConfigFromModules(state.builderDraft);
        state.meta.savedBuilds[i] = { name: cfg.name, mods: [...cfg.mods], cost: cfg.cost };
        saveMeta();
      }
      updateBuilderPreview();
      renderSavedBuilds();
    };
    const actions = document.createElement('div');
    actions.className = 'savedBuildActions';
    actions.appendChild(load);
    if (entry) {
      const remove = document.createElement('button');
      remove.textContent = 'Löschen';
      remove.onclick = () => {
        state.meta.savedBuilds[i] = null;
        saveMeta();
        renderSavedBuilds();
      };
      actions.appendChild(remove);
    }
    row.appendChild(actions);
    ui.savedBuilds.appendChild(row);
  }
}

function updateBuilderPreview() {
  ui.builderSlots.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const slot = document.createElement('button');
    slot.className = 'builderSlot' + (state.builderDraft[i] ? ' filled' : '');
    slot.textContent = state.builderDraft[i] ? builderModules[state.builderDraft[i]].icon : '+';
    slot.onclick = () => {
      if (i < state.builderDraft.length) {
        state.builderDraft.splice(i, 1);
        updateBuilderPreview();
      }
    };
    ui.builderSlots.appendChild(slot);
  }
  if (state.builderDraft.length < 2) {
    ui.builderPreview.innerHTML = 'Wähle 2–5 Module, um einen benutzerdefinierten Turm zu erzeugen. Duplikate sind erlaubt und stärker, kosten aber mehr.';
    return;
  }
  const cfg = buildConfigFromModules(state.builderDraft);
  ui.builderPreview.innerHTML = `<strong>${cfg.name}</strong><br>Kosten: ${cfg.cost}¢<br>DMG ${cfg.stats.damage.toFixed(1)} | RNG ${cfg.stats.range.toFixed(1)} | CD ${Math.max(0.16, cfg.stats.rate).toFixed(2)}<br>Effekte: ${cfg.effects.join(', ') || 'Keine besondere Synergie'}`;
}

function openBuilder() {
  state.builderDraft = state.activeBuild ? [...state.activeBuild.mods] : [];
  renderBuilderUI();
  ui.towerBuilderModal.classList.remove('hidden');
}

function closeBuilder() {
  ui.towerBuilderModal.classList.add('hidden');
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
  if (isTowerBuilderUnlocked()) {
    const custom = document.createElement('button');
    custom.className = 'dockBtn';
    custom.innerHTML = '🧩';
    custom.title = state.activeBuild ? `${state.activeBuild.name} · ${state.activeBuild.cost}¢` : 'Eigenes Build erstellen';
    custom.onclick = () => openBuilder();
    custom.id = 'dock-custom';
    ui.towerDock.appendChild(custom);
  }

}

function updateDock() {
  Object.keys(towerDefs).forEach(key => {
    const el = document.getElementById(`dock-${key}`);
    if (!el) return;
    el.classList.toggle('active', state.selectedTowerType === key && state.buildMode);
    el.classList.toggle('locked', state.money < towerDefs[key].cost || !isTowerUnlocked(key));
  });
  const custom = document.getElementById('dock-custom');
  if (custom) {
    custom.classList.toggle('active', state.selectedTowerType === 'custom' && state.buildMode);
    custom.classList.toggle('locked', !state.activeBuild || state.money < state.activeBuild.cost);
  }
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
  const def = state.mode === 'campaign' ? getSelectedCampaignDef() : null;
  const txt = def ? `${def.waveTheme} · ${worldThemes[def.world].mod}` : (state.wave % 5 === 4 ? '👹 Boss + Eskorte' : 'Mix');
  const levelText = state.mode === 'campaign' ? ` · W${def.world}-L${def.levelInWorld} Welle ${Math.min(state.wave + 1, state.levelWaves)}/${state.levelWaves}` : '';
  ui.wavePreview.textContent = `Nächste Welle: ${txt}${levelText}`;
}

function getDifficultyRamp() {
  const levelProgress = Math.max(0, (Math.min(state.currentLevel || 1, FINAL_BOSS_LEVEL) - 1) / (FINAL_BOSS_LEVEL - 1));
  const baseWaveProgress = Math.max(0, state.wave) / 12;
  const boostedWaveProgress = baseWaveProgress + Math.min(10, Math.max(0, state.wave)) / 12;
  const waveProgress = Math.min(2.1, boostedWaveProgress);
  return {
    count: 2 * (1 + levelProgress * 0.65 + waveProgress * 0.44),
    hp: 2 * (1 + levelProgress * 0.82 + waveProgress * 0.56)
  };
}

function getActiveWorldId() {
  if (state.mode === 'boss') return 4;
  if (state.mode === 'campaign') {
    const cdef = campaignDefs[Math.min(state.currentLevel,24)-1];
    return cdef?.world || 1;
  }
  if (state.mode === 'endless') return Math.max(1, Math.min(getHighestUnlockedWorld(), Number(state.endlessWorld) || 1));
  if (state.mode === 'challenge') return Math.max(1, Math.min(getHighestUnlockedWorld(), Number(state.challengeWorld) || 1));
  return 1;
}

function getWorldDifficultyBoost() {
  return getActiveWorldId() >= 2 ? 2 : 1;
}

function spawnWave() {
  state.wave += 1;
  const ramp = getDifficultyRamp();
  const baseCount = 8 + Math.floor(state.wave * 3.2);
  const count = Math.ceil(baseCount * ramp.count * getWorldDifficultyBoost());
  state.remainingInWave = count;
  state.spawnTimer = 0.2;
  state.inWave = true;
  state.buildPhase = false;
  if (state.wave % 5 === 0) ui.bossWarning.classList.remove('hidden');
  syncProgressUnlocks();
  sanitizeCastleColorState();
  initDock();
  initAbilities();
  refreshWavePreview();
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
  if (state.currentLevel >= 24) state.campaign.finalBossUnlocked = true;
  state.campaign.unlockedLevel = Math.max(state.campaign.unlockedLevel || 1, state.currentLevel + 1);
  syncProgressUnlocks();
  setCampaignSelectionToLatestPlayable();
  saveMeta();
  saveCampaign();
  saveUnlocks();
  ui.levelCompleteSummary.textContent = `World ${(Math.floor((state.currentLevel-1)/6)+1)} Level ${((state.currentLevel-1)%6)+1} abgeschlossen: ${state.levelWaves}/${state.levelWaves} Wellen.`;
  ui.levelRewards.innerHTML = `<div>+${rewards.credits} Credits</div><div>+${rewards.tokens} Upgrade-Punkte</div>${rewards.unlockTower ? `<div>Freigeschalteter Turm: ${towerDefs[rewards.unlockTower].name}</div>` : ''}<div>${state.currentLevel>=24?'Final Boss Mode freigeschaltet!':''}</div>`;
  ui.levelCompleteModal.classList.remove('hidden');
  resetCineCam(false);
  state.paused = true;
  buildCampaignMenu();
  buildMeta();
}

const towerVisuals = (() => {
  const materialPreset = {
    housing: { color: 0x3f4859, roughness: 0.84, metalness: 0.14 },
    metal: { color: 0xd3deee, roughness: 0.48, metalness: 0.7 },
    energy: { roughness: 0.32, metalness: 0.22, emissiveIntensity: 0.34 }
  };

  const sharedMaterials = {
    housing: new THREE.MeshStandardMaterial(materialPreset.housing),
    metal: new THREE.MeshStandardMaterial(materialPreset.metal)
  };

  const detailGeometries = {
    ring: new THREE.TorusGeometry(0.26, 0.03, 8, 14),
    sidePlate: new THREE.BoxGeometry(0.09, 0.18, 0.46),
    sensorCone: new THREE.ConeGeometry(0.06, 0.18, 8),
    sensorStem: new THREE.CylinderGeometry(0.024, 0.024, 0.14, 8)
  };

  function makePreset(energyColor) {
    return {
      housingMaterial: sharedMaterials.housing,
      metalMaterial: sharedMaterials.metal,
      energyMaterial: new THREE.MeshStandardMaterial({
        color: energyColor,
        emissive: energyColor,
        roughness: materialPreset.energy.roughness,
        metalness: materialPreset.energy.metalness,
        emissiveIntensity: materialPreset.energy.emissiveIntensity
      })
    };
  }

  function addDetailSet(baseGroup, headGroup, type, metalMaterial, housingMaterial) {
    const baseRing = new THREE.Mesh(detailGeometries.ring, metalMaterial);
    baseRing.position.set(0, 0.3, 0);
    baseRing.rotation.x = Math.PI / 2;
    baseGroup.add(baseRing);

    const plateOffset = type === 'flame' ? 0.28 : 0.26;
    const leftPlate = new THREE.Mesh(detailGeometries.sidePlate, housingMaterial);
    leftPlate.position.set(-plateOffset, 0.58, 0.12);
    headGroup.add(leftPlate);

    const rightPlate = leftPlate.clone();
    rightPlate.position.x = plateOffset;
    headGroup.add(rightPlate);

    const sensorStem = new THREE.Mesh(detailGeometries.sensorStem, metalMaterial);
    sensorStem.position.set(0, 0.82, -0.1);
    headGroup.add(sensorStem);

    const sensorCone = new THREE.Mesh(detailGeometries.sensorCone, metalMaterial);
    sensorCone.position.set(0, 0.97, -0.1);
    sensorCone.rotation.x = Math.PI;
    headGroup.add(sensorCone);
  }

  return { makePreset, addDetailSet };
})();

function makeTower(type, cell, customCfg = null) {
  const d = customCfg ? {
    name: customCfg.name,
    color: 0xb4dcff,
    range: customCfg.stats.range,
    rate: customCfg.stats.rate,
    damage: customCfg.stats.damage,
    projectile: resolveCustomProjectileType(customCfg.stats),
    aoe: customCfg.stats.aoe
  } : towerDefs[type];
  const g = new THREE.Group();
  const baseGroup = new THREE.Group();
  const headGroup = new THREE.Group();
  g.add(baseGroup, headGroup);

  const coreColor = customCfg ? 0xa6d6ff : d.color;
  const mats = towerVisuals.makePreset(coreColor);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 0.55, 14), mats.housingMaterial);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.42, 10), mats.energyMaterial);
  core.position.y = 0.46;
  const barrelGeo = type === 'laser' ? new THREE.CylinderGeometry(0.08, 0.08, 0.9, 10) : type === 'missile' ? new THREE.ConeGeometry(0.13, 0.9, 10) : type === 'cryo' ? new THREE.BoxGeometry(0.12, 0.3, 0.82) : type === 'flame' ? new THREE.TorusGeometry(0.22, 0.06, 8, 16) : new THREE.BoxGeometry(0.16, 0.16, 0.9);
  const barrel = new THREE.Mesh(barrelGeo, mats.metalMaterial);
  barrel.position.set(0, 0.62, 0.22);
  baseGroup.add(base);
  headGroup.add(core, barrel);
  towerVisuals.addDetailSet(baseGroup, headGroup, type, mats.metalMaterial, mats.housingMaterial);

  if (customCfg) {
    const accents = [];
    const addAccent = (geo, color, parent, x, y, z, s = 1) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.22, roughness: 0.44, metalness: 0.5 }));
      m.position.set(x, y, z);
      m.scale.setScalar(s);
      parent.add(m);
      accents.push(m);
    };
    const c = customCfg.map;
    if (c.cryo) addAccent(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8), 0x8de9ff, headGroup, -0.25, 0.55, 0, 1 + c.cryo * 0.15);
    if (c.arc) addAccent(new THREE.ConeGeometry(0.11, 0.34, 6), 0xb388ff, headGroup, 0.26, 0.62, 0.1, 1 + c.arc * 0.12);
    if (c.explosive) addAccent(new THREE.TorusGeometry(0.2, 0.05, 8, 16), 0xffa74f, headGroup, 0, 0.74, 0.25, 1 + c.explosive * 0.14);
    if (c.beam) addAccent(new THREE.SphereGeometry(0.1, 10, 8), 0xffe5ea, headGroup, 0, 0.65, 0.5, 1 + c.beam * 0.1);
    if (c.kinetic) addAccent(new THREE.BoxGeometry(0.35, 0.08, 0.3), 0x9eb1c7, baseGroup, 0, 0.36, -0.1, 1 + c.kinetic * 0.1);
    const tint = new THREE.Color(0x9eb1c7);
    if (c.cryo) tint.lerp(new THREE.Color(0x7fdfff), 0.2);
    if (c.arc) tint.lerp(new THREE.Color(0xa985ff), 0.2);
    if (c.explosive) tint.lerp(new THREE.Color(0xff9f5a), 0.2);
    if (c.beam) tint.lerp(new THREE.Color(0xffd8e0), 0.2);
    core.material.color.copy(tint);
    core.material.emissive.copy(tint);
  }

  const p = cellToWorld(cell[0], cell[1]);
  g.position.copy(p).setY(p.y + 0.3);
  g.castShadow = true;
  const blobShadow = createBlobShadow(0.62, 0.32);
  blobShadow.position.copy(p).setY(GROUND_Y + 0.02);
  world.add(blobShadow);
  world.add(g);
  return { type, cell, level: 1, cooldown: 0, mesh: g, baseGroup, headGroup, barrel, core, branch: 'none', custom: customCfg, displayName: customCfg ? customCfg.name : d.name, blobShadow, pulsePhase: Math.random() * Math.PI * 2 };
}

function spawnEnemy(boss = false) {
  const worldId = getActiveWorldId();
  const keys = Object.keys(enemyArchetypes);
  const archetype = boss ? 'tank' : keys[Math.floor(Math.random() * keys.length)];
  const def = enemyArchetypes[archetype];
  const mesh = createEnemyMesh(def, boss);
  mesh.castShadow = true;
  world.add(mesh);
  const healthBar = getHealthBar();
  const isFinalBoss = state.mode === 'boss' && boss;
  const hpMult = worldId === 4 ? 1.42 : worldId === 3 ? 1.25 : worldId === 2 ? 1.12 : 1;
  const worldBoost = getWorldDifficultyBoost();
  const ramp = getDifficultyRamp();
  const hp = ((isFinalBoss ? 4800 : boss ? 680 : def.hp + state.wave * 18) * hpMult) * (modeRules[state.mode]?.scale || 1.2) * ramp.hp * worldBoost;
  const spd = (isFinalBoss ? 0.4 : boss ? 0.62 : def.speed) + state.wave * 0.024 + (worldId===3 ? 0.08 : 0);
  const frostResist = worldId === 3 ? 0.55 : 0;
  const armor = worldId === 4 ? 0.2 + Math.min(0.4, state.wave * 0.02) : 0;
  const shadowRadius = def.flying ? def.size * 0.92 : def.size * 1.22;
  const blobShadow = createBlobShadow(shadowRadius, def.flying ? 0.22 : 0.34);
  world.add(blobShadow);
  const enemy = {
    mesh,
    healthBar,
    blobShadow,
    def,
    t: 0,
    speed: spd,
    hp,
    maxHp: hp,
    freeze: 0,
    poison: 0,
    archetype,
    boss,
    isFinalBoss,
    shield: (isFinalBoss ? 700 : boss ? 160 : (def.shield || 0) + (worldId>=3?20:0)) * ramp.hp * worldBoost,
    maxShield: (isFinalBoss ? 700 : boss ? 160 : (def.shield || 0) + (worldId>=3?20:0)) * ramp.hp * worldBoost,
    flying: !!def.flying,
    bob: Math.random() * 5,
    world: worldId,
    frostResist,
    armor,
    rage: worldId===4,
    hitFlash: 0,
    deathScale: boss ? 1.4 : 1,
    motionPhase: Math.random() * Math.PI * 2,
    stridePhase: Math.random() * Math.PI * 2,
    settledGroundY: null
  };
  updateEnemyHealthBarVisual(enemy, true);
  return enemy;
}


function getProjectile() {
  const p = state.pools.projectiles.pop() || { mesh: new THREE.Group(), alive: false, kind: null };
  p.mesh.frustumCulled = false;
  p.mesh.visible = true;
  if (!p.mesh.parent) world.add(p.mesh);
  return p;
}

function resolveCustomProjectileType(stats) {
  if (stats.pierce > 0) return 'beam';
  if (stats.aoe > 0) return 'missile';
  if (stats.chain > 0) return 'bolt';
  return 'shell';
}

function logProjectileFire(p, kind) {
  if (!PROJECTILE_FIRE_DEBUG) return;
  const pos = p.mesh.position;
  console.log(`[Projectile] kind=${kind} visible=${p.mesh.visible} parentOK=${p.mesh.parent === world} children=${p.mesh.children.length} pos=(${pos.x.toFixed(2)},${pos.y.toFixed(2)},${pos.z.toFixed(2)})`);
}

const projectileAssetCache = {
  shellGeo: new THREE.SphereGeometry(0.11, 12, 10),
  shellShineGeo: new THREE.SphereGeometry(0.065, 10, 8),
  arrowShaftGeo: new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8),
  arrowHeadGeo: new THREE.ConeGeometry(0.055, 0.15, 8),
  arrowFletchGeo: new THREE.BoxGeometry(0.13, 0.02, 0.08),
  rocketBodyGeo: new THREE.CylinderGeometry(0.045, 0.055, 0.44, 10),
  rocketNoseGeo: new THREE.ConeGeometry(0.055, 0.15, 10),
  rocketFinGeo: new THREE.BoxGeometry(0.03, 0.08, 0.1),
  crystalGeo: new THREE.OctahedronGeometry(0.115, 0),
  flameGeo: new THREE.ConeGeometry(0.09, 0.24, 9),
  glowGeo: new THREE.SphereGeometry(0.1, 10, 8),
  // MeshBasicMaterial keeps projectile visibility stable on iOS WebKit/PWA rendering paths.
  coreMat: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
  accentMat: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
  softGlowMat: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false }),
  iceMat: new THREE.MeshStandardMaterial({ color: 0x9feeff, roughness: 0.14, metalness: 0.08, transparent: true, opacity: 0.94, emissive: 0x76cbff, emissiveIntensity: 0.4 }),
  flameCoreMat: new THREE.MeshBasicMaterial({ color: 0xffe3ab, toneMapped: false }),
  flameOuterMat: new THREE.MeshBasicMaterial({ color: 0xff651f, transparent: true, opacity: 0.62, depthWrite: false, toneMapped: false })
};

function addProjectilePart(group, mesh, name, kind) {
  mesh.name = name;
  mesh.userData.projectileKind = kind;
  mesh.frustumCulled = false;
  group.add(mesh);
}

function configureProjectileMesh(p, kind, colorHex) {
  if (p.kind !== kind) {
    while (p.mesh.children.length) p.mesh.remove(p.mesh.children[0]);
    if (kind === 'shell') {
      addProjectilePart(p.mesh, new THREE.Mesh(projectileAssetCache.shellGeo, projectileAssetCache.coreMat.clone()), 'proj-main', kind);
      addProjectilePart(p.mesh, new THREE.Mesh(projectileAssetCache.shellShineGeo, projectileAssetCache.softGlowMat.clone()), 'proj-highlight', kind);
    } else if (kind === 'bolt') {
      const shaft = new THREE.Mesh(projectileAssetCache.arrowShaftGeo, projectileAssetCache.accentMat.clone());
      shaft.rotation.x = Math.PI / 2;
      addProjectilePart(p.mesh, shaft, 'proj-main', kind);
      const head = new THREE.Mesh(projectileAssetCache.arrowHeadGeo, projectileAssetCache.coreMat.clone());
      head.position.z = 0.24;
      head.rotation.x = Math.PI / 2;
      addProjectilePart(p.mesh, head, 'proj-head', kind);
      const fletch = new THREE.Mesh(projectileAssetCache.arrowFletchGeo, projectileAssetCache.accentMat.clone());
      fletch.position.z = -0.18;
      addProjectilePart(p.mesh, fletch, 'proj-fletch', kind);
    } else if (kind === 'missile') {
      const body = new THREE.Mesh(projectileAssetCache.rocketBodyGeo, projectileAssetCache.coreMat.clone());
      body.rotation.x = Math.PI / 2;
      addProjectilePart(p.mesh, body, 'proj-main', kind);
      const nose = new THREE.Mesh(projectileAssetCache.rocketNoseGeo, projectileAssetCache.accentMat.clone());
      nose.rotation.x = Math.PI / 2;
      nose.position.z = 0.29;
      addProjectilePart(p.mesh, nose, 'proj-head', kind);
      for (const side of [-1, 1]) {
        const fin = new THREE.Mesh(projectileAssetCache.rocketFinGeo, projectileAssetCache.accentMat.clone());
        fin.position.set(0.055 * side, -0.01, -0.12);
        fin.rotation.z = side * 0.34;
        addProjectilePart(p.mesh, fin, `proj-fin-${side}`, kind);
      }
      const glow = new THREE.Mesh(projectileAssetCache.glowGeo, projectileAssetCache.softGlowMat.clone());
      glow.scale.setScalar(1.7);
      addProjectilePart(p.mesh, glow, 'proj-glow', kind);
    } else if (kind === 'ice') {
      addProjectilePart(p.mesh, new THREE.Mesh(projectileAssetCache.crystalGeo, projectileAssetCache.iceMat.clone()), 'proj-main', kind);
    } else if (kind === 'flame') {
      const core = new THREE.Mesh(projectileAssetCache.flameGeo, projectileAssetCache.flameCoreMat.clone());
      core.rotation.x = Math.PI / 2;
      core.position.z = 0.03;
      addProjectilePart(p.mesh, core, 'proj-main', kind);
      const outer = new THREE.Mesh(projectileAssetCache.flameGeo, projectileAssetCache.flameOuterMat.clone());
      outer.rotation.x = Math.PI / 2;
      outer.scale.set(1.2, 1.05, 1.2);
      outer.position.z = -0.02;
      addProjectilePart(p.mesh, outer, 'proj-aura', kind);
      const glow = new THREE.Mesh(projectileAssetCache.glowGeo, projectileAssetCache.softGlowMat.clone());
      glow.scale.setScalar(1.85);
      addProjectilePart(p.mesh, glow, 'proj-glow', kind);
    } else {
      addProjectilePart(p.mesh, new THREE.Mesh(projectileAssetCache.shellGeo, projectileAssetCache.coreMat.clone()), 'proj-main', kind);
    }
    p.kind = kind;
  }

  p.mesh.frustumCulled = false;

  p.mesh.traverse(part => {
    if (!part.isMesh) return;
    part.frustumCulled = false;
    part.renderOrder = 999;
    part.material.depthWrite = false;
    if (part.material?.color) part.material.color.setHex(colorHex);
    if (part.material?.emissive) part.material.emissive.setHex(colorHex);
  });
}

function getTowerMetaDamageBonus(type) {
  const map = {
    cannon: 'upCannon',
    laser: 'upLaser',
    missile: 'upMissile',
    cryo: 'upCryo',
    flame: 'upFlame'
  };
  const key = map[type];
  if (!key) return 1;
  const lvl = state.meta?.[key] || 0;
  return 1 + lvl * 0.1;
}

function fireTower(tower, enemy) {
  const customStats = tower.custom?.stats;
  const d = customStats ? {
    projectile: resolveCustomProjectileType(customStats),
    color: tower.core.material.color.getHex(),
    damage: customStats.damage,
    aoe: customStats.aoe,
    slow: customStats.slow
  } : towerDefs[tower.type];
  const p = getProjectile();
  p.alive = true;
  p.damage = d.damage * tower.level * getTowerMetaDamageBonus(tower.type);
  p.aoe = d.aoe || 0;
  p.slow = d.slow || 0;
  p.custom = customStats || null;
  const yOffset = d.projectile === 'missile' ? 0.78 : d.projectile === 'flame' ? 0.72 : 0.6;
  p.pos = tower.mesh.position.clone().add(new THREE.Vector3(0, yOffset, 0));
  p.target = enemy;
  p.speed = d.projectile === 'missile' ? 8.5 : d.projectile === 'flame' ? 11 : d.projectile === 'beam' ? 22 : 14;
  p.mesh.position.copy(p.pos);
  configureProjectileMesh(p, d.projectile, d.color);
  p.mesh.scale.setScalar(1);
  p.spin = Math.random() * Math.PI * 2;
  logProjectileFire(p, d.projectile);
  state.projectiles.push(p);
  p.damageType = p.kind === 'ice' ? 'ice' : p.kind === 'bolt' ? 'arc' : p.kind === 'missile' ? 'explosive' : p.kind === 'beam' ? 'beam' : p.kind === 'flame' ? 'explosive' : 'kinetic';
  if (customStats?.chain > 0) {
    const linked = state.enemies.filter(e => e !== enemy && e.mesh.position.distanceTo(enemy.mesh.position) < customStats.chainRange).slice(0, customStats.chain);
    linked.forEach(e => applyHit(e, p.damage * (0.48 + customStats.shock), customStats.slow, 0, customStats, p.damageType));
  }
  tower.barrel.position.z = -0.08;
  tower.recoil = 0.11;
  state.effects.push({ pos: p.pos.clone(), life: 0.18, color: d.color, radius: 0.8 });
}

function applyHit(enemy, damage, slow = 0, burn = 0, customStats = null, damageType = 'kinetic') {
  const dealt = damage * (1 - (enemy.armor || 0));
  if (enemy.shield > 0) {
    enemy.shield -= dealt;
    if (enemy.shield < 0) enemy.hp += enemy.shield;
  } else {
    enemy.hp -= dealt;
  }
  const freezeDur = slow > 0 ? (0.45 + slow) * (1 - (enemy.frostResist || 0)) : 0;
  enemy.lastFreeze = enemy.freeze || 0;
  enemy.freeze = Math.max(enemy.freeze, freezeDur);
  enemy.burn = Math.max(enemy.burn || 0, burn || 0);
  if (customStats?.shatter && enemy.freeze > 0.2) enemy.hp -= damage * customStats.shatter;
  enemy.hitFlash = 0.16;
  updateEnemyHealthBarVisual(enemy, true);
  spawnImpactFx(enemy.mesh.position.clone(), damageType);
  if (ui.shakeToggle.checked) state.shake = Math.min(0.22, state.shake + 0.035);
}

function getFrontmostEnemyInRange(tower, range) {
  let frontmost = null;
  for (const enemy of state.enemies) {
    if (!enemy?.mesh?.parent) continue;
    if (enemy.mesh.position.distanceTo(tower.mesh.position) >= range) continue;
    if (!frontmost || enemy.t > frontmost.t) {
      frontmost = enemy;
    }
  }
  return frontmost;
}


function getPathPosition(path, progress) {
  if (!path?.length) return null;
  if (path.length === 1) return cellToWorld(path[0][0], path[0][1]).clone();
  const clamped = Math.min(1, Math.max(0, progress));
  const scaled = clamped * (path.length - 1);
  const idx = Math.min(path.length - 2, Math.floor(scaled));
  const frac = scaled - idx;
  const a = cellToWorld(path[idx][0], path[idx][1]);
  const b = cellToWorld(path[idx + 1][0], path[idx + 1][1]);
  return a.lerp(b, frac);
}

function launchAbilityStorm(kind, color, config = {}) {
  if (!board.path?.length) return;
  const stormPath = [...board.path].reverse();
  const source = getPathPosition(stormPath, 0);
  const target = getPathPosition(stormPath, 1);
  const firstDir = target.clone().sub(source).normalize();
  const travelTime = 0.8;
  state.effects.push({
    kind: 'abilityStorm',
    ability: kind,
    color,
    source,
    target,
    dir: firstDir,
    path: stormPath,
    progress: 0,
    speed: 1 / travelTime,
    radius: 0.5,
    affected: new WeakSet(),
    onTouch: config.onTouch || null,
    consumeOnTouch: !!config.consumeOnTouch,
    duration: travelTime,
    life: travelTime,
    head: null,
    trail: []
  });
}

function placeTowerAt(cell) {
  const key = `${cell[0]},${cell[1]}`;
  if (!isValidPlacementCell(cell)) return false;
  if (state.selectedTowerType === 'custom') {
    if (!state.activeBuild || state.money < state.activeBuild.cost) return false;
    state.money -= state.activeBuild.cost;
    board.blocked.add(key);
    state.towers.push(makeTower('custom', cell, state.activeBuild));
    state.buildMode = false;
    ghost.visible = false;
    rangeRing.visible = false;
    blockedCross.visible = false;
    syncBuildPads();
    ui.buildPanel.classList.add('hidden');
    showToast(`${state.activeBuild.name} platziert`);
    return true;
  }
  const def = towerDefs[state.selectedTowerType];
  if (!def || state.money < def.cost) return false;
  state.money -= def.cost;
  board.blocked.add(key);
  state.towers.push(makeTower(state.selectedTowerType, cell));
  state.buildMode = false;
  ghost.visible = false;
  rangeRing.visible = false;
  blockedCross.visible = false;
  syncBuildPads();
  ui.buildPanel.classList.add('hidden');
  showToast(`${def.name} platziert`);
  return true;
}

function updateUI() {
  ui.money.textContent = Math.floor(state.money);
  ui.lives.textContent = state.lives;
  ui.wave.textContent = state.mode === 'campaign' ? `${state.wave}/${state.levelWaves}` : `${state.wave}`;
  ui.phaseBadge.textContent = state.buildPhase ? 'Bauen' : 'Welle';
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
  ui.nextWaveTimer.textContent = state.betweenWaveCountdown > 0 && !state.inWave ? `${Math.ceil(state.betweenWaveCountdown)}` : '';

  if (state.selectedTower) {
    const d = state.selectedTower.custom ? { name: state.selectedTower.displayName, damage: state.selectedTower.custom.stats.damage, range: state.selectedTower.custom.stats.range, rate: state.selectedTower.custom.stats.rate } : towerDefs[state.selectedTower.type];
    const lvl = state.selectedTower.level;
    const next = { damage: Math.round(d.damage * (lvl + 1)), rate: Math.max(0.12, d.rate - 0.07 * lvl).toFixed(2) };
    ui.selectionPanel.classList.remove('hidden');
    ui.selectedName.textContent = `${d.name} Lv.${lvl} [${state.selectedTower.branch}]`;
    ui.selectedStats.textContent = `DMG ${Math.round(d.damage * lvl)} | RNG ${(d.range + 0.45 * (lvl - 1)).toFixed(1)} | CD ${Math.max(0.12, d.rate - 0.07 * (lvl - 1)).toFixed(2)}`;
    ui.upgradeDiff.innerHTML = `<span class="deltaUp">+${next.damage - Math.round(d.damage * lvl)} Schaden</span> · <span class="deltaUp">Visueller Rang +</span> · <span class="deltaDown">-${(Math.max(0.12, d.rate - 0.07 * (lvl - 1)) - next.rate).toFixed(2)}s Abklingzeit</span>`;
  } else {
    ui.selectionPanel.classList.add('hidden');
  }

  updateDock();
}

function updateCamera(dt = 1 / 60, now = performance.now()) {
  cam.yaw += cam.velYaw;
  cam.pitch = clamp(cam.pitch + cam.velPitch, 0.64, 1.28);
  cam.dist = clamp(cam.dist + cam.velDist, 9, 44);
  cam.target.x = clamp(cam.target.x + cam.panVel.x, -10, 10);
  cam.target.z = clamp(cam.target.z + cam.panVel.y, -2, board.h * board.tile + 5);
  cam.velYaw *= 0.78;
  cam.velPitch *= 0.78;
  cam.velDist *= 0.76;
  cam.panVel.multiplyScalar(0.72);

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

  if (cam.cine.active) {
    const lead = findFrontMostEnemy();
    if (!lead) {
      const fallback = {
        yaw: 0.58 + cam.cine.userYawOffset,
        pitch: clamp(1.12 + cam.cine.userPitchOffset, 0.75, 1.28),
        dist: clamp(23 + cam.cine.userDistOffset, 10, 42),
        tx: cam.cine.baselineTarget.x + cam.cine.userPanOffset.x,
        tz: cam.cine.baselineTarget.z + cam.cine.userPanOffset.y
      };
      cam.yaw += (fallback.yaw - cam.yaw) * Math.min(1, dt * 5.5);
      cam.pitch += (fallback.pitch - cam.pitch) * Math.min(1, dt * 5.5);
      cam.dist += (fallback.dist - cam.dist) * Math.min(1, dt * 5.5);
      cam.target.x += (fallback.tx - cam.target.x) * Math.min(1, dt * 5.5);
      cam.target.z += (fallback.tz - cam.target.z) * Math.min(1, dt * 5.5);
    } else {
      const enemyT = clamp(lead.t, 0, 1);
      const targetCamT = clamp(enemyT + cam.cine.followOffsetT, 0, 1);
      const enemyChanged = cam.cine.targetEnemy !== lead;
      if (enemyChanged) {
        cam.cine.pathStart = cam.cine.camT;
        cam.cine.pathProgress = 0;
        cam.cine.travelStart = now;
        cam.cine.travelDur = 600 + Math.random() * 600;
        cam.cine.targetEnemy = lead;
      }

      const travelK = Math.min(1, (now - cam.cine.travelStart) / Math.max(320, cam.cine.travelDur));
      const eased = 1 - Math.pow(1 - travelK, 3);
      cam.cine.pathProgress = Math.max(cam.cine.pathProgress, eased);
      cam.cine.camT = cam.cine.pathStart + (targetCamT - cam.cine.pathStart) * cam.cine.pathProgress;

      const camPosOnPath = getPathPosition(board.path, cam.cine.camT);
      const enemyPos = getPathPosition(board.path, enemyT);
      if (!camPosOnPath || !enemyPos) {
        cam.cine.targetEnemy = null;
      } else {
        const eps = 0.012;
        const prev = getPathPosition(board.path, Math.max(0, cam.cine.camT - eps)) || camPosOnPath;
        const next = getPathPosition(board.path, Math.min(1, cam.cine.camT + eps)) || camPosOnPath;
        const dirAtCam = next.clone().sub(prev);
        if (dirAtCam.lengthSq() < 0.000001) dirAtCam.set(0, 0, -1);
        dirAtCam.normalize();
        const side = new THREE.Vector3(dirAtCam.z, 0, -dirAtCam.x);
        if (side.lengthSq() < 0.000001) side.set(1, 0, 0);
        side.normalize();

        const cineTarget = enemyPos.clone();
        cineTarget.y = enemyPos.y + 0.35;
        cineTarget.x += cam.cine.userPanOffset.x;
        cineTarget.z += cam.cine.userPanOffset.y;

        const baselinePos = camPosOnPath.clone()
          .add(side.multiplyScalar(1.2));
        baselinePos.y = camPosOnPath.y + 3.5;

        const toView = baselinePos.clone().sub(cineTarget);
        const baseDist = clamp(toView.length(), 5, 26);
        const baseYaw = Math.atan2(toView.x, toView.z);
        const basePitch = Math.asin(clamp(toView.y / baseDist, -0.99, 0.99));

        const desiredYaw = baseYaw + cam.cine.userYawOffset;
        const desiredPitch = clamp(basePitch + cam.cine.userPitchOffset, 0.5, 1.4);
        const distanceMultiplier = 2;
        const desiredDist = clamp(baseDist * distanceMultiplier + cam.cine.userDistOffset, 6, 64);

        const followLerp = 1 - Math.exp(-dt * 6.5);
        cam.yaw += (desiredYaw - cam.yaw) * followLerp;
        cam.pitch += (desiredPitch - cam.pitch) * followLerp;
        cam.dist += (desiredDist - cam.dist) * followLerp;
        cam.target.x += (cineTarget.x - cam.target.x) * followLerp;
        cam.target.z += (cineTarget.z - cam.target.z) * followLerp;

        const idealPos = new THREE.Vector3(
          Math.sin(cam.yaw) * Math.cos(cam.pitch),
          Math.sin(cam.pitch),
          Math.cos(cam.yaw) * Math.cos(cam.pitch)
        ).multiplyScalar(cam.dist).add(cam.target);

        if (!cam.cine.smoothPos) cam.cine.smoothPos = idealPos.clone();
        if (!cam.cine.smoothLook) cam.cine.smoothLook = cineTarget.clone();
        const stable = 1 - Math.exp(-dt * 11);
        cam.cine.smoothPos.lerp(idealPos, stable);
        cam.cine.smoothLook.lerp(cineTarget, stable);
        camera.position.copy(cam.cine.smoothPos);
        camera.lookAt(cam.cine.smoothLook);
      }
    }
  }


  if (!cam.cine.active || !cam.cine.targetEnemy) {
    const p = new THREE.Vector3(
      Math.sin(cam.yaw) * Math.cos(cam.pitch),
      Math.sin(cam.pitch),
      Math.cos(cam.yaw) * Math.cos(cam.pitch)
    ).multiplyScalar(cam.dist).add(cam.target);
    camera.position.copy(p);
    camera.lookAt(cam.target);
  }

  if (state.shake > 0) {
    camera.position.add(new THREE.Vector3((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake, 0));
    state.shake *= 0.83;
  }
}


function releaseProjectile(i) {
  const p = state.projectiles[i];
  p.alive = false;
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
  if (objectiveEntities.spawnPoint) objectiveVisuals.updateSpawn(objectiveEntities.spawnPoint, simDt, now);
  state.particlesFrame = 0;
  for (const k of Object.keys(state.abilityCooldowns)) state.abilityCooldowns[k] = Math.max(0, state.abilityCooldowns[k] - simDt);

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
      spawnDeathFx(e);
      releaseHealthBar(e.healthBar);
      e.mesh.visible = false;
      if (e.blobShadow) world.remove(e.blobShadow);
      world.remove(e.mesh);
      state.enemies.splice(i, 1);
      continue;
    }

    const speed = e.freeze > 0 ? 0 : e.speed * (state.mode === 'challenge' ? 1.15 : 1);
    const wasFrozen = e.freeze > 0.12;
    e.freeze = Math.max(0, e.freeze - simDt);
    e.hitFlash = Math.max(0, (e.hitFlash || 0) - simDt);
    if (e.burn > 0) { e.hp -= simDt * (2.2 * e.burn); e.burn = Math.max(0, e.burn - simDt); }
    if (e.poison > 0) { e.hp -= simDt * 6.5; e.poison = Math.max(0, e.poison - simDt); }
    e.t += simDt * speed / (board.path.length * 0.58);
    const idx = Math.floor(e.t * (board.path.length - 1));
    if (idx >= board.path.length - 1) {
      state.lives -= e.boss ? 4 : 1;
      state.enemies.splice(i, 1);
      releaseHealthBar(e.healthBar);
      if (e.blobShadow) world.remove(e.blobShadow);
      world.remove(e.mesh);
      if (state.lives <= 0) {
        state.paused = true;
        resetCineCam(false);
        closeTransientPanels();
        ui.mainMenu.classList.remove('hidden');
        showToast('Niederlage. Neustart...', false);
      }
      continue;
    }

    const f = e.t * (board.path.length - 1) - idx;
    const a = cellToWorld(...board.path[idx]);
    const b = cellToWorld(...board.path[idx + 1]);
    const pathPos = new THREE.Vector3().lerpVectors(a, b, f);
    const pathDir = b.clone().sub(a);
    const dirLen = Math.max(0.0001, pathDir.length());
    pathDir.multiplyScalar(1 / dirLen);
    const phase = now * 0.009 + e.motionPhase;
    const stride = now * 0.016 + e.stridePhase;
    const pathYaw = Math.atan2(pathDir.x, pathDir.z);
    let yLift = 0.33;
    let bobAmount = 0;
    let roll = 0;
    let pitch = 0;

    if (e.flying) {
      bobAmount = Math.sin(phase) * 0.22;
      yLift = 0.72 + bobAmount;
      roll = Math.sin(stride) * 0.18;
      pitch = 0.08 + Math.sin(stride * 0.9) * 0.05;
    } else if (e.archetype === 'runner') {
      bobAmount = Math.abs(Math.sin(stride)) * 0.12;
      yLift = 0.28 + bobAmount;
      pitch = 0.25 + Math.sin(stride) * 0.08;
      roll = Math.sin(stride * 2) * 0.05;
    } else if (e.archetype === 'tank' || e.boss) {
      bobAmount = Math.abs(Math.sin(stride * 0.55)) * 0.06;
      yLift = 0.27 + bobAmount;
      pitch = 0.06 + Math.sin(stride * 0.55) * 0.03;
      roll = Math.sin(stride * 0.35) * 0.02;
    } else if (e.archetype === 'shielded') {
      bobAmount = Math.abs(Math.sin(stride * 0.75)) * 0.08;
      yLift = 0.3 + bobAmount;
      pitch = 0.11 + Math.sin(stride * 0.75) * 0.04;
      roll = Math.sin(stride * 0.6) * 0.03;
    } else {
      bobAmount = Math.abs(Math.sin(stride)) * 0.07;
      yLift = 0.31 + bobAmount;
      pitch = 0.09;
    }

    e.mesh.position.copy(pathPos).setY(pathPos.y + yLift);
    if (e.blobShadow) {
      const groundY = pathPos.y + 0.02;
      e.blobShadow.position.set(e.mesh.position.x, groundY, e.mesh.position.z);
      e.blobShadow.material.opacity = e.flying ? (0.1 + Math.abs(Math.sin(phase)) * 0.05) : 0.3 + bobAmount * 0.26;
      const squash = e.flying ? (1.25 + Math.sin(stride) * 0.07) : (1 + bobAmount * 0.5);
      e.blobShadow.scale.set(squash, squash, 1);
    }
    const pulse = 1 + Math.sin(now * 0.012 + e.bob) * 0.04;
    const hitScale = e.hitFlash > 0 ? 1.12 : 1;
    if (wasFrozen && e.freeze <= 0.01) emitParticleBurst(e.mesh.position.clone(), { color: 0xbfefff, count: 8, spread: 2.1, life: 0.26, y: 0.22 });
    e.mesh.scale.setScalar((e.boss ? 1.45 : 1) * pulse * hitScale);
    e.mesh.rotation.set(pitch, pathYaw + roll, roll * 0.7);
    e.mesh.traverse(part => {
      if (part.material?.emissive) {
        const em = e.hitFlash > 0 ? 0xffd8b1 : (e.poison > 0 ? 0x88ff55 : (e.freeze > 0 ? 0x8edbff : (e.shield > 0 ? 0x7f8cff : 0x18232d)));
        part.material.emissive.setHex(em);
        part.material.emissiveIntensity = e.hitFlash > 0 ? 0.55 : (e.flying ? 0.25 : 0.18);
      }
      if (part.name === 'shieldShell') {
        part.visible = e.shield > 0;
        part.material.opacity = 0.12 + (e.shield > 0 ? 0.16 : 0);
      }
    });

    if (e.healthBar) {
      e.healthBar.position.lerp(e.mesh.position.clone().add(new THREE.Vector3(0, e.boss ? 1.72 : 1.28, 0)), 0.55);
      e.healthBar.quaternion.copy(camera.quaternion);
      updateEnemyHealthBarVisual(e);
    }
  }

  for (const t of state.towers) {
    t.cooldown -= simDt;
    t.recoil = Math.max(0, (t.recoil || 0) - simDt * 1.8);
    t.barrel.position.z = 0.22 - t.recoil;
    t.headGroup.rotation.y += dt * 0.25;
    if (t.blobShadow) t.blobShadow.position.set(t.mesh.position.x, GROUND_Y + 0.02, t.mesh.position.z);
    t.pulsePhase += simDt * 2.1;
    t.core.material.emissiveIntensity = 0.28 + Math.sin(t.pulsePhase) * 0.05 + t.level * 0.05;
    const baseRange = t.custom ? t.custom.stats.range : towerDefs[t.type].range;
    const range = baseRange + (t.level - 1) * 0.45;
    const target = getFrontmostEnemyInRange(t, range);
    if (target && t.cooldown <= 0 && state.inWave) {
      fireTower(t, target);
      const baseRate = t.custom ? t.custom.stats.rate : towerDefs[t.type].rate;
      t.cooldown = Math.max(0.12, baseRate - (t.level - 1) * 0.07);
    }
  }

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    if (!p.target || !p.target.mesh.parent) {
      releaseProjectile(i);
      continue;
    }
    const toTarget = p.target.mesh.position.clone().sub(p.pos);
    const dist = toTarget.length();
    const maxStep = p.speed * simDt;
    const moveDir = toTarget.normalize();
    const step = Math.min(dist, maxStep);
    p.pos.add(moveDir.multiplyScalar(step));
    p.mesh.position.copy(p.pos);
    if (p.kind === 'shell') {
      p.spin += simDt * 12;
      p.mesh.rotation.set(p.spin, p.spin * 0.7, 0);
    } else if (p.kind === 'ice') {
      p.mesh.rotation.x += simDt * 4;
      p.mesh.rotation.y += simDt * 3.2;
    } else if (p.kind === 'flame') {
      p.mesh.rotation.y += simDt * 6.5;
      const flicker = 0.92 + Math.sin(now * 0.024 + p.spin) * 0.14;
      p.mesh.scale.setScalar(flicker);
    } else {
      p.mesh.lookAt(p.pos.clone().add(moveDir));
    }
    const reached = dist <= maxStep + 1e-6;
    if (reached) {
      if (p.aoe) state.enemies.forEach(e => { if (e.mesh.position.distanceTo(p.pos) < p.aoe) applyHit(e, p.damage, p.slow, p.kind === 'flame' ? 1.4 : 0, p.custom, p.damageType); });
      else applyHit(p.target, p.damage, p.slow, p.kind === 'flame' ? 1.4 : 0, p.custom, p.damageType);
      releaseProjectile(i);
    }
  }

  for (let i = state.effects.length - 1; i >= 0; i--) {
    const fx = state.effects[i];
    if (fx.kind === 'fragment') {
      const f = fx.frag;
      f.life -= simDt;
      if (f.settleY == null) {
        f.vel.y -= simDt * 5.8;
        f.mesh.position.addScaledVector(f.vel, simDt);
        f.mesh.rotation.x += simDt * 5;
        f.mesh.rotation.y += simDt * 6.5;
        const groundY = GROUND_Y + 0.03;
        if (f.mesh.position.y <= groundY) {
          f.settleY = groundY;
          f.mesh.position.y = groundY;
          f.vel.set(0, 0, 0);
        }
      } else {
        f.groundLock += simDt;
        f.mesh.position.y = f.settleY;
        f.mesh.rotation.x += simDt * 0.25;
      }
      const fadeWindow = f.fadeDuration || 0.9;
      const opacity = f.life < fadeWindow ? Math.max(0, f.life / fadeWindow) : 1;
      f.mesh.material.opacity = opacity;
      f.mesh.material.transparent = true;
      if (f.life <= 0) {
        f.mesh.visible = false;
        if (f.mesh.parent) f.mesh.parent.remove(f.mesh);
        state.pools.fragments.push(f);
        state.effects.splice(i, 1);
      }
      continue;
    }
    if (fx.kind === 'particle') {
      const p = fx.particle;
      p.life -= simDt;
      p.vel.y -= simDt * 2.8;
      p.mesh.position.addScaledVector(p.vel, simDt);
      p.mesh.material.opacity = Math.max(0, p.life * 2.5);
      p.mesh.scale.setScalar(0.8 + (1 - p.life) * 0.9);
      if (p.life <= 0) {
        p.mesh.visible = false;
        if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
        state.pools.particles.push(p);
        state.effects.splice(i, 1);
      }
      continue;
    }
    if (fx.kind === 'abilityStorm') {
      fx.life -= simDt;
      fx.progress = Math.min(1, fx.progress + fx.speed * simDt);
      const progress = fx.progress;
      const headPos = getPathPosition(fx.path, progress);
      const prevPos = getPathPosition(fx.path, Math.max(0, progress - 0.01));
      const nextPos = getPathPosition(fx.path, Math.min(1, progress + 0.01));
      if (nextPos && prevPos) {
        const tangent = nextPos.clone().sub(prevPos);
        if (tangent.lengthSq() > 0.00001) fx.dir.copy(tangent.normalize());
      }

      let consumed = false;
      if (headPos && fx.onTouch) {
        for (const enemy of state.enemies) {
          if (!enemy?.mesh?.parent || fx.affected.has(enemy)) continue;
          const enemyPos = enemy.mesh.position;
          const verticalDistance = Math.abs((enemyPos.y + (enemy.size || 0.3)) - (headPos.y + 0.34));
          if (verticalDistance > 0.9) continue;
          const flatDistance = Math.hypot(enemyPos.x - headPos.x, enemyPos.z - headPos.z);
          if (flatDistance <= fx.radius + (enemy.size || 0.3)) {
            fx.affected.add(enemy);
            fx.onTouch(enemy);
            if (fx.consumeOnTouch) {
              consumed = true;
              break;
            }
          }
        }
      }

      if (!fx.head) {
        fx.head = state.pools.stormHeads.pop() || new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 12, 10),
          new THREE.MeshBasicMaterial({ transparent: true })
        );
        world.add(fx.head);
      }

      fx.head.visible = true;
      fx.head.position.copy(headPos).setY(headPos.y + 0.34);
      const headScale = 1 + Math.sin(now * 0.018 + progress * 9) * 0.18;
      fx.head.scale.setScalar(headScale);
      fx.head.material.color.setHex(fx.color || 0xffffff);
      fx.head.material.opacity = 0.88;

      if (!fx.trail) fx.trail = [];
      const trailSteps = 11;
      for (let t = 0; t < trailSteps; t++) {
        const ratio = t / (trailSteps - 1);
        const lag = ratio * 0.1;
        const tProg = Math.max(0, progress - lag);
        const trailPos = getPathPosition(fx.path, tProg) || fx.source;
        const swirl = new THREE.Vector3(-fx.dir.z, 0, fx.dir.x).multiplyScalar((Math.sin(now * 0.01 + t) * 0.18) * (1 - ratio));
        emitParticleBurst(trailPos.add(swirl), { color: fx.color, count: 1, spread: 0.26 + ratio * 0.4, life: 0.2 + (1 - ratio) * 0.16, y: 0.24 });
      }

      if (consumed || fx.life <= 0 || progress >= 1) {
        if (fx.head) {
          fx.head.visible = false;
          if (fx.head.parent) fx.head.parent.remove(fx.head);
          state.pools.stormHeads.push(fx.head);
          fx.head = null;
        }
        emitParticleBurst(fx.target.clone(), { color: fx.color, count: 12, spread: 1.2, life: 0.32, y: 0.34 });
        state.effects.splice(i, 1);
      }
      continue;
    }

    if (fx.kind === 'shockwave') {
      fx.life -= simDt;
      const prog = 1 - (fx.life / fx.maxLife);
      fx.mesh.scale.setScalar(1 + prog * (fx.radiusScale || 7.5));
      fx.mesh.material.opacity = Math.max(0, (1 - prog) * 0.7);
      if (fx.life <= 0) {
        fx.mesh.visible = false;
        if (fx.mesh.parent) fx.mesh.parent.remove(fx.mesh);
        state.pools.shockwaves.push(fx.mesh);
        state.effects.splice(i, 1);
      }
      continue;
    }

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

  if (hoverTile.visible && state.buildMode && state.selectedTowerType) {
    hoverVisualState.pulse += simDt * 4.8;
    const pulse = 0.5 + Math.sin(hoverVisualState.pulse) * 0.5;
    const ringOpacity = hoverVisualState.valid ? 0.24 + pulse * 0.2 : 0.2 + pulse * 0.08;
    rangeRing.material.opacity += (ringOpacity - rangeRing.material.opacity) * 0.2;
    hoverTile.material.opacity += ((hoverVisualState.valid ? 0.42 : 0.34) - hoverTile.material.opacity) * 0.2;
  }

  updateCamera(dt, now);
  updateUI();
  renderer.render(scene, camera);
}

const castlePreview = {
  renderer: null,
  scene: null,
  camera: null,
  meshRoot: null,
  animationId: 0
};

function updateCastleSelectionText() {
  if (!ui.castleSelectionStatus) return;
  const partId = state.selectedCastlePart;
  const cfg = getSelectedPartConfig(partId);
  ui.castleSelectionStatus.textContent = `Teil: ${castleParts[partId]?.label || partId} · Farbe: ${cfg.color} · Textur: ${cfg.texture}`;
}

function updateCastlePartList() {
  if (!ui.castlePartList) return;
  ui.castlePartList.innerHTML = '';
  const visibleParts = [
    { id: 'wall', label: 'wall' },
    { id: 'keep', label: 'keep' },
    { id: 'gate', label: 'gate' },
    { id: 'tower', label: 'tower' },
    { id: 'roof', label: 'roof' },
    { id: 'banner', label: 'banner' }
  ];
  visibleParts.forEach(({ id: partId, label }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'levelBtn' + (partId === state.selectedCastlePart ? ' active' : '');
    btn.textContent = label;
    btn.onclick = () => {
      state.selectedCastlePart = partId;
      const selected = getSelectedPartConfig(partId);
      state.selectedCastleColor = selected.color;
      state.selectedCastleTexture = selected.texture;
      buildCastlePalette();
      buildCastleTextureList();
      updateCastlePartList();
      updateCastleSelectionText();
    };
    ui.castlePartList.appendChild(btn);
  });
}

function buildCastlePalette() {
  if (!ui.castlePalette) return;
  ui.castlePalette.innerHTML = '';
  const picker = document.createElement('input');
  picker.type = 'color';
  picker.className = 'castleColorPicker';
  picker.value = normalizeColorHex(state.selectedCastleColor);
  picker.setAttribute('aria-label', 'Freie Farbauswahl für Burgteil');
  picker.oninput = () => {
    const color = normalizeColorHex(picker.value, state.selectedCastleColor);
    state.selectedCastleColor = color;
    setCastlePartCustomization(state.selectedCastlePart, color, state.selectedCastleTexture);
    updateCastleSelectionText();
    syncPreviewFromSave();
  };
  ui.castlePalette.appendChild(picker);
}

function buildCastleTextureList() {
  if (!ui.castleTextureList) return;
  ui.castleTextureList.innerHTML = '';
  CASTLE_TEXTURE_KEYS.forEach(textureKey => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'levelBtn' + (textureKey === state.selectedCastleTexture ? ' active' : '');
    btn.textContent = textureKey;
    btn.onclick = () => {
      state.selectedCastleTexture = textureKey;
      setCastlePartCustomization(state.selectedCastlePart, state.selectedCastleColor, textureKey);
      buildCastleTextureList();
      updateCastleSelectionText();
      syncPreviewFromSave();
    };
    ui.castleTextureList.appendChild(btn);
  });
}

function initCastlePreview() {
  if (!ui.castlePreview || castlePreview.renderer) return;
  const width = Math.max(280, ui.castlePreview.clientWidth || 320);
  const height = Math.max(220, ui.castlePreview.clientHeight || 340);
  castlePreview.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  castlePreview.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  castlePreview.renderer.setSize(width, height, false);
  ui.castlePreview.appendChild(castlePreview.renderer.domElement);
  castlePreview.scene = new THREE.Scene();
  castlePreview.camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50);
  castlePreview.camera.position.set(0, 2.4, 4.5);
  castlePreview.camera.lookAt(0, 0.8, 0);
  const lightA = new THREE.HemisphereLight(0xdff3ff, 0x3a2e22, 1.1);
  const lightB = new THREE.DirectionalLight(0xffffff, 1.15);
  lightB.position.set(3, 6, 4);
  castlePreview.scene.add(lightA, lightB);
  castlePreview.meshRoot = objectiveVisuals.createCastle(1, 1, [[0, 0], [0, 1]], (x, z) => new THREE.Vector3(x, 0, z));
  if (castlePreview.meshRoot?.group) {
    castlePreview.meshRoot.group.position.set(0, 0, 0);
    castlePreview.meshRoot.group.rotation.y = 0.5;
    castlePreview.scene.add(castlePreview.meshRoot.group);
  }
  const tick = () => {
    if (!castlePreview.renderer) return;
    if (!ui.mainMenu.classList.contains('hidden') && activeMenuPage === 'castle') {
      castlePreview.meshRoot.group.rotation.y += 0.003;
      castlePreview.renderer.render(castlePreview.scene, castlePreview.camera);
    }
    castlePreview.animationId = requestAnimationFrame(tick);
  };
  tick();
}

function syncPreviewFromSave() {
  const previewCastle = castlePreview.meshRoot;
  if (!previewCastle?.applyPartCustomization) return;
  Object.keys(castleParts).forEach(partId => {
    previewCastle.applyPartCustomization(partId, state.campaign.castleCustomization.parts[partId]);
  });
}

function pickCell(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(boardPlane);
  if (!hits.length) return null;
  return worldToCell(hits[0].point);
}

function isValidPlacementCell(cell) {
  if (!cell) return false;
  const key = `${cell[0]},${cell[1]}`;
  return !board.blocked.has(key) && !pathCellSet.has(key) && !obstacleCells.has(key);
}

function updateHoverVisual(cell, force = false) {
  if (!cell) {
    state.hoverCell = null;
    hoverTile.visible = false;
    blockedCross.visible = false;
    if (!state.buildMode) {
      ghost.visible = false;
      rangeRing.visible = false;
    }
    return;
  }
  state.hoverCell = cell;
  const worldPos = cellToWorld(cell[0], cell[1]);
  hoverTile.visible = true;
  hoverTile.position.copy(worldPos).setY(worldPos.y + 0.045);
  const valid = isValidPlacementCell(cell);
  hoverVisualState.valid = valid;

  if (state.buildMode && state.selectedTowerType) {
    const snapY = worldPos.y + 0.6;
    if (!ghost.visible || force) ghost.position.copy(worldPos).setY(snapY);
    else ghost.position.lerp(new THREE.Vector3(worldPos.x, snapY, worldPos.z), 0.42);
    ghost.visible = true;
    rangeRing.visible = true;
    rangeRing.position.copy(ghost.position).setY(worldPos.y + 0.062);
    const towerDef = state.selectedTowerType === 'custom' ? state.activeBuild : towerDefs[state.selectedTowerType];
    const range = towerDef?.stats?.range || towerDef?.range || 5;
    rangeRing.scale.setScalar(range);
    hoverTile.material.color.setHex(valid ? BUILD_PAD_COLORS.hoverValid : BUILD_PAD_COLORS.hoverInvalid);
    ghost.material.color.setHex(valid ? BUILD_PAD_COLORS.hoverValid : BUILD_PAD_COLORS.hoverInvalid);
    rangeRing.material.color.setHex(valid ? 0x67e9a8 : 0xff7788);
    blockedCross.visible = !valid;
    if (!valid) blockedCross.position.copy(worldPos).setY(worldPos.y + 0.09);
  }
}


function clearObstacle(cellKey) {
  const obs = obstacleCells.get(cellKey);
  if (!obs) return;
  if (state.money < 300) return showToast('Nicht genug Credits', false);
  const now = performance.now();
  if (state.obstacleTap.key !== cellKey || state.obstacleTap.expires < now) {
    state.obstacleTap = { key: cellKey, expires: now + 1400 };
    return showToast('Erneut tippen zum Bestätigen', false);
  }
  state.money -= 300;
  const base = obs.position.clone();
  const kind = obs.userData.kind;
  const c = kind === 'tree' ? 0xc29162 : kind === 'ice' ? 0xb8ebff : 0xff8a4a;
  emitParticleBurst(base, { color: c, count: 14, spread: 3.2, life: 0.45, y: 0.2 });
  state.effects.push({ pos: base.clone(), life: 0.45, color: c, radius: 1.8 });
  world.remove(obs);
  obstacleCells.delete(cellKey);
  saveClearedObstacleCell(cellKey);
  syncBuildPads();
  ui.obstaclePanel.classList.add('hidden');
  showToast('Hindernis entfernt');
}
let touches = new Map();
let touchSession = null;
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
  if (touches.size === 1) {
    touchSession = {
      primaryId: e.pointerId,
      startedInBuild: !!(state.buildMode && state.selectedTowerType),
      intentPlacement: !!(state.buildMode && state.selectedTowerType),
      canceledByGesture: false,
      movedBeyondTap: false
    };
    const cell = pickCell(e.clientX, e.clientY);
    updateHoverVisual(cell, true);
  }
  if (touches.size === 2) {
    const [a, b] = [...touches.values()];
    touches.gesture = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    if (touchSession?.startedInBuild) {
      touchSession.canceledByGesture = true;
      touchSession.intentPlacement = false;
    }
  }
});

canvas.addEventListener('pointermove', e => {
  if (!touches.has(e.pointerId)) return;
  const prev = touches.get(e.pointerId);
  touches.set(e.pointerId, { ...prev, x: e.clientX, y: e.clientY });

  if (touchSession && e.pointerId === touchSession.primaryId) {
    const moved = Math.hypot(e.clientX - prev.sx, e.clientY - prev.sy);
    if (moved > BUILD_TAP_MOVE_PX) {
      touchSession.movedBeyondTap = true;
      touchSession.intentPlacement = false;
    }
  }

  if (touches.size === 1) {
    if (!(state.buildMode && state.selectedTowerType)) {
      cam.velYaw += -e.movementX * 0.0021;
      cam.velPitch += e.movementY * 0.00165;
      if (cam.cine.active) {
        cam.cine.userYawOffset += -e.movementX * 0.0016;
        cam.cine.userPitchOffset += e.movementY * 0.00125;
      }
    }
    const cell = pickCell(e.clientX, e.clientY);
    updateHoverVisual(cell);
  } else if (touches.size === 2) {
    const vals = [...touches.values()].filter(v => v && v.x !== undefined);
    const [a, b] = vals;
    const g = touches.gesture;
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    cam.velDist += (g.d - d) * PINCH_MULT;
    cam.panVel.x += -(cx - g.cx) * PAN_MULT;
    cam.panVel.y += (cy - g.cy) * PAN_MULT;
    if (cam.cine.active) {
      cam.cine.userDistOffset += (g.d - d) * PINCH_MULT * 0.55;
      cam.cine.userPanOffset.x += -(cx - g.cx) * PAN_MULT * 0.7;
      cam.cine.userPanOffset.y += (cy - g.cy) * PAN_MULT * 0.7;
    }
    touches.gesture = { d, cx, cy };
    if (touchSession?.startedInBuild) {
      touchSession.canceledByGesture = true;
      touchSession.intentPlacement = false;
    }
  }
});

canvas.addEventListener('pointerup', e => {
  const was = touches.get(e.pointerId);
  touches.delete(e.pointerId);
  if (touches.size < 2) delete touches.gesture;
  const dt = performance.now() - (was?.t || 0);
  const moved = was ? Math.hypot((was.x || 0) - (was.sx || 0), (was.y || 0) - (was.sy || 0)) : 99;
  const isTap = dt <= TAP_MAX_MS && moved <= BUILD_TAP_MOVE_PX;
  const shouldAttemptPlacement = !!(touchSession && e.pointerId === touchSession.primaryId && touchSession.startedInBuild && !touchSession.canceledByGesture && !touchSession.movedBeyondTap && isTap);
  if (isTap) {
    const nowTap = performance.now();
    if (nowTap - lastTapAt < 300) {
      unifiedOverview(true);
      lastTapAt = 0;
      touchSession = null;
      return;
    }
    lastTapAt = nowTap;
    const cell = pickCell(e.clientX, e.clientY);
    if (!cell) return;
    if (shouldAttemptPlacement) placeTowerAt(cell);
    else if (state.buildMode && state.selectedTowerType) updateHoverVisual(cell, true);
    else {
      const key = `${cell[0]},${cell[1]}`;
      const obstacle = obstacleCells.get(key);
      if (obstacle) {
        ui.obstacleTitle.textContent = 'Hindernis';
        ui.obstaclePanel.classList.remove('hidden');
        ui.clearObstacleBtn.onclick = () => clearObstacle(key);
      } else {
        ui.obstaclePanel.classList.add('hidden');
      }
      state.selectedTower = state.towers.find(t => t.cell[0] === cell[0] && t.cell[1] === cell[1]) || null;
    }
  }
  if (touchSession && e.pointerId === touchSession.primaryId) touchSession = null;
});

canvas.addEventListener('pointercancel', e => {
  touches.delete(e.pointerId);
  if (touchSession && touchSession.primaryId === e.pointerId) touchSession = null;
});
canvas.addEventListener('dblclick', () => unifiedOverview(true));
canvas.addEventListener('wheel', e => {
  cam.velDist += e.deltaY * 0.006;
  if (cam.cine.active) cam.cine.userDistOffset += e.deltaY * 0.0028;
}, { passive: true });


ui.builderCancelBtn.onclick = () => closeBuilder();
ui.builderConfirmBtn.onclick = () => {
  if (state.builderDraft.length < 2) return showToast('Wähle mindestens 2 Module', false);
  const cfg = buildConfigFromModules(state.builderDraft);
  state.activeBuild = cfg;
  state.selectedTowerType = 'custom';
  state.buildMode = true;
  ui.buildPanel.classList.remove('hidden');
  ui.buildTitle.textContent = `🧩 ${cfg.name} (${cfg.cost}¢)`;
  closeBuilder();
  updateDock();
};

ui.cancelBuildBtn.onclick = () => {
  state.buildMode = false;
  ghost.visible = false;
  rangeRing.visible = false;
  blockedCross.visible = false;
  ui.buildPanel.classList.add('hidden');
};
ui.startWaveBtn.onclick = () => {
  if (!state.buildPhase) return;
  if (state.mode === 'campaign' && state.wave >= state.levelWaves) return;
  const minTowers = state.mode === 'campaign' ? (campaignDefs[Math.min(state.currentLevel,24)-1]?.recommendedTowers || 1) : 1;
  if (state.towers.length < minTowers) {
    showToast(`Dieses Level benötigt mindestens ${minTowers} Türme.`, false);
    return;
  }
  spawnWave();
};
ui.upgradeBtn.onclick = () => {
  const t = state.selectedTower;
  if (!t) return;
  const cost = 45 * t.level;
  if (state.money < cost) return showToast('Mehr Credits benötigt', false);
  state.money -= cost;
  t.level += 1;
  t.core.scale.setScalar(1 + t.level * 0.08);
  t.barrel.scale.z = 1 + t.level * 0.16;
  showToast('Aufgewertet');
};
ui.sellBtn.onclick = () => {
  const t = state.selectedTower;
  if (!t) return;
  const baseCost = t.custom ? t.custom.cost : towerDefs[t.type].cost;
  state.money += Math.round(baseCost * 0.65);
  board.blocked.delete(`${t.cell[0]},${t.cell[1]}`);
  syncBuildPads();
  world.remove(t.mesh);
  if (t.blobShadow) world.remove(t.blobShadow);
  state.towers = state.towers.filter(x => x !== t);
  state.selectedTower = null;
};
ui.pauseBtn.onclick = () => { state.paused = true; ui.pauseMenu.classList.remove('hidden'); };
ui.castleResetBtn.onclick = () => { resetCastleColors(); showPage('castle'); showToast('Burgfarben zurückgesetzt'); };
ui.castleRandomizeBtn.onclick = () => { randomizeCastleColors(); showPage('castle'); showToast('Burgfarben randomisiert'); };
ui.resumeBtn.onclick = () => { state.paused = false; ui.pauseMenu.classList.add('hidden'); };

function closeTransientPanels() {
  state.selectedTower = null;
  state.buildMode = false;
  ghost.visible = false;
  rangeRing.visible = false;
  blockedCross.visible = false;
  ui.selectionPanel.classList.add('hidden');
  ui.buildPanel.classList.add('hidden');
  ui.obstaclePanel.classList.add('hidden');
  ui.pauseMenu.classList.add('hidden');
  ui.levelCompleteModal.classList.add('hidden');
  ui.towerBuilderModal.classList.add('hidden');
}

ui.menuBtn.onclick = () => {
  state.paused = true;
  state.gameStarted = false;
  resetCineCam(false);
  closeTransientPanels();
  setCampaignSelectionToLatestPlayable();
  saveCampaign();
  showPage('home');
  ui.mainMenu.classList.remove('hidden');
};

function start(mode) {
  closeTransientPanels();
  state.mode = mode;
  if (mode === 'campaign') {
    const w = Number(state.campaign.selectedWorld) || 1;
    const l = Number(state.campaign.selectedLevel) || 1;
    state.currentLevel = (w - 1) * 6 + l;
  } else if (mode === 'boss') {
    state.currentLevel = FINAL_BOSS_LEVEL;
  } else state.currentLevel = 1;
  const cur = campaignDefs.find(x => x.level === Math.min(state.currentLevel,24));
  state.levelWaves = mode === 'campaign' ? (cur?.waves || 10) : mode === 'boss' ? 15 : 999;
  state.money = (mode === 'boss' ? 520 : 220) + (state.meta.econ || 0) * 45;
  state.lives = 20;
  state.wave = 0;
  state.inWave = false;
  state.buildPhase = true;
  state.towers.forEach(t => { world.remove(t.mesh); if (t.blobShadow) world.remove(t.blobShadow); });
  state.enemies.forEach(e => { releaseHealthBar(e.healthBar); if (e.blobShadow) world.remove(e.blobShadow); world.remove(e.mesh); });
  state.towers = [];
  state.enemies = [];
  state.projectiles = [];
  state.effects = [];
  board.blocked.clear();
  ui.obstaclePanel.classList.add('hidden');
  syncBuildPads();
  state.paused = false;
  state.gameSpeed = 1;
  state.betweenWaveCountdown = 0;
  state.gameStarted = true;
  ui.mainMenu.classList.add('hidden');
  resetCineCam(false);
  if (mode === 'campaign') rebuildWorldForCampaign();
  else if (mode === 'endless') rebuildWorldForMode(getActiveWorldId());
  else if (mode === 'challenge') rebuildWorldForMode(getActiveWorldId());
  else if (mode === 'boss') rebuildWorldForMode(4);
  ui.bossWarning.classList.add('hidden');
  syncProgressUnlocks();
  sanitizeCastleColorState();
  initDock();
  initAbilities();
  refreshWavePreview();
  unifiedOverview(false);
}

ui.playCampaign.onclick = () => showPage('campaign');
ui.playEndless.onclick = () => showPage('endless');
ui.playChallenge.onclick = () => showPage('challenge');
ui.openCastle.onclick = () => showPage('castle');
ui.openUpgrades.onclick = () => showPage('upgrades');
ui.openUnlockSettings.onclick = () => showPage('unlockSettings');
ui.playCampaignStart.onclick = () => {
  const w = Number(state.campaign.selectedWorld) || 1;
  const l = Number(state.campaign.selectedLevel) || 1;
  const sel = (w - 1) * 6 + l;
  if (sel > (state.campaign.unlockedLevel || 1)) return showToast('Dieses Level ist gesperrt.', false);
  start('campaign');
};
ui.playEndlessStart.onclick = () => start('endless');
ui.playChallengeStart.onclick = () => start('challenge');
ui.playFinalBoss.onclick = () => start('boss');
for (const navBtn of document.querySelectorAll('[data-nav]')) {
  navBtn.addEventListener('click', () => showPage(navBtn.dataset.nav || 'home'));
}
ui.overviewBtn.onclick = () => {
  if (cam.cine.active) resetCineCam(false);
  unifiedOverview(true);
};
ui.cineCamBtn.onclick = () => {
  if (cam.cine.active) resetCineCam(true);
  else enableCineCam();
};
ui.speedBtn.onclick = () => { state.gameSpeed = state.gameSpeed >= 4 ? 1 : state.gameSpeed + 1; };
ui.continueBtn.onclick = () => {
  resetCineCam(false);
  closeTransientPanels();
  setCampaignSelectionToLatestPlayable();
  saveCampaign();
  showPage('home');
  ui.mainMenu.classList.remove('hidden');
  state.gameStarted = false;
};

function updateViewport() {
  const vv = window.visualViewport;
  const vw = vv?.width ?? window.innerWidth;
  const vh = vv?.height ?? window.innerHeight;
  const safeW = Math.max(1, Math.round(vw));
  const safeH = Math.max(1, Math.round(vh));
  const minSide = Math.min(safeW, safeH);
  const uiScale = Math.min(1.15, Math.max(0.75, minSide / 820));
  const hudScale = Math.min(1.2, Math.max(0.78, uiScale * (safeW > safeH ? 0.95 : 1)));
  document.documentElement.style.setProperty('--vwPx', String(safeW));
  document.documentElement.style.setProperty('--vhPx', String(safeH));
  document.documentElement.style.setProperty('--uiScale', uiScale.toFixed(4));
  document.documentElement.style.setProperty('--hudScale', hudScale.toFixed(4));
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(safeW, safeH, false);
  camera.aspect = safeW / safeH;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', updateViewport);
window.addEventListener('orientationchange', updateViewport);
window.visualViewport?.addEventListener('resize', updateViewport);
window.visualViewport?.addEventListener('scroll', updateViewport);

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
  ui.updateBtn.onclick = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      reg?.waiting?.postMessage('SKIP_WAITING');
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (err) {
      console.warn('Update refresh fallback', err);
    }
    window.location.reload();
  };
}

function assertRequiredDomNodes() {
  const required = ['mainMenu','campaignWorldSelect','campaignLevelSelect','playCampaign','playEndless','playChallenge','playCampaignStart','playEndlessStart','playChallengeStart','metaTree','unlockList','upgradePointsLabel','finalBossUnlock','playFinalBoss','openCastle','openUpgrades','openUnlockSettings','endlessWorldSelect','challengeWorldSelect','castlePalette','castleTextureList','castlePartList','castleSelectionStatus','castlePreview','castleResetBtn','castleRandomizeBtn'];
  const missing = required.filter(key => !ui[key]);
  if (missing.length) throw new Error(`Missing required DOM nodes: ${missing.join(', ')}`);
}

updateViewport();

function bootstrapMenu() {
  try {
    assertRequiredDomNodes();
    sanitizeCampaignState();
    syncProgressUnlocks();
    saveMeta();
    saveUnlocks();
    setCampaignSelectionToLatestPlayable();
    saveCampaign();
    validateCampaignDefinitions();
    buildMeta();
    showPage('home');
    initDock();
    initAbilities();
    refreshWavePreview();
    showToast('Baue zuerst, dann tippe auf ▶️. Doppeltippen für Übersicht.');
    requestAnimationFrame(animate);
  } catch (err) {
    showMenuFallback('Menu failed to load. Tap to reload.', err);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrapMenu, { once: true });
else bootstrapMenu();
