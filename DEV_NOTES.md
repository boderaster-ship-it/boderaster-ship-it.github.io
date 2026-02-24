# Globe Mode Dev Notes

## Sphere configuration
- Radius `R = 11.5` units.
- Sphere center: `(0, GROUND_Y - R - 0.1, boardCenterZ)` where `boardCenterZ = board.h * board.tile * 0.5 - board.tile * 0.5`.

## Grid to globe mapping
- Logical grid remains unchanged (`board.w x board.h`).
- Longitude spans full range `[-180°, +180°]` across `x`.
- Latitude is clamped to a safe band `[-60°, +60°]` across `z`.
- Mapping:
  - `u = x / (w - 1)`, `v = z / (h - 1)`
  - `lon = -PI + u * 2PI`
  - `lat = latMin + v * (latMax - latMin)`
  - `P = center + R * [cos(lat)*sin(lon), sin(lat), cos(lat)*cos(lon)]`
  - `N = normalize(P - center)`

## Path interpolation
- Globe path sampling interpolates direction vectors on the sphere and reprojects to radius `R`.
- Tangent is projected to the local tangent plane (`normal`-orthogonal) to keep motion surface-following.

## Constraints
- Globe topology is only enabled for the former challenge mode slot (now user-facing as **Globe Mode**).
- Other modes continue using the planar adapter and planar picking/pathing.
