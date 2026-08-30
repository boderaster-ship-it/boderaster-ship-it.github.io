import { CFG } from '../config.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));

export function cameraTarget(player, gravity, world = CFG.world) {
  const vx = Number.isFinite(player?.vx) ? player.vx : 0;
  const vy = Number.isFinite(player?.vy) ? player.vy : 0;
  const speed = Math.hypot(vx, vy);
  const moveScale = speed > 1 ? Math.min(58, speed * 0.075) / speed : 0;
  const gx = gravity?.x || 0;
  const gy = gravity?.y || 0;
  const gm = Math.hypot(gx, gy) || 1;
  const gravityLead = 34;
  return {
    x: clamp((player?.x ?? world.w / 2) + vx * moveScale + (gx / gm) * gravityLead, world.pad, world.w - world.pad),
    y: clamp((player?.y ?? world.h / 2) + vy * moveScale + (gy / gm) * gravityLead, world.pad, world.h - world.pad),
  };
}

export class CameraRig {
  constructor(world = CFG.world) {
    this.world = world;
    this.x = world.w / 2;
    this.y = world.h / 2;
    this.zoom = 1.16;
    this.targetZoom = 1.16;
    this.shiftKick = 0;
  }

  reset(player) {
    this.x = player?.x ?? this.world.w / 2;
    this.y = player?.y ?? this.world.h / 2;
    this.zoom = this.targetZoom;
    this.shiftKick = 0;
  }

  onGravityShift() {
    this.shiftKick = 1;
  }

  update(player, gravity, dt, reducedMotion = false) {
    const target = cameraTarget(player, gravity, this.world);
    const posLambda = reducedMotion ? 18 : 7.5;
    this.x = damp(this.x, target.x, posLambda, dt);
    this.y = damp(this.y, target.y, posLambda, dt);
    this.shiftKick = Math.max(0, this.shiftKick - dt * (reducedMotion ? 10 : 3.2));
    const speed = Math.hypot(player?.vx || 0, player?.vy || 0);
    const speedZoom = Math.min(0.08, speed / 2400);
    this.targetZoom = reducedMotion ? 1.12 : 1.16 - speedZoom - this.shiftKick * 0.035;
    this.zoom = damp(this.zoom, this.targetZoom, reducedMotion ? 18 : 5.5, dt);
  }

  view(canvasWidth, canvasHeight) {
    const fit = Math.min(canvasWidth / this.world.w, canvasHeight / this.world.h);
    const scale = fit * this.zoom;
    const halfW = canvasWidth / (2 * scale);
    const halfH = canvasHeight / (2 * scale);
    const minX = Math.min(halfW, this.world.w / 2);
    const maxX = Math.max(this.world.w - halfW, this.world.w / 2);
    const minY = Math.min(halfH, this.world.h / 2);
    const maxY = Math.max(this.world.h - halfH, this.world.h / 2);
    const cx = clamp(this.x, minX, maxX);
    const cy = clamp(this.y, minY, maxY);
    return { s: scale, ox: canvasWidth / 2 - cx * scale, oy: canvasHeight / 2 - cy * scale, cx, cy, zoom: this.zoom };
  }

  getStats() {
    return { x: +this.x.toFixed(1), y: +this.y.toFixed(1), zoom: +this.zoom.toFixed(3), shiftKick: +this.shiftKick.toFixed(2) };
  }
}
