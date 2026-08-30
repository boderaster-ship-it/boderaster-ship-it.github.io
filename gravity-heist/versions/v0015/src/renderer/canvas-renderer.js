import { CFG } from '../config.js';
import { CameraRig } from './camera.js';

export function compositionPolicy(){return{gameZ:'1',sceneZ:'0',scenePointer:'none',sceneBlend:'normal',sceneOpacity:'1'};}

const DEFAULT_THEME = {
  floor: '#071119',
  floor2: '#102632',
  wall: '#1b3540',
  wall2: '#0a171e',
  bridge: '#284752',
  line: 'rgba(130,226,248,.16)',
  zone: 'rgba(83,167,194,.055)',
  accent: '#78eaff',
  security: '#ff3a66',
};

export class CanvasRenderer {
  constructor(canvas) {
    this.c = canvas;
    this.scene = document.querySelector('#scene');
    this.applyCompositionPolicy();
    this.x = canvas.getContext('2d', { alpha: true });
    this.dpr = 1;
    this.flash = 0;
    this.preview = null;
    this.camera = new CameraRig();
    this.viewState = null;
    this.gpuBackdrop = true;
    this.resize();
    this.assertComposition();
    const badge=document.querySelector('#version'); if(badge)badge.textContent='v0014';
    globalThis.__gravityHeistBuild='v0014';
    addEventListener('resize', () => this.resize());
  }

  resize() {
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.c.width = Math.floor(innerWidth * this.dpr);
    this.c.height = Math.floor(innerHeight * this.dpr);
  }

  applyCompositionPolicy(){
    const p=compositionPolicy();
    Object.assign(this.c.style,{zIndex:p.gameZ,touchAction:'none'});
    if(this.scene)Object.assign(this.scene.style,{zIndex:p.sceneZ,pointerEvents:p.scenePointer,mixBlendMode:p.sceneBlend,opacity:p.sceneOpacity,filter:'none'});
  }

  getCompositionStats(){
    const g=getComputedStyle(this.c),s=this.scene?getComputedStyle(this.scene):null;
    return{gpuBackdrop:this.gpuBackdrop,canvasAlpha:true,gameZ:Number.parseInt(g.zIndex,10)||0,sceneZ:s?(Number.parseInt(s.zIndex,10)||0):null,scenePointer:s?.pointerEvents||null,sceneBlend:s?.mixBlendMode||null,sceneOpacity:s?Number.parseFloat(s.opacity):null};
  }

  assertComposition(){
    const v=this.getCompositionStats();
    if(this.scene&&!(v.gameZ>v.sceneZ))throw Error(`RENDER CONTRACT game must be above scene: ${v.gameZ}/${v.sceneZ}`);
    if(this.scene&&v.scenePointer!=='none')throw Error(`RENDER CONTRACT scene pointer-events: ${v.scenePointer}`);
    if(this.scene&&v.sceneBlend!=='normal')throw Error(`RENDER CONTRACT unsafe blend mode: ${v.sceneBlend}`);
    if(this.scene&&v.sceneOpacity<.99)throw Error(`RENDER CONTRACT scene opacity: ${v.sceneOpacity}`);
    globalThis.__gravityHeistRenderContract=v;
    console.info('GRAVITY HEIST render contract passed',v);
    return v;
  }

  setGpuBackdrop(enabled) { this.gpuBackdrop = !!enabled; }

  map(g, dt) {
    this.camera.update(g.player, g.world.gravity, dt, document.body.classList.contains('reduce-motion'));
    return this.camera.view(this.c.width, this.c.height);
  }

  resetCamera(player) { this.camera.reset(player); }
  getView() { return this.viewState; }
  getCameraStats() { return this.camera.getStats(); }
  gravityPulse() { this.flash = 1; this.camera.onGravityShift(); }
  setPreview(dx, dy, dir) { this.preview = dir ? { dx, dy, dir } : null; }

  render(g, dt) {
    this.flash = Math.max(0, this.flash - dt * 3.7);
    const x = this.x;
    const w = this.c.width;
    const h = this.c.height;
    const m = this.map(g, dt);
    const theme = { ...DEFAULT_THEME, ...g.level?.theme };
    this.viewState = m;

    if (this.gpuBackdrop) {
      x.clearRect(0, 0, w, h);
    } else {
      const danger = g.security?.alert || 0;
      const bg = x.createRadialGradient(w * .54, h * .38, 0, w * .5, h * .5, w * .7);
      bg.addColorStop(0, danger > 70 ? '#3a1924' : theme.floor2);
      bg.addColorStop(.5, theme.floor);
      bg.addColorStop(1, '#030609');
      x.fillStyle = bg;
      x.fillRect(0, 0, w, h);
    }

    x.save();
    x.translate(m.ox, m.oy);
    x.scale(m.s, m.s);
    this.room(x, g.level, theme, this.gpuBackdrop);
    this.security(x, g.security, theme);
    this.exit(x, g.exit, g.hasLoot, theme);
    for (const p of g.props) this.body(x, p, theme);
    if (!g.hasBonus && g.bonus) this.body(x, g.bonus, theme);
    if (!g.hasLoot) this.body(x, g.loot, theme);
    this.body(x, g.player, theme);
    this.gravityVector(x, g.world.gravity, theme);
    if (this.preview) this.previewArrow(x, this.preview, theme);

    if (this.flash) {
      x.fillStyle = `rgba(180,120,255,${this.flash * (g.level?.id === 'helix' ? .10 : .06)})`;
      x.fillRect(0, 0, CFG.world.w, CFG.world.h);
    }
    if (g.alertPulse) {
      x.fillStyle = `rgba(255,40,105,${g.alertPulse * .09})`;
      x.fillRect(0, 0, CFG.world.w, CFG.world.h);
    }
    if (g.impactPulse) {
      x.strokeStyle = `rgba(255,231,170,${g.impactPulse * .65})`;
      x.lineWidth = 3 + g.impactPulse * 8;
      x.beginPath();
      x.arc(g.player.x, g.player.y, 28 + g.impactPulse * 28, 0, Math.PI * 2);
      x.stroke();
    }
    x.restore();
  }

  room(x, level, t, overlay = false) {
    const { w, h, pad } = CFG.world;
    if (!overlay) {
      x.fillStyle = t.floor;
      x.fillRect(pad, pad, w - pad * 2, h - pad * 2);
      const grd = x.createLinearGradient(0, pad, 0, h - pad);
      grd.addColorStop(0, t.floor2);
      grd.addColorStop(1, t.floor);
      x.fillStyle = grd;
      x.fillRect(pad + 5, pad + 5, w - pad * 2 - 10, h - pad * 2 - 10);
    } else {
      x.fillStyle = 'rgba(3,9,14,.10)';
      x.fillRect(pad, pad, w - pad * 2, h - pad * 2);
    }

    for (const z of level?.zones || []) {
      x.save();
      x.globalAlpha = overlay ? .78 : 1;
      x.fillStyle = t.zone;
      x.fillRect(z.x, z.y, z.w, z.h);
      x.strokeStyle = t.line;
      x.globalAlpha = overlay ? .60 : .45;
      x.strokeRect(z.x, z.y, z.w, z.h);
      x.globalAlpha = overlay ? .60 : .38;
      x.font = '800 8px sans-serif';
      x.fillStyle = t.accent;
      x.fillText(z.label, z.x + 10, z.y + 14);
      x.restore();
    }

    for (const s of level?.solids || []) {
      x.save();
      x.globalAlpha = overlay ? .28 : 1;
      const sg = x.createLinearGradient(s.x, s.y, s.x + s.w, s.y + s.h);
      sg.addColorStop(0, s.kind === 'bridge' ? t.bridge : t.wall);
      sg.addColorStop(1, t.wall2);
      x.fillStyle = sg;
      x.shadowColor = overlay ? 'transparent' : 'rgba(0,0,0,.55)';
      x.shadowBlur = overlay ? 0 : 12;
      x.fillRect(s.x, s.y, s.w, s.h);
      x.shadowBlur = 0;
      x.globalAlpha = overlay ? .72 : 1;
      x.strokeStyle = t.line;
      x.strokeRect(s.x + .5, s.y + .5, s.w - 1, s.h - 1);
      if (level?.id === 'helix' && s.kind === 'spine') {
        x.fillStyle = 'rgba(217,156,255,.24)';
        for (let y = s.y + 8; y < s.y + s.h; y += 18) x.fillRect(s.x + 3, y, s.w - 6, 2);
      }
      x.restore();
    }

    if (level?.id === 'helix') {
      x.strokeStyle = 'rgba(105,245,255,.12)';
      for (let i = 0; i < 9; i++) {
        x.beginPath();
        x.arc(540, 280, 52 + i * 24, 0, Math.PI * 2);
        x.stroke();
      }
      x.fillStyle = 'rgba(217,156,255,.07)';
      x.beginPath();
      x.arc(540, 280, 72, 0, Math.PI * 2);
      x.fill();
    } else {
      x.strokeStyle = 'rgba(109,218,244,.07)';
      for (let i = 0; i < 12; i++) {
        x.beginPath();
        x.moveTo(pad + 6, i * 44 + pad);
        x.lineTo(w - pad - 6, i * 44 + pad);
        x.stroke();
      }
    }
  }

  security(x, s, t) {
    if (!s) return;
    const tm = performance.now() / 480;
    for (const l of s.lasers) {
      const active = Math.sin(tm + l.phase) > .05;
      x.save();
      x.strokeStyle = active ? t.security : 'rgba(255,58,102,.14)';
      x.shadowColor = t.security;
      x.shadowBlur = active ? 12 : 0;
      x.lineWidth = active ? 2 : 1;
      x.setLineDash(active ? [] : [8, 8]);
      x.beginPath();
      x.moveTo(l.x1, l.y1);
      x.lineTo(l.x2, l.y2);
      x.stroke();
      x.restore();
    }
    for (const g of s.guards) {
      x.save();
      x.translate(g.x, g.y);
      const speed = Math.hypot(g.vx, g.vy);
      const a = speed > 8 ? Math.atan2(g.vy, g.vx) : (g.axis === 'x' ? (g.dir > 0 ? 0 : Math.PI) : (g.dir > 0 ? Math.PI / 2 : -Math.PI / 2));
      x.rotate(a);
      x.fillStyle = s.state === 'LOCKDOWN' ? t.security : '#f4fbff';
      x.shadowColor = s.state === 'STEALTH' ? t.accent : t.security;
      x.shadowBlur = 18;
      x.beginPath();
      x.moveTo(16, 0); x.lineTo(-11, -10); x.lineTo(-7, 0); x.lineTo(-11, 10); x.closePath(); x.fill();
      x.globalAlpha = .10 + .22 * g.seen;
      x.fillStyle = t.security;
      x.beginPath(); x.moveTo(8, 0); x.arc(0, 0, 150, -.32, .32); x.closePath(); x.fill();
      x.restore();
    }
  }

  exit(x, e, active, t) {
    x.save();
    x.translate(e.x, e.y);
    x.strokeStyle = active ? t.accent : '#496673';
    x.lineWidth = 4;
    x.shadowColor = active ? t.accent : 'transparent';
    x.shadowBlur = 18;
    x.beginPath(); x.arc(0, 0, e.r, 0, Math.PI * 2); x.stroke();
    x.fillStyle = active ? 'rgba(90,255,194,.14)' : 'rgba(70,90,100,.12)'; x.fill();
    x.font = '800 10px sans-serif'; x.textAlign = 'center';
    x.fillStyle = active ? t.accent : '#7894a1'; x.fillText(active ? 'EXTRACT' : 'LOCKED', 0, 4);
    x.restore();
  }

  body(x, b, t) {
    if (!b || b.hidden) return;
    x.save(); x.translate(b.x, b.y); x.shadowBlur = 22;
    x.shadowColor = b.type === 'player' ? t.accent : b.type === 'loot' ? 'rgba(255,216,112,.5)' : b.type === 'bonus' ? 'rgba(210,130,255,.55)' : 'rgba(0,0,0,.45)';
    if (b.type === 'player') {
      x.strokeStyle = 'rgba(255,255,255,.72)'; x.lineWidth = 2.2; x.beginPath(); x.arc(0, 0, b.r + 7, 0, Math.PI * 2); x.stroke();
      x.rotate(Math.atan2(b.vy, b.vx) || 0);
      const g = x.createLinearGradient(-20, -20, 20, 20); g.addColorStop(0, '#ffffff'); g.addColorStop(.45, t.accent); g.addColorStop(1, '#26436b');
      x.fillStyle = g; x.beginPath(); x.moveTo(22, 0); x.lineTo(-15, -14); x.lineTo(-8, 0); x.lineTo(-15, 14); x.closePath(); x.fill();
    } else if (b.type === 'loot' || b.type === 'bonus') {
      x.rotate(performance.now() / (b.type === 'bonus' ? 420 : 600)); x.fillStyle = b.type === 'bonus' ? '#daa7ff' : '#ffe7a0'; x.beginPath();
      const n = b.type === 'bonus' ? 6 : 8; for (let i = 0; i < n; i++) { const a = Math.PI * 2 * i / n, rr = i % 2 ? b.r * .55 : b.r; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill();
    } else {
      const g = x.createRadialGradient(-8, -10, 2, 0, 0, b.r); g.addColorStop(0, b.type === 'orb' ? t.accent : '#7094a5'); g.addColorStop(1, b.type === 'orb' ? t.wall : t.wall2);
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, b.r, 0, Math.PI * 2); x.fill(); x.strokeStyle = t.line; x.stroke();
    }
    x.restore();
  }

  gravityVector(x, g, t) {
    const mag = Math.hypot(g.x, g.y) || 1, dx = g.x / mag, dy = g.y / mag;
    x.save(); x.translate(74, 486); x.strokeStyle = t.accent; x.fillStyle = t.accent; x.lineWidth = 3;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(dx * 34, dy * 34); x.stroke(); x.translate(dx * 34, dy * 34); x.rotate(Math.atan2(dy, dx));
    x.beginPath(); x.moveTo(8, 0); x.lineTo(-4, -5); x.lineTo(-4, 5); x.closePath(); x.fill(); x.restore();
  }

  previewArrow(x, p, t) {
    const len = Math.min(90, Math.hypot(p.dx, p.dy) / 2); if (len < 14) return; const a = Math.atan2(p.dy, p.dx);
    x.save(); x.translate(500, 280); x.rotate(a); x.strokeStyle = t.accent; x.fillStyle = t.accent; x.lineWidth = 5; x.lineCap = 'round';
    x.beginPath(); x.moveTo(-len * .45, 0); x.lineTo(len * .45, 0); x.stroke(); x.translate(len * .45, 0); x.beginPath(); x.moveTo(12, 0); x.lineTo(-7, -8); x.lineTo(-7, 8); x.closePath(); x.fill(); x.restore();
  }
}
