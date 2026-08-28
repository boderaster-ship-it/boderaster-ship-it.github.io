# IMPACT — Final Slice

GitHub Pages build for `/impact-final/`.

Files:
- `index.html` – app shell and touch UI
- `styles.css` – responsive iPhone/desktop styling
- `game-loader.js` – loads the split runtime
- `runtime/part-1.txt` … `part-8.txt` – Three.js game runtime
- `manifest.webmanifest`, `favicon.svg`, `sw.js` – PWA shell/offline cache

Core gameplay:
- `INTERACTION` mode: select impact machines and define WHO reacts + WHERE the force goes
- `AIM MODE`: drag to aim the cannon
- Hold FIRE to charge launch power; release to shoot
- Gravity, charged launch, collision redirection, movable surfaces, relays, gates and hazards
- 4 worlds × 3 levels = 12 levels

The Three.js module is imported from jsDelivr, so first load requires internet access.
