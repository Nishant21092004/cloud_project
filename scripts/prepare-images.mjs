/**
 * BloomNest image pipeline
 * - Takes the newest generated PNG per product slug from /src
 * - Writes optimised 800x800 JPEGs to /out/products/<slug>.jpg
 * - Writes the wide out-of-stock placeholder /out/out-of-stock.jpg
 * - Writes /out/products/manifest.json
 */
import { readdir, mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = process.env.IMG_SRC ?? "/src";
const OUT = process.env.IMG_OUT ?? "/out";
const PRODUCTS = path.join(OUT, "products");

const FLOWERS = [
  "alstroemeria-orange", "anthurium-red", "babys-breath", "bird-of-paradise",
  "carnation-pink", "carnation-red", "carnation-white", "carnation-yellow",
  "chrysanthemum-red", "chrysanthemum-white", "chrysanthemum-yellow", "cosmos-pink",
  "daffodil-yellow", "dahlia-pink", "dahlia-red", "eucalyptus-bunch", "freesia-yellow",
  "gazania", "gerbera-orange", "gerbera-pink", "gerbera-red", "gerbera-white",
  "gerbera-yellow", "gladiolus-pink", "hydrangea-blue", "hydrangea-pink", "iris-blue",
  "jasmine-mogra", "lavender-bunch", "lily-orange", "lily-pink", "lily-stargazer",
  "lily-white", "lily-yellow", "lotus-pink", "marigold-orange", "marigold-yellow",
  "orchid-pink", "orchid-purple", "orchid-white", "peony-pink", "rose-lavender",
  "rose-orange", "rose-peach", "rose-pink", "rose-red", "rose-white", "rose-yellow",
  "sunflower", "tuberose", "tulip-pink", "tulip-purple", "tulip-red", "tulip-white",
  "tulip-yellow", "zinnia-red",
];

const PLANTS = [
  "aglaonema", "aloe-vera", "anthurium-plant", "areca-palm", "barrel-cactus",
  "begonia", "bird-of-paradise-plant", "boston-fern", "bougainvillea", "caladium",
  "calathea", "chamomile-plant", "chrysanthemum-plant", "croton", "curry-leaf-plant",
  "dieffenbachia", "dracaena", "echeveria", "eucalyptus-plant", "ficus-bonsai",
  "fiddle-leaf-fig", "hibiscus-plant", "ixora", "jade-plant", "jasmine-plant",
  "kalanchoe", "lantana", "lavender-plant", "lucky-bamboo", "marigold-plant",
  "money-plant", "monstera", "orchid-plant", "peace-lily", "petunia-plant",
  "petunia-purple", "philodendron", "pilea", "poinsettia", "portulaca", "rose-plant",
  "rubber-plant", "schefflera", "snake-plant", "spider-plant", "syngonium",
  "tulsi-holy-basil", "verbena", "vinca", "zz-plant",
];

const BOUQUETS = [
  "blush-romance", "carnation-comfort", "gerbera-cheer", "orchid-elegance",
  "royal-white", "sunrise-delight",
];

/**
 * Extra angle shots for the hover gallery (every flower gets 3–4 views).
 * These are NOT products — they only power the card gallery.
 */
const EXTRA_SLUGS = [
  "gazania-2", "gazania-3",
  "cosmos-pink-2", "cosmos-pink-3",
  "zinnia-red-2", "zinnia-red-3",
  "sunflower-2", "sunflower-3",
  "babys-breath-2", "babys-breath-3",
  "eucalyptus-bunch-2", "eucalyptus-bunch-3",
  "lavender-bunch-2", "lavender-bunch-3",
  "jasmine-mogra-2", "jasmine-mogra-3",
  "lotus-pink-2", "lotus-pink-3",
  "peony-pink-2", "peony-pink-3",
  "gladiolus-pink-2", "gladiolus-pink-3",
  "iris-blue-2", "iris-blue-3",
  "daffodil-yellow-2", "daffodil-yellow-3",
  "freesia-yellow-2", "freesia-yellow-3",
  "alstroemeria-orange-2", "alstroemeria-orange-3",
  "anthurium-red-2", "anthurium-red-3",
  "bird-of-paradise-2", "bird-of-paradise-3",
  "tuberose-2", "tuberose-3",
  "dahlia-red-2", "dahlia-pink-2",
  "hydrangea-blue-2", "hydrangea-pink-2",
  "marigold-orange-2", "marigold-yellow-2",
];

async function newestBySlug() {
  const files = await readdir(SRC);
  const map = new Map();
  for (const f of files) {
    if (!f.endsWith(".png")) continue;
    const m = f.match(/^(.+)_(\d+)_([0-9a-f]+)\.png$/);
    if (!m) continue;
    const [, slug, ts] = m;
    const n = Number(ts);
    const prev = map.get(slug);
    if (!prev || n > prev.ts) map.set(slug, { file: f, ts: n });
  }
  return map;
}

async function main() {
  await mkdir(PRODUCTS, { recursive: true });
  const bySlug = await newestBySlug();
  const expected = [...FLOWERS, ...PLANTS, ...BOUQUETS, ...EXTRA_SLUGS];
  const missing = expected.filter((s) => !bySlug.has(s));
  if (missing.length) {
    console.error("Missing source images for:", missing.join(", "));
    process.exit(1);
  }

  const manifest = { generatedAt: new Date().toISOString(), flowers: [], plants: [], bouquets: [] };
  const groups = [
    ["flowers", FLOWERS],
    ["plants", PLANTS],
    ["bouquets", BOUQUETS],
  ];

  for (const [group, slugs] of groups) {
    for (const slug of slugs) {
      const src = path.join(SRC, bySlug.get(slug).file);
      const dest = path.join(PRODUCTS, `${slug}.jpg`);
      await sharp(src)
        .rotate()
        .resize(800, 800, { fit: "cover", position: "attention" })
        .flatten({ background: "#f7f3e8" })
        .jpeg({ quality: 80, mozjpeg: true })
        .toFile(dest);
      const { size } = await stat(dest);
      manifest[group].push({ slug, file: `images/products/${slug}.jpg`, bytes: size });
      console.log(`${dest}  ${(size / 1024).toFixed(0)} KB`);
    }
  }

  for (const slug of EXTRA_SLUGS) {
    const src = path.join(SRC, bySlug.get(slug).file);
    const dest = path.join(PRODUCTS, `${slug}.jpg`);
    await sharp(src)
      .rotate()
      .resize(800, 800, { fit: "cover", position: "attention" })
      .flatten({ background: "#f7f3e8" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(dest);
    console.log(`${dest}  (gallery view)`);
  }

  const oos = bySlug.get("out-of-stock");
  if (oos) {
    await sharp(path.join(SRC, oos.file))
      .rotate()
      .resize(1200, 600, { fit: "cover" })
      .flatten({ background: "#f7f3e8" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(path.join(OUT, "out-of-stock.jpg"));
    console.log("out-of-stock.jpg written");
  }

  await writeFile(path.join(PRODUCTS, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Done: ${manifest.flowers.length} flowers, ${manifest.plants.length} plants, ${manifest.bouquets.length} bouquets.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
