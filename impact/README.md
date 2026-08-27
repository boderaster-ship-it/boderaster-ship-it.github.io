# IMPACT — Release Foundation v4

IMPACT is a touch-first 3D puzzle game built around one rule: every collision lets the player decide **WHO reacts** and **WHERE the reaction goes**.

This is the production foundation rather than a throwaway prototype. It contains 12 authored chambers across three visual chapters and a data-driven level schema intended to scale by adding level data rather than rewriting the engine.

## Release-quality pillars

- **Readable selection state:** the selected impact machine gets an always-visible outline, corner markers, an in-world nameplate and a floating state tag.
- **Readable impact direction:** direction indicators live outside collision geometry, ignore depth occlusion and show a projected path preview.
- **Real 3D level design:** authored routes use X/Y/Z movement, vertical traversal, depth turns, relays, gates, moving surfaces, sockets and null hazards.
- **3D environments rather than blockouts:** three chapters use different architecture, lighting, machinery and level-specific hero set pieces.
- **Mobile camera designed for iPhone:** damped one-finger orbit, non-compounding pinch zoom, wide zoom range, per-level authored starting angles and a Fit Chamber control.
- **View-preserving UI:** compact bottom dock, automatic collapse during a run, safe-area support and separate portrait/landscape layouts.
- **Mechanic depth:** CORE and SURFACE reaction modes, six world directions, fixed machines, relays, gates, docking machines and hazards.
- **Audio system:** layered procedural ambience per chapter, reverberant impacts, metallic resonances, launch/gate sweeps, UI feedback and completion cues.
- **Product shell:** campaign flow, level select, stars, par, hints, pause, settings, save state and PWA support.

## Authored campaign

1. FIRST LAW
2. DOUBLE TURN
3. THE DROP
4. DEPTH SIGNAL
5. REACTION MASS
6. COUNTERWEIGHT
7. RELAY FLOOR
8. OVERHEAD
9. CROSS AXIS
10. TWIN MACHINES
11. NULL SPIRAL
12. THE IMPACT ENGINE

## Adding levels

Normal new chambers are added in `levels.js`. The schema already supports:

- launcher and goal
- editable/fixed impact machines
- visual machine kinds (`iris`, `blade`, `paddle`, `rail`, `fixed`)
- CORE/SURFACE receiver rules
- six world-space output directions
- gates with dependency lists
- relay beacons
- docking sockets for moving surfaces
- null hazards
- chapter/environment/set-piece presets
- per-level camera starting angle
- par and hint data

## QA / route verification

Run:

```bash
node verify.mjs
```

The verifier uses runtime-equivalent core motion, AABB impacts, surface-docking speed, relay activation, gates and hazards. The current authored solution set passes all 12 chambers.

Before release changes, also verify on a real iPhone in Safari: landscape + portrait, surface selection, pinch/orbit, Fit Chamber, UI safe areas, CORE/SURFACE rules, docking/gates, fail/retry and audio unlock behavior.
