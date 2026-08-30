# GRAVITY HEIST changelog

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

### Known gaps
- Physical iPhone validation still required.
- Guard perception is still distance-based rather than occlusion-aware.
- Body collision model is circle-based and intentionally simplified; dense piles still need stress testing/tuning.
- 2.5D canvas renderer remains an interim presentation layer before the final 3D/WebGL path.
- Procedural audio remains limited and impacts do not yet have material-specific sound tiers.
- Progression, settings/accessibility and multiple heists remain major release gaps.

## v0003 — Vertical Routes — 2026-08-30
- Added a dedicated museum level module instead of hard-coding architecture in the renderer.
- Added eight solid collision structures: walls, central spine, bridges and vault shelf.
- Physics now resolves moving circle bodies against static rectangular world geometry.
- Reworked the museum into multiple named spaces: Entry Gallery, Archive Shaft, Lift Core, Aurora Vault and Security Atrium.
- Added a violet optional intel pickup worth +1800 base score, creating a deliberate detour/risk decision.
- Added another gravity-reactive prop to make alternate gravity directions more readable.
- Expanded runtime self-tests from 7 to 10 assertions, including wall/platform collision and level-geometry checks.
- Advanced service-worker cache to v0003 and included the new level module in offline core assets.

### Known gaps
- Physical iPhone validation still required.
- Dynamic bodies do not yet collide with each other.
- Guards still use patrol rails and are not gravity-physical.
- Guard perception is distance-based rather than occlusion-aware.
- 2.5D canvas renderer remains an interim presentation layer before the final 3D/WebGL path.
- Procedural audio remains limited.

## v0002 — Security Escalation — 2026-08-30
- Added dedicated SecuritySystem with three laser grids and two patrolling guards.
- Added STEALTH, SUSPICIOUS, ALERT and LOCKDOWN states.
- Security reacts to gravity shifts, laser contact, guard proximity and stealing the Aurora.
- High alert now boosts score up to x1.75, creating deliberate risk/reward.
- Added security HUD, vision cones, laser animation, danger lighting and alarm audio.
- Expanded runtime self-tests from 5 to 7 assertions.
- Advanced service-worker cache to v0002.

## v0001 — Museum Break-In Foundation — 2026-08-30
- Established modular architecture and playable gravity/loot/extraction loop.
