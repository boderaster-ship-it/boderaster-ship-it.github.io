# GRAVITY HEIST changelog

## v0010 — Touch Reliability & Gesture Hysteresis — 2026-08-30
- Rebuilt the gameplay gesture controller into explicit pending/drag/preview/idle states while retaining one dominant gravity-swipe control.
- Added pure tap, hold, drag and swipe classification so ambiguous motion is identified instead of being silently folded into tap/swipe behavior.
- Added directional hysteresis: a preview direction now remains locked around diagonal ambiguity and only switches axis after a deliberate stronger movement.
- Added deliberate same-axis reversal handling so a player can still correct right→left or up→down before release.
- Split pointer cancellation from normal pointer release. `pointercancel` and unexpected `lostpointercapture` now abort safely and cannot trigger gravity, tap, hold or drag callbacks.
- Added input telemetry to runtime diagnostics: gesture state, swipes, taps, holds, drags, cancellations and direction switches.
- Expanded runtime self-tests from 39 to 46 assertions with new touch-classification and hysteresis regressions.
- Advanced service-worker cache to v0010.

### Known gaps
- Physical iPhone validation is still mandatory before touch can be considered release-ready; Safari pointer-capture semantics, one-handed feel and threshold tuning remain unproven on device.
- HELIX still needs stronger bespoke art/audio identity.
- WebGL remains an atmosphere/depth layer rather than final full 3D environment geometry.
- Camera remains a static full-world framing model rather than the target damped cinematic follow/look-ahead system.

## v0009 — Mastery Grades & Playstyle Signatures — 2026-08-30
- Added post-heist S/A/B/C mastery grading based on a weighted combination of completion score, speed, gravity-shift efficiency, alert control, optional objectives and contract-specific mechanics.
- Added seven meaningful playstyle signatures: Collector, Phantom, Precision, Velocity, High Wire, Kinetic and Vector Savant. These reward genuinely different approaches instead of generic XP.
- Added peak-alert and peak-chaos telemetry so a player cannot erase a risky run by simply waiting for meters to decay before extraction.
- Added a premium result breakdown with large mastery grade and earned signature cards.
- Contract cards now display best grade, best score and number of unique signatures collected.
- Upgraded persistence to save schema v3 with migration from v2; existing scores, unlocks and completed contracts survive the migration.
- Expanded runtime self-tests from 33 to 39 assertions with mastery classification/order/signature regressions.
- Advanced service-worker cache to v0009 and added the mastery module to offline core assets.

### Known gaps
- Mastery thresholds need calibration against real player telemetry and physical iPhone play.
- HELIX still needs stronger bespoke art/audio identity.
- Physical iPhone validation remains required.
- WebGL remains an atmosphere/depth layer rather than final full 3D environment geometry.

## v0008 — Pause, Settings & Accessibility Control — 2026-08-30
- Added a real pause/settings flow reachable from gameplay, contract selection and results without adding controls to the core gravity gesture.
- Added persistent master, impact/gravity FX, security and UI audio mix controls and wired them to real Web Audio gain buses.
- Added a Reduced Motion preference that freezes decorative GPU animation and removes UI/meter transitions independently of the OS preference.
- Added explicit GPU quality modes: Auto adaptive, Performance and Quality; render diagnostics now report the selected mode.
- Added optional haptic event routing for gravity shifts, alerts, loot and success only when the browser exposes vibration support; unsupported browsers clearly report haptics unavailable instead of faking support.
- Added visibility/background auto-pause so a live heist no longer advances while the app is backgrounded.
- Added settings persistence in a dedicated module with sanitization/clamping and a Reset Defaults action.
- Expanded runtime self-tests from 27 to 33 assertions, covering quality presets and settings normalization/accessibility behavior.
- Advanced service-worker cache to v0008 and added the new settings modules to the offline core.

### Known gaps
- Physical iPhone validation remains required, especially Safari range/select ergonomics and background/resume behavior.
- iPhone Safari does not expose a standard web haptics API; the Haptic Feedback control is disabled when vibration support is unavailable.
- WebGL remains an atmospheric/depth layer rather than final full 3D environment geometry.
- HELIX still needs stronger bespoke art/audio identity and result mastery grading.

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
