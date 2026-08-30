# GRAVITY HEIST changelog

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
