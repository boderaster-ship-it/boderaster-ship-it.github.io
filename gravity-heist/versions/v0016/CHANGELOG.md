# GRAVITY HEIST changelog

## v0016 — Runtime Visibility Guard & True Canvas-Safe Rendering — 2026-08-30
- Found and fixed a second P0 visibility bug in v0015: iOS hid WebGL but the CanvasRenderer still believed a GPU backdrop was active, so it rendered only a weak transparent overlay instead of the full opaque game scene.
- Canvas-safe mode now explicitly sets the renderer to full Canvas authority and skips WebGL rendering entirely, improving both visibility confidence and iPhone performance.
- Added `visibility-guard.js`, which projects the real player position into canvas pixels and periodically samples the actual rendered player patch for luminance/contrast evidence.
- The runtime visibility gate also checks canvas backing-store size and layer ordering. Failed hybrid evidence automatically switches to Canvas-safe mode.
- If Canvas-safe evidence repeatedly fails, the app shows a visible render-recovery warning instead of silently presenting an apparently empty game.
- Added visibility state/recovery telemetry to `__gravityHeistDiagnostics` and corrected the stale diagnostics version that still reported v0013.
- Added 4/4 pure Node visibility-logic checks and syntax checks for all changed JS modules.
- Advanced offline cache to v0016 and included the visibility guard.

### Quality status
- This materially improves the P0 mitigation, but there is still no physical-iPhone or automated WebKit screenshot proof in this run.
- Visual Quality, Stability and Commercial Readiness therefore remain at 4/10 until rendered device output is confirmed.

## v0015 — iOS Canvas-Safe Render Fallback — 2026-08-30
- Treated the physical-iPhone v0013 screenshot as continuing P0 evidence rather than assuming v0014 was sufficient.
- Added `render-safety.css` as a static, browser-independent layer contract: WebGL scene below gameplay canvas, no cross-canvas blend mode, no pointer interception.
- Added `render-safety.js` with explicit iPhone/iPadOS detection. iOS now defaults to `canvas-safe` mode and hides the WebGL canvas until real-device visibility is proven.
- Added diagnostic overrides: `?gpu=1` forces hybrid WebGL and `?canvas=1` forces Canvas-safe mode.
- Added a high-contrast Canvas-safe background/filter so player, level solids, loot and security remain legible even when WebGL is disabled.
- Corrected the visible build label to v0015 and advanced the service-worker cache to v0015 including the new safety assets.
- Ran 7/7 pure Node checks for iOS/iPadOS detection and render-mode selection plus `node --check` on the new module.

### Quality status
- Scores intentionally remain reduced after the real-device failure: Visual Quality 4/10, Stability 4/10, Commercial Readiness 4/10.
- v0015 is a robust mitigation, not claimed as physically verified. No browser screenshot runner or physical iPhone was available in this run.

## v0014 — P0 iPhone Gameplay Visibility Fix — 2026-08-30
- Added a runtime composition contract intended to keep the Canvas gameplay layer above the WebGL scene.
- Switched the Canvas context to alpha mode and strengthened the player visibility ring.
- Reduced scorecard values after physical-device evidence contradicted prior internal quality scores.
- Important follow-up found in v0015: the published base CSS still contained the old v0013 layer order, so v0014 relied too heavily on runtime overrides.

## v0013 — Extruded WebGL Architecture — 2026-08-30
- Added extruded WebGL architectural solids, depth-tested geometry, camera-aligned projection, geometry diagnostics and dynamic Vector Door rebuilding.
- Corrected the visible version label that had previously remained stale.

## v0012 — HELIX Identity — 2026-08-30
- Added HELIX-specific violet/cyan visual language, GPU atmosphere profile and distinct synthesized audio profile.

## v0011 — Cinematic Follow Camera — 2026-08-30
- Added damped follow, velocity/gravity look-ahead, gravity-shift pullback and shared camera transforms.

## v0010 — Touch Reliability — 2026-08-30
- Added explicit gesture states, directional hysteresis, safe pointer cancellation and input telemetry.

## v0009 — Mastery Grades & Playstyle Signatures — 2026-08-30
- Added S/A/B/C grading, playstyle signatures and persistent mastery results.

## v0008 — Pause, Settings & Accessibility — 2026-08-30
- Added pause/settings, audio buses, Reduced Motion, quality modes, capability-gated haptics and background pause.

## v0007 — Contract Progression & HELIX Vector Locks — 2026-08-30
- Added contract selection, persistent unlocks, HELIX and gravity Vector Locks.

## v0006 — GPU Atmosphere Pipeline — 2026-08-30
- Added adaptive WebGL atmosphere/depth rendering.

## v0005 — Occlusion & Impact Audio — 2026-08-30
- Added wall-aware guard perception and material-specific impact audio tiers.

## v0004 — Kinetic Security — 2026-08-30
- Added dynamic body collisions and gravity-reactive guards.

## v0003 — Vertical Routes — 2026-08-30
- Added multi-room level geometry and optional intel route.

## v0002 — Security Escalation — 2026-08-30
- Added guards, lasers, security escalation and risk multiplier.

## v0001 — Museum Break-In Foundation — 2026-08-30
- Established modular architecture, touch-first gravity gameplay, first heist loop and PWA baseline.
