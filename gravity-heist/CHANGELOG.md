# GRAVITY HEIST changelog

## v0007 — Contract Progression & HELIX Vector Locks — 2026-08-30
- Added a contract-selection screen with persistent per-heist best scores and unlock state.
- Added save schema v2 with migration from the previous best-score/run counter format.
- Completing Aurora Museum now unlocks a second playable contract instead of awarding generic XP.
- Added HELIX Research Array: a distinct multi-room heist with its own geometry, props, guard routes and laser layout.
- Added Vector Locks: approach a control node and shift gravity in its indicated direction to physically remove its security door.
- Added a dedicated vector-lock overlay so nodes, required directions and closed doors are visually readable without adding touch buttons.
- Generalized GameState and SecuritySystem so heists can provide their own geometry, props, score target and security profile.
- Expanded the result flow with contract replay and return-to-contracts actions.
- Expanded runtime self-tests from 22 to 27 assertions, including HELIX layout/profile checks and vector-lock activation/removal/rejection regressions.
- Advanced service-worker cache to v0007 and included the new HELIX and vector-overlay modules.

### Known gaps
- Physical iPhone validation is still required.
- HELIX uses the shared visual/audio language and needs a stronger bespoke identity.
- Settings/accessibility remain the lowest scorecard dimension.
- The WebGL layer remains atmospheric rather than the final full 3D geometry renderer.

## v0006 — GPU Atmosphere Pipeline — 2026-08-30
- Added a dedicated WebGL renderer module as the first GPU presentation path, layered independently from the existing gameplay canvas.
- Added a procedural architectural depth/atmosphere shader with perspective grid treatment, luminous structural accents, vignette and premium cyan security aesthetic.
- WebGL lighting now reacts to live security alert level and current gravity direction without coupling rendering back into gameplay logic.
- Added adaptive GPU render scale driven by moving frame-time measurements so presentation quality can fall back under load instead of forcing stutter.
- Added runtime renderer diagnostics exposing WebGL availability, quality scale and average frame time.
- Kept gameplay Pointer Events exclusively on the existing gameplay canvas; the GPU layer is pointer-events:none so touch behavior is unchanged.
- Added reduced-motion CSS treatment for the new layer.
- Expanded runtime self-tests from 20 to 22 assertions with adaptive-quality regression checks.
- Advanced service-worker cache to v0006 and added the WebGL renderer module to offline core assets.

### Known gaps
- Physical iPhone validation still required.
- This WebGL pass is the GPU rendering foundation and atmosphere/depth layer, not yet the final full 3D geometry renderer.
- Guard vision-cone drawing is still illustrative rather than clipped to wall geometry.
- Progression, settings/accessibility and multiple heists remain larger release gaps than further security polishing.

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
