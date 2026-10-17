# Product imagery: where the photos come from

The first version of this project drew every product as an SVG illustration. That
was honest about licensing and it worked offline, but a customer cannot buy a
marigold from a purple doodle — the shop looked like a wireframe. The catalogue
now leads with **real photographs of the actual species**, resolved in the
browser at view time.

## The four tiers, in order

Every surface that shows a product goes through `frontend/src/lib/photos.ts` +
`ProductImage.tsx`, which builds an ordered list of candidate images and walks
down it whenever the browser reports a load failure:

| # | Source | When it wins | Who owns it |
|---|---|---|---|
| 1 | **Admin upload / local asset** — anything starting `/uploads/` or `/images/` | Always. Used exactly as stored, **no network lookup is performed** | You |
| 2 | **Wikimedia Commons photograph** of the species | Default for every seeded product | The photographer, under a free licence |
| 3 | **Seeded keyword URL** in `Flower.imageUrl` (LoremFlickr today) | Only if Commons returns nothing usable | Third party, illustrative only |
| 4 | **Drawn artwork** — inline SVG generated from the product's name + `colorHex` (`frontend/src/lib/artwork.ts`) | Offline, blocked network, or a query with no results | This project |

Tier 4 is why the shop never shows a torn-image icon. It is deterministic
(same product → same drawing), tinted with the product's own colour, and costs
zero bytes in the repo because it is a `data:` URI built at render time.

## How a Commons query is built

`photoQueryFor(name, kind)` in `photos.ts`:

1. The product name is lower-cased; parentheticals, apostrophes and punctuation
   are dropped; shop filler (`Bunch`, `Stem`, `Premium`, `Loose`, …) is removed.
2. The remaining words are matched against a **species table** — `genda` →
   `Tagetes erecta`, `marigold` → `Tagetes erecta`, `snake plant moonshine` →
   `Dracaena trifasciata`, `baby's breath` → `Gypsophila paniculata`, and so on —
   trying the whole name, then two/three-word phrases, then single words with a
   naive singular form. Matching the *botanical* name is what makes results
   species-accurate instead of "someone's holiday snapshot of a yellow thing".
3. A colour word in the name is appended (`… marigold orange`), so Yellow and
   Orange Dahlia do not compete for the same photo.
4. Plants get `potted plant`, bouquets get `flower bouquet` — the species table is
   for flowers.

The query is sent to the Commons search API as
`<terms> filetype:bitmap` (`generator=search&gsrnamespace=6`, `iiurlwidth=960`,
`iiprop=url|mime|extmetadata`), results are sorted by search rank, and
`SKIP_TITLE` drops maps, diagrams, herbarium scans, botanical illustrations and
other non-photographic hits. `filetype:bitmap` + the `image/jpeg|png` MIME check
keep SVGs and GIFs out of the grid.

## The hover gallery, and why frames repeat a little

One Commons query returns up to `count × 6` candidates (max 24). The card takes
the first frame; on hover it cycles **the next 3–4 frames of the same query**, so
you see the same flower from other angles. Because all 12 dahlia varieties share
one query, `rotateFor(sources, slug)` rotates the list per product, so "Red
Dahlia" and "Yellow Dahlia" open on different photographs while still drawing
from the same set. The product page uses the same list as a lightbox.

`realCount` in the hook tells the UI how many candidates are *actual retrieved
photographs*; the "N photos" chip only appears when that is ≥ 1, and the
attribution line only renders next to a Commons frame.

## Cost, caching and politeness

- Requests are **lazy**: a card only fetches when it nears the viewport
  (`useInView`, 240 px margin). A 363-item catalogue that you scroll past does not
  fire 363 searches.
- At most **4 requests in flight** process-wide (a queue, not a per-component
  throttle), so a fast scroll cannot stampede Commons.
- Results are cached **per query** in memory *and* in `sessionStorage` for
  `CACHE_TTL_MS` (three days), keyed by the query string — not by product. Thirty
  rose varieties therefore share one search. A failed lookup is cached as `[]`
  for the same period so a flaky network does not cause a request per render.
- Everything degrades quietly: a timeout (`REQUEST_TIMEOUT_MS`) or a non-2xx
  answer resolves to "no photos" and the UI drops to the next tier. There is no
  error state to design for, because the customer should never see one.

## Licensing — read this before you evaluate the images

Wikimedia Commons files are **free to reuse, not unencumbered**. Most are
CC BY / CC BY-SA or CC0, and the licence terms require attribution — which is why
every Commons frame renders `📷 <artist> · <licence>` with a link to the file page
(`PhotoCredit`). Do not strip that line, and do not treat these images as brand
photography for a real shop:

- a Commons photo of *Tagetes erecta* proves what a marigold looks like; it is
  not a photo **of the stems in your cold store**;
- the licence may require share-alike, which is fine for coursework and awkward
  for a commercial brand kit;
- Commons can delete or rename a file, so the pipeline has a fallback tier for
  exactly that.

For anything beyond a course demo, photograph your own stock (or pay a stock
agency), upload it in the admin panel, and the local `/uploads/…` file will
outrank every remote source automatically — no code change required.

The seeded LoremFlickr URLs (tier 3) are keyword-matched random Flickr images with
**no guarantee of relevance or licence clarity**. They are placeholders kept only
so a stored `imageUrl` is never empty; the app prefers Commons and, failing that,
draws its own art.

## Bundled, project-owned assets

| Asset | Source |
|---|---|
| `frontend/public/images/products/*.svg` | Generated by `scripts/generate-images.mjs` — original vector art, offline fallbacks for the slugs present at generation time |
| `frontend/public/images/products/manifest.json` | Written by the same generator; `ProductImage` can look a slug up locally |
| Hero, logo, favicon (`frontend/public/images/*.svg`) | Hand-written original SVG in this repo |
| `/uploads/…` | Uploaded in the admin panel (`POST /api/admin/uploads`), magic-byte validated, ≤5 MB, stored on the `bloomnestuploads` Docker volume |

Regenerate the committed SVGs any time (host Node or any container):

```bash
node scripts/generate-images.mjs
```

It is a deterministic illustration generator: a seeded PRNG (FNV-1a hash of the
slug → xorshift) picks petal shapes, rotations and shades from the project
palette, so the same slug always yields the same file and re-running never churns
the repo. The runtime tier-4 artwork in `artwork.ts` uses the same trick, but
never writes files.

## Adding species you stocked later

1. Add the flower in the admin panel (or a family in
   `backend/prisma/data/flowers.ts` + re-seed).
2. If its photo results look wrong, add the mapping to `SPECIES_TERMS` in
   `photos.ts` — one line, `"<common name>": "<Genus species>"`.
3. Or upload a real photo, which sidesteps all of the above.
