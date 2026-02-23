# Aegis Frontier TD (PWA)

A touch-first 3D-styled tower defense game designed for mobile Safari / iPhone home-screen installs.

## Features
- 3D map projection with camera rotation.
- 6 tower classes with 3 upgrade tiers each.
- 10+ enemy archetypes including boss waves.
- 10 handcrafted sectors and optional endless continuation.
- Meta progression (persistent research tree + unlocks via localStorage).
- PWA offline support via service worker + manifest.
- Accessibility/effects/performance toggles.

## Run locally
```bash
python3 -m http.server 8080
```
Then open `http://localhost:8080`.

## iPhone PWA install
1. Deploy files to HTTPS hosting.
2. Open in Safari on iPhone.
3. Use **Share → Add to Home Screen**.
4. Launch app from icon; verify standalone mode and offline replay.

## Deployment options
- Static hosts: Cloudflare Pages, Netlify, Vercel static export, S3 + CloudFront.
- Ensure `sw.js` and `manifest.webmanifest` are served with correct MIME types.

## Balance tuning
All economy and combat values are data-driven in `js/main.js`:
- `towerDefs`, `enemyDefs`, `levels`, `difficulties`.
- Meta progression multipliers and unlock gates.

## Updating future versions
1. Edit gameplay values in `js/main.js`.
2. Bump the `VERSION` key in `sw.js` to invalidate old offline caches.
3. Redeploy static bundle.
