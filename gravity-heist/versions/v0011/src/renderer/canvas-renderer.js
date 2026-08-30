import { CFG } from '../config.js';
import { CameraRig } from './camera.js';

export class CanvasRenderer {
  constructor(canvas) {
    this.c = canvas;
    this.x = canvas.getContext('2d', { alpha: false });
    this.dpr = 1;
    this.flash = 0;
    this.preview = null;
    this.camera = new CameraRig();
    this.viewState = null;
    this.resize();
    addEventListener('resize', () => this.resize());
  }
  resize() { this.dpr = Math.min(devicePixelRatio || 1, 2); this.c.width = Math.floor(innerWidth * this.dpr); this.c.height = Math.floor(innerHeight * this.dpr); }
  map(g, dt) { this.camera.update(g.player, g.world.gravity, dt, document.body.classList.contains('reduce-motion')); return this.camera.view(this.c.width, this.c.height); }
  resetCamera(player) { this.camera.reset(player); }
  getView() { return this.viewState; }
  getCameraStats() { return this.camera.getStats(); }
  gravityPulse() { this.flash = 1; this.camera.onGravityShift(); }
  setPreview(dx, dy, dir) { this.preview = dir ? { dx, dy, dir } : null; }
  render(g, dt) {
    this.flash = Math.max(0, this.flash - dt * 3.7);
    const x = this.x, w = this.c.width, h = this.c.height, m = this.map(g, dt);
    this.viewState = m;
    const danger = g.security?.alert || 0, bg = x.createRadialGradient(w * .54, h * .38, 0, w * .5, h * .5, w * .7);
    bg.addColorStop(0, danger > 70 ? '#3a1924' : '#173142'); bg.addColorStop(.5, '#09141d'); bg.addColorStop(1, '#030609');
    x.fillStyle = bg; x.fillRect(0, 0, w, h); x.save(); x.translate(m.ox, m.oy); x.scale(m.s, m.s);
    this.room(x, g.level); this.security(x, g.security, g.player); this.exit(x, g.exit, g.hasLoot);
    for (const p of g.props) this.body(x, p); if (!g.hasBonus) this.body(x, g.bonus); if (!g.hasLoot) this.body(x, g.loot); this.body(x, g.player); this.gravityVector(x, g.world.gravity); if (this.preview) this.previewArrow(x, this.preview);
    if (this.flash) { x.fillStyle = `rgba(112,234,255,${this.flash * .08})`; x.fillRect(0, 0, CFG.world.w, CFG.world.h); }
    if (g.alertPulse) { x.fillStyle = `rgba(255,40,85,${g.alertPulse * .09})`; x.fillRect(0, 0, CFG.world.w, CFG.world.h); }
    if (g.impactPulse) { x.strokeStyle = `rgba(255,231,170,${g.impactPulse * .65})`; x.lineWidth = 3 + g.impactPulse * 8; x.beginPath(); x.arc(g.player.x, g.player.y, 28 + g.impactPulse * 28, 0, Math.PI * 2); x.stroke(); }
    x.restore();
  }
  room(x, level) {
    const { w, h, pad } = CFG.world; x.fillStyle = '#071119'; x.fillRect(pad, pad, w - pad * 2, h - pad * 2);
    const grd = x.createLinearGradient(0, pad, 0, h - pad); grd.addColorStop(0, '#102632'); grd.addColorStop(1, '#08131a'); x.fillStyle = grd; x.fillRect(pad + 5, pad + 5, w - pad * 2 - 10, h - pad * 2 - 10);
    for (const z of level?.zones || []) { const zg = x.createLinearGradient(z.x, z.y, z.x + z.w, z.y + z.h); zg.addColorStop(0, 'rgba(83,167,194,.055)'); zg.addColorStop(1, 'rgba(9,20,28,.03)'); x.fillStyle = zg; x.fillRect(z.x, z.y, z.w, z.h); x.strokeStyle = 'rgba(122,223,246,.07)'; x.strokeRect(z.x, z.y, z.w, z.h); x.font = '800 8px sans-serif'; x.fillStyle = 'rgba(132,193,211,.28)'; x.fillText(z.label, z.x + 10, z.y + 14); }
    for (const s of level?.solids || []) { const sg = x.createLinearGradient(s.x, s.y, s.x + s.w, s.y + s.h); sg.addColorStop(0, s.kind === 'bridge' ? '#284752' : '#1b3540'); sg.addColorStop(.48, '#102630'); sg.addColorStop(1, '#0a171e'); x.fillStyle = sg; x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 12; x.fillRect(s.x, s.y, s.w, s.h); x.shadowBlur = 0; x.strokeStyle = 'rgba(130,226,248,.16)'; x.strokeRect(s.x + .5, s.y + .5, s.w - 1, s.h - 1); if (s.kind === 'bridge') { x.strokeStyle = 'rgba(100,231,255,.12)'; for (let i = 12; i < s.w; i += 28) { x.beginPath(); x.moveTo(s.x + i, s.y + 2); x.lineTo(s.x + i - 8, s.y + s.h - 2); x.stroke(); } } }
    x.strokeStyle = 'rgba(109,218,244,.045)'; x.lineWidth = 1; for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(pad + 6, i * 44 + pad); x.lineTo(w - pad - 6, i * 44 + pad); x.stroke(); }
  }
  security(x, s) {
    if (!s) return; const t = performance.now() / 480;
    for (const l of s.lasers) { const active = Math.sin(t + l.phase) > .05; x.save(); x.strokeStyle = active ? 'rgba(255,58,102,.72)' : 'rgba(255,58,102,.14)'; x.shadowColor = '#ff315e'; x.shadowBlur = active ? 12 : 0; x.lineWidth = active ? 2 : 1; x.setLineDash(active ? [] : [8, 8]); x.beginPath(); x.moveTo(l.x1, l.y1); x.lineTo(l.x2, l.y2); x.stroke(); x.restore(); }
    for (const g of s.guards) { x.save(); x.translate(g.x, g.y); const speed = Math.hypot(g.vx, g.vy), a = speed > 8 ? Math.atan2(g.vy, g.vx) : (g.axis === 'x' ? (g.dir > 0 ? 0 : Math.PI) : (g.dir > 0 ? Math.PI / 2 : -Math.PI / 2)); x.rotate(a); x.fillStyle = s.state === 'LOCKDOWN' ? '#ff4b6e' : '#d6e3e8'; x.shadowColor = s.state === 'STEALTH' ? 'rgba(100,220,255,.25)' : 'rgba(255,55,95,.55)'; x.shadowBlur = 16; x.beginPath(); x.moveTo(16, 0); x.lineTo(-11, -10); x.lineTo(-7, 0); x.lineTo(-11, 10); x.closePath(); x.fill(); x.globalAlpha = .08 + .18 * g.seen; x.fillStyle = '#ff5578'; x.beginPath(); x.moveTo(8, 0); x.arc(0, 0, 150, -.32, .32); x.closePath(); x.fill(); x.restore(); }
    if (s.state !== 'STEALTH') { x.save(); x.font = '900 11px sans-serif'; x.fillStyle = s.state === 'LOCKDOWN' ? '#ff5a78' : '#ffbb70'; x.fillText(s.state, 470, 62); x.restore(); }
  }
  exit(x, e, active) { x.save(); x.translate(e.x, e.y); x.strokeStyle = active ? '#7affcf' : '#36505b'; x.lineWidth = 4; x.shadowColor = active ? '#7affcf' : 'transparent'; x.shadowBlur = 18; x.beginPath(); x.arc(0, 0, e.r, 0, Math.PI * 2); x.stroke(); x.fillStyle = active ? 'rgba(90,255,194,.12)' : 'rgba(70,90,100,.08)'; x.fill(); x.font = '800 10px sans-serif'; x.textAlign = 'center'; x.fillStyle = active ? '#a8ffe0' : '#55707e'; x.fillText(active ? 'EXTRACT' : 'LOCKED', 0, 4); x.restore(); }
  body(x, b) { if (b.hidden) return; x.save(); x.translate(b.x, b.y); x.shadowBlur = 22; x.shadowColor = b.type === 'player' ? 'rgba(120,234,255,.42)' : b.type === 'loot' ? 'rgba(255,216,112,.5)' : b.type === 'bonus' ? 'rgba(210,130,255,.55)' : 'rgba(0,0,0,.45)'; if (b.type === 'player') { x.rotate(Math.atan2(b.vy, b.vx) || 0); const g = x.createLinearGradient(-20, -20, 20, 20); g.addColorStop(0, '#d8fbff'); g.addColorStop(.45, '#71e8ff'); g.addColorStop(1, '#12617a'); x.fillStyle = g; x.beginPath(); x.moveTo(20, 0); x.lineTo(-14, -13); x.lineTo(-8, 0); x.lineTo(-14, 13); x.closePath(); x.fill(); } else if (b.type === 'loot' || b.type === 'bonus') { x.rotate(performance.now() / (b.type === 'bonus' ? 420 : 600)); x.fillStyle = b.type === 'bonus' ? '#daa7ff' : '#ffe7a0'; x.beginPath(); const n = b.type === 'bonus' ? 6 : 8; for (let i = 0; i < n; i++) { const a = Math.PI * 2 * i / n, r = i % 2 ? b.r * .55 : b.r; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill(); if (b.type === 'bonus') { x.font = '900 7px sans-serif'; x.textAlign = 'center'; x.fillStyle = '#f4dcff'; x.fillText('BONUS', 0, -17); } } else { const g = x.createRadialGradient(-8, -10, 2, 0, 0, b.r); g.addColorStop(0, b.type === 'orb' ? '#d5a9ff' : '#507183'); g.addColorStop(1, b.type === 'orb' ? '#5b3984' : '#172a35'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, b.r, 0, Math.PI * 2); x.fill(); x.strokeStyle = 'rgba(255,255,255,.18)'; x.stroke(); } x.restore(); }
  gravityVector(x, g) { const mag = Math.hypot(g.x, g.y) || 1, dx = g.x / mag, dy = g.y / mag; x.save(); x.translate(74, 486); x.strokeStyle = 'rgba(120,234,255,.6)'; x.fillStyle = '#78eaff'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 0); x.lineTo(dx * 34, dy * 34); x.stroke(); x.translate(dx * 34, dy * 34); x.rotate(Math.atan2(dy, dx)); x.beginPath(); x.moveTo(8, 0); x.lineTo(-4, -5); x.lineTo(-4, 5); x.closePath(); x.fill(); x.restore(); }
  previewArrow(x, p) { const len = Math.min(90, Math.hypot(p.dx, p.dy) / 2); if (len < 14) return; const a = Math.atan2(p.dy, p.dx); x.save(); x.translate(500, 280); x.rotate(a); x.strokeStyle = 'rgba(205,249,255,.8)'; x.fillStyle = '#d9fbff'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(-len * .45, 0); x.lineTo(len * .45, 0); x.stroke(); x.translate(len * .45, 0); x.beginPath(); x.moveTo(12, 0); x.lineTo(-7, -8); x.lineTo(-7, 8); x.closePath(); x.fill(); x.restore(); }
}
