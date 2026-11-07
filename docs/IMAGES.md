# Image sources & licensing

BloomNest ships with **zero third-party images**. Every visual in the app is
project-original: the product photos were generated for this project with the
Qoder ImageGen text-to-image tool, and the small brand marks are original SVG.
Nothing is downloaded from stock-photo sites, so the app works fully offline
and there is no copyright risk when submitting the coursework.

## What exists and where it comes from

| Asset | Count | Source |
|---|---|---|
| Product photos (`frontend/public/images/products/*.jpg`) | 112 | AI-generated originals (ImageGen), resized to 800×800 JPEG q80 |
| Out-of-stock placeholder (`frontend/public/images/out-of-stock.jpg`) | 1 | AI-generated original, 1200×600 JPEG |
| Product image catalog (`frontend/public/images/products/manifest.json`) | 1 | Written by `scripts/prepare-images.mjs` |
| Hero illustration, logo, favicon (`frontend/public/images/*.svg`) | 3 | Hand-written original SVG in-repo |
| Admin-uploaded product photos (`/uploads/…`) | runtime | Uploaded via the admin panel; validated by magic bytes, stored in the `bloomnestuploads` Docker volume |

Catalogue split: **56 loose flowers**, **50 potted plants**, **6 bouquets**
(112 product photos), matching the seed exactly (every product slug has a
`<slug>.jpg`).

## How the product photos were made

- Generated in a consistent studio style: cream backdrop, soft daylight, one
  product per frame, photorealistic, **no people, text or watermarks**.
- Prompts described the botanical subject (e.g. "a bunch of deep red garden
  roses on a pale cream studio background, photorealistic, soft daylight").
- The full-size PNG masters are then resized, flattened onto the shop's cream
  background and compressed by `scripts/prepare-images.mjs` using `sharp`:

  ```bash
  # anywhere Docker runs; IMG_SRC holds the master PNGs
  docker run --rm \
    -v "$PWD/scripts:/job" -v "/path/to/masters:/src:ro" \
    -v "$PWD/frontend/public/images:/out" \
    -w /job node:20-alpine \
    sh -c "npm i sharp && node prepare-images.mjs"
  ```

- The script picks the newest PNG per slug, writes `products/<slug>.jpg`
  (800×800, `fit: cover`, quality 80, mozjpeg) plus `out-of-stock.jpg`, and
  rewrites `manifest.json` with file names and byte sizes.
- Because the output is committed, the site needs no image CDN at runtime.

## Honesty note

These are **AI-generated studio images created for this project**, not
photographs of the actual farm stock. Prices, stock counts and delivery
promises are demonstration data. If you replace them with real photography,
keep licences permissive (e.g. CC0 / own photos) and record the source and
licence per file in this table.

## Licensing position

- All committed photos and SVGs are **original to this project** and may be
  used, modified and evaluated freely as part of the coursework.
- No stock-photo sites, external CDNs or third-party artwork are used.
- Brand SVGs (`hero.svg`, `logo.svg`, `favicon.svg`) are hand-written original
  vector art in this repository.
