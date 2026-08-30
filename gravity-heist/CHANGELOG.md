# GRAVITY HEIST changelog

## v0005 — Occlusion & Impact Audio — 2026-08-30
- Replaced distance-only guard detection with directional field-of-view perception.
- Added wall-aware line-of-sight occlusion using segment-vs-rectangle tests against museum collision geometry, so guards no longer detect the player through solid walls.
- Guard detection now decays faster while physically occluded, making cover and architecture meaningful to stealth play.
- Added material tags to player, loot, guards and key props.
- Added light/medium/heavy material-specific impact audio profiles for glass, metal, armor, stone and fabric/generic collisions.
- Split procedural audio routing into FX, security and UI buses to prepare for proper mixing/settings.
- Exposed per-frame impact events from GameState so audio/VFX systems can react without coupling directly to the physics engine.
- Expanded runtime self-tests from 15 to 20 assertions, adding clear LOS, blocked LOS, segment blocking, FOV rejection and impact-tier mapping checks.
- Advanced service-worker cache to v0005.

### Known gaps
- Physical iPhone validation still required.
- Vision cone drawing is illustrative and not yet clipped against walls, even though gameplay LOS is occlusion-aware.
- 2.5D canvas renderer remains an interim presentation layer before the final 3D/WebGL path.
- Progression, settings/accessibility and multiple heists remain major release gaps.

## v0004 — Kinetic Security — 2026-08-30
- Added dynamic body-to-body circle collision resolution with mass, restitution, penetration correction and impulse response.
- Added impact reporting from the physics world so gameplay systems can react to meaningful collisions.
- Converted both guards from rail-only markers into real physics bodies bound to the same gravity field as the player and props.
- Guards retain patrol intent through soft velocity assistance, but gravity shifts and impacts can knock them off their ideal route.
- Guard/player impacts now escalate security and chaos; strong guard/prop impacts also feed security pressure.
- Added a small style-score contribution for meaningful high-energy impacts to reward controlled kinetic play rather than pure avoidance.
- Updated guard rendering to orient from actual velocity, making gravity-driven motion visually readable.
- Added player impact-ring feedback for strong collisions.
- Expanded runtime self-tests from 10 to 15 assertions, including dynamic body separation, collision response, guard world binding, guard gravity response and impact-alert escalation.
- Advanced service-worker cache to v0004.

## v0003 — Vertical Routes — 2026-08-30
- Added dedicated museum level geometry, static collisions, multiple named spaces and optional intel route.

## v0002 — Security Escalation — 2026-08-30
- Added lasers, guards, alert states and risk/reward multiplier.

## v0001 — Museum Break-In Foundation — 2026-08-30
- Established modular architecture and playable gravity/loot/extraction loop.
