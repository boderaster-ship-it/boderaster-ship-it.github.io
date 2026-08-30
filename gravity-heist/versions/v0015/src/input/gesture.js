export const GESTURE_DEFAULTS = Object.freeze({
  tapMove: 16,
  tapMaxMs: 260,
  holdMs: 380,
  dragDistance: 18,
  previewDistance: 28,
  swipeDistance: 44,
  minVelocity: 0.17,
  axisBias: 1.15,
  switchBias: 1.5,
});

function distance(dx, dy) {
  return Math.hypot(dx, dy);
}

function rawDirection(dx, dy, axisBias = GESTURE_DEFAULTS.axisBias) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax >= ay * axisBias) return dx >= 0 ? 'right' : 'left';
  if (ay >= ax * axisBias) return dy >= 0 ? 'down' : 'up';
  return null;
}

export function resolveDirection(dx, dy, locked = null, options = {}) {
  const cfg = { ...GESTURE_DEFAULTS, ...options };
  const candidate = rawDirection(dx, dy, cfg.axisBias);
  if (!locked) return candidate;
  if (!candidate || candidate === locked) return locked;

  const lockedHorizontal = locked === 'left' || locked === 'right';
  const candidateHorizontal = candidate === 'left' || candidate === 'right';
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);

  if (lockedHorizontal === candidateHorizontal) {
    const magnitude = candidateHorizontal ? ax : ay;
    return magnitude >= cfg.previewDistance * 1.2 ? candidate : locked;
  }

  const oldAxis = lockedHorizontal ? ax : ay;
  const newAxis = candidateHorizontal ? ax : ay;
  return newAxis >= Math.max(cfg.previewDistance, oldAxis * cfg.switchBias)
    ? candidate
    : locked;
}

export function classifyGesture(dx, dy, dt, options = {}) {
  const cfg = { ...GESTURE_DEFAULTS, ...options };
  const d = distance(dx, dy);
  const velocity = d / Math.max(dt, 1);

  if (d <= cfg.tapMove) {
    if (dt >= cfg.holdMs) return { type: 'hold', direction: null, distance: d, velocity };
    if (dt <= cfg.tapMaxMs) return { type: 'tap', direction: null, distance: d, velocity };
    return { type: 'hold', direction: null, distance: d, velocity };
  }

  if (d < cfg.swipeDistance || velocity < cfg.minVelocity) {
    return { type: 'drag', direction: null, distance: d, velocity };
  }

  const direction = rawDirection(dx, dy, cfg.axisBias);
  if (!direction) return { type: 'drag', direction: null, distance: d, velocity };
  return { type: 'swipe', direction, distance: d, velocity };
}

export function classifySwipe(dx, dy, dt, min = GESTURE_DEFAULTS.swipeDistance, minVelocity = GESTURE_DEFAULTS.minVelocity) {
  const gesture = classifyGesture(dx, dy, dt, { swipeDistance: min, minVelocity });
  return gesture.type === 'swipe' ? gesture.direction : null;
}

export class GestureController {
  constructor(el, { onPreview, onSwipe, onTap, onHold, onDrag } = {}, options = {}) {
    this.el = el;
    this.cb = { onPreview, onSwipe, onTap, onHold, onDrag };
    this.cfg = { ...GESTURE_DEFAULTS, ...options };
    this.state = 'idle';
    this.p = null;
    this.stats = { swipes: 0, taps: 0, holds: 0, drags: 0, cancels: 0, directionSwitches: 0 };

    this.down = this.down.bind(this);
    this.move = this.move.bind(this);
    this.up = this.up.bind(this);
    this.cancel = this.cancel.bind(this);
    this.lostCapture = this.lostCapture.bind(this);
    this.contextMenu = (e) => e.preventDefault();

    el.addEventListener('pointerdown', this.down, { passive: false });
    el.addEventListener('pointermove', this.move, { passive: false });
    el.addEventListener('pointerup', this.up, { passive: false });
    el.addEventListener('pointercancel', this.cancel, { passive: false });
    el.addEventListener('lostpointercapture', this.lostCapture, { passive: false });
    el.addEventListener('contextmenu', this.contextMenu);
  }

  down(e) {
    if (this.state !== 'idle' || !e.isPrimary) return;
    e.preventDefault();
    this.el.setPointerCapture?.(e.pointerId);
    this.state = 'pending';
    this.p = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      direction: null,
    };
  }

  move(e) {
    if (!this.p || e.pointerId !== this.p.id) return;
    e.preventDefault();
    const dx = e.clientX - this.p.x;
    const dy = e.clientY - this.p.y;
    const d = distance(dx, dy);

    if (d >= this.cfg.previewDistance) {
      const next = resolveDirection(dx, dy, this.p.direction, this.cfg);
      if (this.p.direction && next && next !== this.p.direction) this.stats.directionSwitches += 1;
      this.p.direction = next;
    }

    this.state = this.p.direction ? 'preview' : d >= this.cfg.dragDistance ? 'drag' : 'pending';
    this.cb.onPreview?.(dx, dy, this.p.direction, this.state);
  }

  up(e) {
    if (!this.p || e.pointerId !== this.p.id) return;
    e.preventDefault();
    const p = this.p;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    const dt = performance.now() - p.t;
    const gesture = classifyGesture(dx, dy, dt, this.cfg);
    let direction = gesture.direction;

    if (gesture.type === 'swipe') {
      direction = resolveDirection(dx, dy, p.direction || direction, this.cfg) || direction;
    }

    this.finishPointer(e.pointerId);

    if (gesture.type === 'swipe' && direction) {
      this.stats.swipes += 1;
      this.cb.onSwipe?.(direction);
    } else if (gesture.type === 'tap') {
      this.stats.taps += 1;
      this.cb.onTap?.();
    } else if (gesture.type === 'hold') {
      this.stats.holds += 1;
      this.cb.onHold?.();
    } else {
      this.stats.drags += 1;
      this.cb.onDrag?.(dx, dy, dt);
    }
  }

  cancel(e) {
    if (!this.p || e.pointerId !== this.p.id) return;
    e.preventDefault?.();
    this.stats.cancels += 1;
    this.finishPointer(e.pointerId);
  }

  lostCapture(e) {
    if (!this.p || e.pointerId !== this.p.id) return;
    this.stats.cancels += 1;
    this.finishPointer(e.pointerId, false);
  }

  finishPointer(pointerId, releaseCapture = true) {
    if (releaseCapture) {
      try {
        if (this.el.hasPointerCapture?.(pointerId)) this.el.releasePointerCapture(pointerId);
      } catch {
        // Safari may already have released capture during cancellation.
      }
    }
    this.p = null;
    this.state = 'idle';
    this.cb.onPreview?.(0, 0, null, 'idle');
  }

  getStats() {
    return { state: this.state, ...this.stats };
  }

  destroy() {
    this.el.removeEventListener('pointerdown', this.down);
    this.el.removeEventListener('pointermove', this.move);
    this.el.removeEventListener('pointerup', this.up);
    this.el.removeEventListener('pointercancel', this.cancel);
    this.el.removeEventListener('lostpointercapture', this.lostCapture);
    this.el.removeEventListener('contextmenu', this.contextMenu);
  }
}
