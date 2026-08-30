# GRAVITY HEIST changelog

## v0017 — Production Browser Render Smoke Gate — 2026-08-30
- Added `tests/render-smoke.html`, a same-origin browser harness that boots the real production app in forced Canvas-safe mode at an iPhone-like 844×390 viewport.
- Added `src/tests/browser-smoke.js` with production-path assertions for build id, canvas backing size, HUD/menu state, Canvas-safe mode, hidden WebGL scene, gameplay-above-scene z-order and runtime player-pixel visibility evidence.
- The smoke harness dispatches real `PointerEvent` pointerdown/move/up events on the production gameplay canvas instead of calling gravity APIs directly.
- It verifies that exactly one gravity shift is registered, that the player measurably moves after the shift, and that the player remains pixel-visible after motion.
- Added a smoke-only runtime test API behind `?smoke=1`; normal players do not receive the testing surface.
- Smoke mode suppresses service-worker registration and audio side effects to make browser automation deterministic and avoid stale-cache false results.
- Advanced runtime/build stamping to v0017 and service-worker cache to v0017.

### Quality status
- `browser-smoke.js`, updated `bootstrap.js` and `render-safety.js` passed `node --check` before publication.
- The browser harness itself could not be executed against GitHub Pages from this runtime because outbound access to the deployed site is unavailable. No screenshot/pass is claimed.
- Physical-iPhone proof remains mandatory; Visual Quality, Stability and Commercial Readiness remain 4/10 and the P0 remains open.

## v0016 — Runtime Visibility Guard & True Canvas-Safe Rendering — 2026-08-30
- Found and fixed a second P0 visibility bug in v0015: iOS hid WebGL but the CanvasRenderer still believed a GPU backdrop was active, so it rendered only a weak transparent overlay instead of the full opaque game scene.
- Canvas-safe mode now explicitly sets the renderer to full Canvas authority and skips WebGL rendering entirely, improving both visibility confidence and iPhone performance.
- Added `visibility-guard.js`, which projects the real player position into canvas pixels and periodically samples the actual rendered player patch for luminance/contrast evidence.
- The runtime visibility gate also checks canvas backing-store size and layer ordering. Failed hybrid evidence automatically switches to Canvas-safe mode.
- If Canvas-safe evidence repeatedly fails, the app shows a visible render-recovery warning instead of silently presenting an apparently empty game.
- Added visibility state/recovery telemetry to `__gravityHeistDiagnostics` and corrected the stale diagnostics version that still reported v0013.
- Added 4/4 pure Node visibility-logic checks and syntax checks for all changed JS modules.
- Advanced offline cache to v0016 and included the visibility guard.

## v0015 — iOS Canvas-Safe Render Fallback — 2026-08-30
- Added static render safety, iPhone/iPadOS detection and Canvas-safe fallback after the physical-device failure.

## v0014 — P0 iPhone Gameplay Visibility Fix — 2026-08-30
- Began the render-layer recovery after the physical iPhone screenshot showed HUD but no useful gameplay scene.

## v0013 — Extruded WebGL Architecture — 2026-08-30
- Added extruded WebGL architectural solids and dynamic Vector Door geometry.

## v0012 — HELIX Identity — 2026-08-30
- Added HELIX-specific visual/audio identity.

## v0011 — Cinematic Follow Camera — 2026-08-30
- Added damped follow, look-ahead and gravity-shift pullback.

## v0010 — Touch Reliability — 2026-08-30
- Added explicit gesture states, hysteresis and safe cancellation.

## v0009 — Mastery Grades & Playstyle Signatures — 2026-08-30
- Added grading, signatures and persistent mastery.

## v0008 — Pause, Settings & Accessibility — 2026-08-30
- Added pause/settings and accessibility controls.

## v0007 — Contract Progression & HELIX Vector Locks — 2026-08-30
- Added second heist and progression.

## v0006 — GPU Atmosphere Pipeline — 2026-08-30
- Added adaptive WebGL atmosphere.

## v0005 — Occlusion & Impact Audio — 2026-08-30
- Added guard LOS and material impacts.

## v0004 — Kinetic Security — 2026-08-30
- Added body collisions and gravity-reactive guards.

## v0003 — Vertical Routes — 2026-08-30
- Added multi-room level geometry.

## v0002 — Security Escalation — 2026-08-30
- Added guards, lasers and risk escalation.

## v0001 — Museum Break-In Foundation — 2026-08-30
- Established modular architecture and first heist loop.
