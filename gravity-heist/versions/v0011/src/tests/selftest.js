import { classifyGesture, classifySwipe, resolveDirection } from '../input/gesture.js';
import { PhysicsWorld } from '../physics/world.js';
import { SecuritySystem, guardCanSee, lineBlocked } from '../security/security.js';
import { impactProfile } from '../audio/audio.js';
import { MUSEUM } from '../levels/museum.js';
import { HELIX } from '../levels/helix.js';
import { GameState } from '../game/state.js';
import { gradeRun, betterGrade, gradeValue } from '../game/mastery.js';
import { qualityForFrame, qualityForMode } from '../renderer/webgl-scene.js';
import { CameraRig, cameraTarget } from '../renderer/camera.js';
import { normalizeSettings, DEFAULT_SETTINGS } from '../persistence/settings.js';

const ok = (name, value) => { if (!value) throw Error(`SELFTEST ${name}`); return 1; };

export function selfTest() {
  let n = 0;
  n += ok('right', classifySwipe(90, 8, 120) === 'right');
  n += ok('up', classifySwipe(2, -90, 120) === 'up');
  n += ok('deadzone', classifySwipe(10, 10, 80) === null);
  n += ok('slow', classifySwipe(50, 0, 900) === null);
  n += ok('gesture-tap', classifyGesture(4, 3, 140).type === 'tap');
  n += ok('gesture-hold', classifyGesture(3, 2, 520).type === 'hold');
  n += ok('gesture-drag', classifyGesture(30, 5, 480).type === 'drag');
  n += ok('diagonal-ambiguous', resolveDirection(30, 28) === null);
  n += ok('hysteresis-retains-axis', resolveDirection(42, 50, 'right') === 'right');
  n += ok('hysteresis-switches-axis', resolveDirection(30, 70, 'right') === 'down');
  n += ok('hysteresis-allows-reversal', resolveDirection(-52, 4, 'right') === 'left');

  const w = new PhysicsWorld(), b = w.add({ x: 100, y: 100, r: 10 }); w.step(0.016); n += ok('physics', b.y > 100);
  const c = new PhysicsWorld(); c.setSolids([{ x: 120, y: 80, w: 20, h: 120 }]); const cb = c.add({ x: 90, y: 130, r: 12, vx: 240 }); for (let i = 0; i < 24; i += 1) c.step(1 / 120); n += ok('wall-collision', cb.x <= 108.5);
  const f = new PhysicsWorld(); f.setSolids([{ x: 80, y: 150, w: 180, h: 16 }]); const fb = f.add({ x: 140, y: 110, r: 12 }); for (let i = 0; i < 60; i += 1) f.step(1 / 120); n += ok('platform-collision', fb.y <= 138.5);
  const bw = new PhysicsWorld(), ba = bw.add({ x: 100, y: 100, r: 14, vx: 180, mass: 1 }), bb = bw.add({ x: 132, y: 100, r: 14, vx: -40, mass: 1.5 }); for (let i = 0; i < 12; i += 1) bw.step(1 / 120); n += ok('body-separation', Math.hypot(ba.x - bb.x, ba.y - bb.y) >= 27.5); n += ok('body-response', ba.vx < 180 && bb.vx > -40); n += ok('museum-solids', MUSEUM.solids.length >= 8);

  const s = new SecuritySystem(), p = { x: 300, y: 160, r: 18 }; for (let i = 0; i < 90; i += 1) s.update(1 / 60, p, 0); n += ok('laser-alert', s.alert > 0); s.trip('TEST', 60); n += ok('risk-mult', s.multiplier() > 1.3);
  const gw = new PhysicsWorld(), gs = new SecuritySystem(); gs.bindWorld(gw); n += ok('guard-physics-body', gw.bodies.length === 2 && gs.guards.every((g) => g.type === 'guard' && g.dynamic)); const gy = gs.guards[0].y; gw.setGravity('down'); for (let i = 0; i < 12; i += 1) gw.step(1 / 60); n += ok('guard-gravity-response', gs.guards[0].y > gy); const before = gs.alert; gs.impact({ a: gs.guards[0], b: { type: 'player' }, strength: 140 }); n += ok('guard-impact-alert', gs.alert > before);

  const guard = { x: 100, y: 100, vx: 30, vy: 0, axis: 'x', dir: 1 }, target = { x: 220, y: 100 }; n += ok('los-clear', guardCanSee(guard, target, [])); n += ok('los-blocked', !guardCanSee(guard, target, [{ x: 150, y: 60, w: 20, h: 80 }])); n += ok('segment-blocked', lineBlocked(guard, target, [{ x: 150, y: 60, w: 20, h: 80 }])); n += ok('fov-reject', !guardCanSee(guard, { x: 100, y: 220 }, []));

  const light = impactProfile('metal', 70), heavy = impactProfile('metal', 220); n += ok('impact-tier', light.tier === 'light' && heavy.tier === 'heavy' && heavy.v > light.v); n += ok('adaptive-quality-down', qualityForFrame(28, 1) < 1); n += ok('adaptive-quality-up', qualityForFrame(14, 0.72) > 0.72); n += ok('quality-performance', qualityForMode('performance', 1) < 0.7); n += ok('quality-forced', qualityForMode('quality', 0.6) === 1);

  const camTarget = cameraTarget({ x: 500, y: 280, vx: 320, vy: 0 }, { x: 1, y: 0 }); n += ok('camera-lookahead', camTarget.x > 540 && camTarget.y === 280);
  const cam = new CameraRig(); cam.reset({ x: 120, y: 120 }); const startX = cam.x; for (let i = 0; i < 45; i += 1) cam.update({ x: 760, y: 360, vx: 0, vy: 0 }, { x: 0, y: 1 }, 1 / 60); n += ok('camera-damped-follow', cam.x > startX + 300 && cam.x < 800); const preKickZoom = cam.zoom; cam.onGravityShift(); cam.update({ x: 760, y: 360, vx: 0, vy: 0 }, { x: 1, y: 0 }, 1 / 60); n += ok('camera-shift-pullback', cam.zoom < preKickZoom); const view = cam.view(1000, 560); n += ok('camera-view-clamped', view.cx >= 0 && view.cx <= 1000 && view.cy >= 0 && view.cy <= 560); const reduced = new CameraRig(); reduced.reset({ x: 500, y: 280 }); reduced.onGravityShift(); reduced.update({ x: 500, y: 280, vx: 0, vy: 0 }, { x: 0, y: 1 }, .1, true); n += ok('camera-reduced-motion-fast-settle', reduced.shiftKick < .1);

  const defaults = normalizeSettings(); n += ok('settings-defaults', defaults.quality === DEFAULT_SETTINGS.quality && defaults.reducedMotion === false); const sanitized = normalizeSettings({ master: 4, fx: -2, quality: 'nonsense', haptics: false, reducedMotion: true }); n += ok('settings-clamp', sanitized.master === 1 && sanitized.fx === 0); n += ok('settings-quality-sanitize', sanitized.quality === 'auto'); n += ok('settings-accessibility', sanitized.haptics === false && sanitized.reducedMotion === true);

  n += ok('helix-distinct-layout', HELIX.solids.length >= 8 && HELIX.vectorLocks.length === 2); n += ok('helix-security-profile', HELIX.security.guards.length === 2 && HELIX.security.lasers.length === 3); const hg = new GameState(HELIX), lock = hg.vectorLocks[0]; hg.mode = 'play'; hg.player.x = lock.x; hg.player.y = lock.y; const solidBefore = hg.world.solids.length; hg.shift(lock.dir); n += ok('vector-lock-open', hg.vectorLocks[0].open); n += ok('vector-door-removed', hg.world.solids.length === solidBefore - 1); const second = hg.vectorLocks[1]; hg.player.x = second.x; hg.player.y = second.y; hg.shift('left'); n += ok('wrong-vector-stays-locked', !second.open);

  const mock = { level: MUSEUM, hasBonus: true, peakAlert: 20, peakHeat: 30, shifts: 8, elapsed: 42, impactCount: 1, vectorLocks: [], locksOpen: () => 0, score: () => 12500 }; const master = gradeRun(mock); n += ok('mastery-s-grade', master.grade === 'S'); n += ok('mastery-phantom', master.badges.some((badge) => badge.id === 'phantom')); n += ok('mastery-collector', master.badges.some((badge) => badge.id === 'collector')); n += ok('grade-order', betterGrade('B', 'A') === 'A' && betterGrade('S', 'A') === 'S'); n += ok('grade-value', gradeValue('S') > gradeValue('A')); const loud = { ...mock, hasBonus: false, peakAlert: 90, shifts: 19, elapsed: 88, score: () => 6000 }; n += ok('mastery-risk-style', gradeRun(loud).badges.some((badge) => badge.id === 'highwire'));
  console.info(`GRAVITY HEIST self-test: ${n} assertions passed`);
}
