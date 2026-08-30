# GRAVITY HEIST changelog

## v0001 — Museum Break-In Foundation — 2026-08-30
- Established modular production structure across app, state, input, physics, renderer, audio, UI, persistence, tests, PWA and assets.
- Added playable Museum Break-In loop: swipe gravity, collect Aurora loot, reach extraction, score and retry.
- Added gesture state machine with Pointer Events, pointer capture, dead zone and velocity threshold.
- Added gravity interpolation, bounded dynamic bodies and mobile-friendly 2D physics foundation.
- Added premium-styled architectural canvas presentation, gravity preview, heat HUD, loot/extraction feedback and synthetic audio cues.
- Added landscape/safe-area UX, PWA manifest, icon and cache-first fallback service worker.
- Added runtime self-tests for swipe classification and physics sanity.

### Known gaps
- Physical-iPhone gesture feel and WebKit behavior still require real-device confirmation.
- Physics currently circle-body based; no polygon collision or guard AI yet.
- Visuals are art-directed canvas 2.5D rather than final 3D WebGL assets.
- Audio is procedural foundation, not final mastered sound design.
