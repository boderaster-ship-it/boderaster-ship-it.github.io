# Kinetic Evolution

A mobile-first evolutionary physics simulation. Every creature has a heritable body plan and controller genome. Fitness emerges from actual simulated locomotion, energy use, balance, terrain contact and goal progress. Top performers reproduce via crossover and mutation.

Player interventions are spatial rather than parameter sliders: sculpt terrain, place energy, move the target beacon, inspect individual agents and optionally preserve one lineage as a breeding favorite.

## Simulation systems
- 18 concurrent individual agents with internal state
- Heritable morphology, friction, metabolism, motor strength, oscillator and sensory-controller traits
- Terrain contact, gravity, joint actuation, energy depletion and failure
- Selection, crossover, mutation, lineage IDs and multi-generation statistics
- Agent inspector, trait distribution, fitness history and lineage visualization
- PWA manifest + offline service worker