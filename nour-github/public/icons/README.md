# Icônes PWA

Le manifest référence trois variantes PNG :

- `icon-192.png` (192×192) — usage général
- `icon-512.png` (512×512) — splash & installation
- `icon-maskable-512.png` (512×512) — mode "maskable" (Android)

Les sources vectorielles sont `icon.svg` et `icon-maskable.svg`.

## Régénérer les PNG

À l'aide de [pwa-asset-generator](https://github.com/onderceylan/pwa-asset-generator) ou ImageMagick :

```bash
# avec ImageMagick (rsvg-convert recommandé pour meilleure qualité)
rsvg-convert -w 192 -h 192 icon.svg          -o icon-192.png
rsvg-convert -w 512 -h 512 icon.svg          -o icon-512.png
rsvg-convert -w 512 -h 512 icon-maskable.svg -o icon-maskable-512.png

# ou via Inkscape
inkscape icon.svg          --export-type=png --export-width=192 -o icon-192.png
inkscape icon.svg          --export-type=png --export-width=512 -o icon-512.png
inkscape icon-maskable.svg --export-type=png --export-width=512 -o icon-maskable-512.png
```

Tant que les PNG ne sont pas générés, le SVG `icon.svg` sert de favicon
(déclaré dans `index.html`).
