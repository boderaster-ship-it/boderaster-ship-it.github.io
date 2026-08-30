# GRAVITY HEIST changelog

## v0012 — HELIX Identity: Reactor Neon & Resonant Lab Audio — 2026-08-30
- Gave HELIX a dedicated violet/cyan reactor-laboratory material language instead of inheriting the museum palette.
- Added HELIX-specific zone, wall, bridge, security, gravity-vector and player-accent treatment plus concentric reactor-field floor graphics and luminous reactor-spine detailing.
- Made the GPU atmosphere level-aware: HELIX now renders a purple reactor-space treatment with animated concentric energy rings while Aurora Museum retains its cyan architectural atmosphere.
- Added pure `sceneProfile()` mapping so level-specific GPU identity can be regression tested independently from WebGL availability.
- Added level-aware audio profiles. HELIX gravity shifts now use a layered two-note signature, alerts/loot use a different pitch language, and HELIX receives a sparse resonant laboratory ambience while the museum retains its quieter low-frequency bed.
- Added the active audio profile and GPU scene mix to runtime diagnostics.
- Expanded runtime self-tests from 51 to 55 assertions for HELIX theme presence, GPU profile separation, audio-profile separation and ambience separation.
- Advanced service-worker cache to v0012.

### Known gaps
- Physical iPhone validation remains mandatory for touch feel, camera comfort, audio balance and real-device performance.
- HELIX identity is now substantially more distinct, but audio remains synthesized Web Audio rather than a finished authored sample/music package.
- WebGL remains an atmosphere/depth layer rather than final full 3D environment geometry.
- Foreground occlusion/cutaway is not meaningful yet because the environment is still primarily 2D-mapped geometry.
- Progression still contains only two contracts and mastery thresholds need real-player telemetry.

## v0011 — Cinematic Follow Camera & Gravity Look-Ahead — 2026-08-30
- Replaced the static full-world framing with a dedicated damped gameplay camera that follows the player without hard snapping.
- Added velocity look-ahead so fast motion reveals more space in the direction of travel, plus gravity-vector look-ahead so the next fall direction remains readable after a shift.
- Added a brief gravity-shift pullback instead of camera rotation, preserving world orientation while giving the shift a cinematic impulse.
- Added viewport clamping so camera framing cannot expose large areas outside the authored 1000×560 playfield.
- Reduced Motion now accelerates camera settling and suppresses the long gravity-shift camera impulse.
- Unified HELIX Vector Lock rendering with the exact gameplay camera transform; puzzle markers and lock doors no longer use a separate static full-world mapping.
- Added camera diagnostics (center, zoom, gravity-shift kick) to `__gravityHeistDiagnostics`.
- Expanded runtime self-tests from 46 to 51 assertions with camera look-ahead, damping, shift pullback, viewport clamp and reduced-motion regressions.
- Advanced service-worker cache to v0011 and added the new camera module to offline core assets.

### Known gaps
- Physical iPhone validation remains mandatory for touch feel and camera comfort.
- Foreground occlusion/cutaway is not meaningful yet because the environment is still primarily 2D-mapped geometry rather than a true 3D scene.
- HELIX still needs a stronger bespoke art/audio identity.
- WebGL remains an atmosphere/depth layer rather than final full 3D environment geometry.

## v0010 — Touch Reliability & Gesture Hysteresis — 2026-08-30
- Rebuilt the gameplay gesture controller into explicit pending/drag/preview/idle states while retaining one dominant gravity-swipe control.
- Added pure tap, hold, drag and swipe classification so ambiguous motion is identified instead of being silently folded into tap/swipe behavior.
- Added directional hysteresis: a preview direction now remains locked around diagonal ambiguity and only switches axis after a deliberate stronger movement.
- Added deliberate same-axis reversal handling so a player can still correct right→left or up→down before release.
- Split pointer cancellation from normal pointer release. `pointercancel` and unexpected `lostpointercapture` now abort safely and cannot trigger gravity, tap, hold or drag callbacks.
- Added input telemetry to runtime diagnostics and expanded runtime self-tests from 39 to 46 assertions.
- Advanced service-worker cache to v0010.

## v0009 — Mastery Grades & Playstyle Signatures — 2026-08-30
- Added S/A/B/C mastery grading, seven playstyle signatures, peak-alert/peak-chaos telemetry, premium result breakdown, persistent best grade/signatures and save schema v3 migration.
- Expanded runtime self-tests from 33 to 39 assertions and advanced offline cache to v0009.

## v0008 — Pause, Settings & Accessibility Control — 2026-08-30
- Added pause/settings flow, persistent audio bus controls, Reduced Motion, GPU quality modes, capability-gated haptics, background auto-pause and settings sanitization.
- Expanded runtime self-tests from 27 to 33 assertions and advanced offline cache to v0008.

## v0007 — Contract Progression & HELIX Vector Locks — 2026-08-30
- Added contract selection, persistent per-heist scores/unlocks, HELIX Research Array and Vector Lock gravity puzzles.
- Added dedicated vector-lock overlay and generalized level/security profiles.
- Expanded runtime self-tests from 22 to 27 assertions.

## v0006 — GPU Atmosphere Pipeline — 2026-08-30
- Added adaptive WebGL atmosphere/depth rendering with security and gravity-reactive lighting.

## v0005 — Occlusion & Impact Audio — 2026-08-30
- Added wall-aware guard perception and material-specific impact audio tiers.

## v0004 — Kinetic Security — 2026-08-30
- Added dynamic body collisions and gravity-reactive guard bodies.

## v0003 — Vertical Routes — 2026-08-30
- Added multi-room vertical level geometry and optional intel route.

## v0002 — Security Escalation — 2026-08-30
- Added guards, lasers, security escalation and risk multiplier.

## v0001 — Museum Break-In Foundation — 2026-08-30
- Established modular architecture, touch-first gravity gameplay, first complete heist loop and PWA baseline.
