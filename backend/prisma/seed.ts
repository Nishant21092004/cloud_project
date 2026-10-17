/**
 * BloomNest seed — realistic demonstration data (all editable).
 * Prices are INTEGER PAISE (₹1 = 100 paise).
 * Idempotent: safe to re-run; never touches orders or real users.
 * Run:  npm run seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const FLOWERS = [
  { slug: "rose-red", name: "Desi Red Rose", colorHex: "#c8102e", pricePerStemPaise: 3000, stockStems: 200, description: "The classic Indian gift flower — deep red Nathdwara roses with a strong, sweet fragrance. Sold per stem." },
  { slug: "rose-pink", name: "Pink Rose", colorHex: "#e56b8c", pricePerStemPaise: 3500, stockStems: 150, description: "Soft pink roses from Hosur farms. Gentle, romantic and perfect for mixing with lilies." },
  { slug: "rose-white", name: "White Rose", colorHex: "#f4efe2", pricePerStemPaise: 4000, stockStems: 120, description: "Pure white roses symbolising new beginnings — popular for weddings, sympathies and elegant bouquets." },
  { slug: "lily-white", name: "White Asiatic Lily", colorHex: "#fdfbf2", pricePerStemPaise: 8000, stockStems: 80, description: "Large trumpet-shaped white lilies. One stem carries 3–5 blooms and perfumes the whole room." },
  { slug: "lily-pink", name: "Oriental Pink Lily", colorHex: "#f2a7c3", pricePerStemPaise: 9000, stockStems: 60, description: "Showy pink Oriental lily with speckled petals and a rich fragrance. A premium bouquet centrepiece." },
  { slug: "orchid-purple", name: "Purple Orchid", colorHex: "#9b59b6", pricePerStemPaise: 12000, stockStems: 40, description: "Exotic purple Phalaenopsis stems from Thailand-grown stock. Long-lasting and effortlessly luxurious." },
  { slug: "carnation-pink", name: "Pink Carnation", colorHex: "#e78fb3", pricePerStemPaise: 2500, stockStems: 180, description: "Ruffled pink carnations that stay fresh for up to two weeks. Great value filler with body." },
  { slug: "gerbera-orange", name: "Orange Gerbera", colorHex: "#f39c12", pricePerStemPaise: 3500, stockStems: 150, description: "Big, cheerful orange gerbera daisies on strong stems. Instant happiness in any arrangement." },
  { slug: "gerbera-pink", name: "Pink Gerbera", colorHex: "#e84393", pricePerStemPaise: 3500, stockStems: 150, description: "Vivid pink gerberas — the easiest way to brighten a desk, bedside or birthday." },
  { slug: "sunflower", name: "Sunflower", colorHex: "#f4c430", pricePerStemPaise: 4500, stockStems: 100, description: "Farm-fresh Indian sunflowers with huge golden heads. Bring the sunshine indoors." },
  { slug: "marigold-orange", name: "Genda Marigold", colorHex: "#e67e22", pricePerStemPaise: 1000, stockStems: 500, description: "The everyday Indian flower — bright orange genda phool for pujas, garlands and festive décor." },
  { slug: "tulip-red", name: "Red Tulip", colorHex: "#d63031", pricePerStemPaise: 6000, stockStems: 70, description: "Imported red tulips with the classic cup shape. Limited seasonal stock — order early." },
  { slug: "chrysanthemum-white", name: "White Chrysanthemum", colorHex: "#f7f3e8", pricePerStemPaise: 3000, stockStems: 140, description: "Pom-pom white chrysanthemums, the traditional flower for respectful occasions and serene arrangements." },
  { slug: "tuberose", name: "Rajnigandha Tuberose", colorHex: "#fffdf6", pricePerStemPaise: 4000, stockStems: 160, description: "Rajnigandha spikes with an intoxicating evening fragrance. A nostalgic Indian favourite." },
];

const BOUQUETS = [
  {
    slug: "blush-romance", name: "Blush Romance", pricePaise: 64900,
    description: "Ten red and pink roses with pink lilies — our most-loved anniversary bouquet, hand-tied in blush paper.",
    recipe: { "rose-red": 5, "rose-pink": 5, "lily-pink": 2 },
  },
  {
    slug: "sunrise-delight", name: "Sunrise Delight", pricePaise: 54900,
    description: "Golden sunflowers, marigolds and orange gerberas bundled like an Indian morning — bright and auspicious.",
    recipe: { "sunflower": 4, "marigold-orange": 10, "gerbera-orange": 4 },
  },
  {
    slug: "orchid-elegance", name: "Orchid Elegance", pricePaise: 109900,
    description: "Purple Phalaenopsis orchids with rajnigandha and white lilies in a premium lilac wrap. Statement luxury.",
    recipe: { "orchid-purple": 4, "tuberose": 6, "lily-white": 2 },
  },
  {
    slug: "carnation-comfort", name: "Carnation Comfort", pricePaise: 59900,
    description: "A soft, long-lasting mix of pink carnations, white chrysanthemums and roses. Perfect for get-well wishes.",
    recipe: { "carnation-pink": 8, "chrysanthemum-white": 5, "rose-pink": 3 },
  },
  {
    slug: "royal-white", name: "Royal White", pricePaise: 79900,
    description: "An all-white arrangement of roses, lilies and tuberose — serene, sophisticated and wedding-ready.",
    recipe: { "rose-white": 6, "lily-white": 2, "tuberose": 5 },
  },
  {
    slug: "gerbera-cheer", name: "Gerbera Cheer", pricePaise: 59900,
    description: "A vibrant burst of orange and pink gerberas with sunflowers — guaranteed to make someone smile.",
    recipe: { "gerbera-orange": 5, "gerbera-pink": 5, "sunflower": 3 },
  },
];

const PLANTS = [
  {
    slug: "money-plant", name: "Money Plant (Pothos)",
    description: "The legendary low-maintenance Money Plant — believed to bring prosperity and impossible to kill. Trails beautifully on shelves.",
    careWatering: "Once a week", careLight: "Low to bright indirect light", careNotes: "Grows in soil or water. Trim leggy vines to keep it bushy.",
    variants: [
      { potType: "Plastic", size: "Small", label: "Plastic pot · Small", pricePaise: 19900, stock: 25 },
      { potType: "Hanging Basket", size: "Medium", label: "Hanging basket · Medium", pricePaise: 29900, stock: 12 },
      { potType: "Ceramic", size: "Medium", label: "Ceramic pot · Medium", pricePaise: 39900, stock: 8 },
    ],
  },
  {
    slug: "tulsi-holy-basil", name: "Tulsi (Holy Basil)",
    description: "The sacred Tulsi plant for your courtyard or balcony. Aromatic leaves used daily in kadhas and teas.",
    careWatering: "Daily, early morning", careLight: "Full sun (4–6 hours)", careNotes: "Remove seed heads to keep leaf growth lush.",
    variants: [
      { potType: "Nursery Bag", size: "Small", label: "Nursery bag · Small", pricePaise: 9900, stock: 40 },
      { potType: "Terracotta", size: "Medium", label: "Terracotta pot · Medium", pricePaise: 19900, stock: 20 },
    ],
  },
  {
    slug: "aloe-vera", name: "Aloe Vera",
    description: "A thick-leafed Aloe Vera — your kitchen-side first-aid plant for burns, skin and summer coolers.",
    careWatering: "Every 10–12 days", careLight: "Bright light, tolerates direct sun", careNotes: "Use gritty, fast-draining soil. Do not overwater.",
    variants: [
      { potType: "Plastic", size: "Small", label: "Plastic pot · Small", pricePaise: 24900, stock: 18 },
      { potType: "Ceramic", size: "Medium", label: "Ceramic pot · Medium", pricePaise: 39900, stock: 10 },
    ],
  },
  {
    slug: "snake-plant", name: "Snake Plant (Sansevieria)",
    description: "Architectural air-purifying swords that thrive on neglect. The best plant for bedrooms and offices.",
    careWatering: "Every 2 weeks", careLight: "Low light tolerant, prefers indirect", careNotes: "Almost indestructible. Water less in winter.",
    variants: [
      { potType: "Nursery", size: "Small", label: "Nursery pot · Small", pricePaise: 29900, stock: 15 },
      { potType: "Ceramic", size: "Medium", label: "Ceramic pot · Medium", pricePaise: 49900, stock: 9 },
      { potType: "Ceramic", size: "Large", label: "Ceramic pot · Large", pricePaise: 79900, stock: 4 },
    ],
  },
  {
    slug: "jade-plant", name: "Jade Plant",
    description: "A charming bonsai-style Jade with coin-shaped leaves — a favourite gifting plant for new homes and businesses.",
    careWatering: "Every 10 days", careLight: "Bright indirect with mild sun", careNotes: "Keep on the drier side; leaves wrinkle when thirsty.",
    variants: [
      { potType: "Plastic", size: "Small", label: "Plastic pot · Small", pricePaise: 29900, stock: 14 },
      { potType: "Ceramic", size: "Medium", label: "Ceramic pot · Medium", pricePaise: 49900, stock: 7 },
    ],
  },
  {
    slug: "peace-lily", name: "Peace Lily",
    description: "Glossy leaves and elegant white spathes that bloom for months. Excellent at filtering indoor air.",
    careWatering: "Twice a week", careLight: "Medium indirect light", careNotes: "Leaves droop dramatically when dry — a helpful reminder.",
    variants: [
      { potType: "Nursery", size: "Medium", label: "Nursery pot · Medium", pricePaise: 34900, stock: 11 },
      { potType: "Ceramic", size: "Large", label: "Ceramic pot · Large", pricePaise: 64900, stock: 5 },
    ],
  },
  {
    slug: "areca-palm", name: "Areca Palm",
    description: "A lush, feather-frond Areca Palm that instantly turns a corner into a tropical corner. Pet-safe.",
    careWatering: "Every 2–3 days in summer", careLight: "Bright indirect light", careNotes: "Mist fronds in dry summers to prevent browning tips.",
    variants: [
      { potType: "Nursery", size: "Large", label: "Nursery pot · Large", pricePaise: 54900, stock: 8 },
      { potType: "Ceramic", size: "Large", label: "Ceramic pot · Large", pricePaise: 89900, stock: 3 },
    ],
  },
  {
    slug: "zz-plant", name: "ZZ Plant",
    description: "Glossy, sculptural and famously unkillable — the ZZ Plant shrugs off low light, dry air and forgotten waterings.",
    careWatering: "Every 2 weeks", careLight: "Low to bright indirect", careNotes: "Rhizomes store water; worst enemy is overwatering.",
    variants: [
      { potType: "Plastic", size: "Small", label: "Plastic pot · Small", pricePaise: 34900, stock: 12 },
      { potType: "Ceramic", size: "Medium", label: "Ceramic pot · Medium", pricePaise: 59900, stock: 6 },
    ],
  },
];


// Expanded demo catalogue: 100+ DISTINCT product names across flowers, plants and bouquets.
// These are sample listings and demo inventory, not claims of physical stock.
const ADDITIONAL_FLOWERS = [
  "Yellow Rose", "Peach Rose", "Lavender Rose", "Coral Rose", "Burgundy Rose", "Mini Spray Rose",
  "Yellow Asiatic Lily", "Orange Asiatic Lily", "Red Oriental Lily", "Stargazer Lily", "Calla Lily", "Peruvian Lily",
  "White Orchid", "Pink Orchid", "Dendrobium Orchid", "Cymbidium Orchid", "Vanda Orchid",
  "Red Carnation", "White Carnation", "Yellow Carnation", "Purple Carnation", "Striped Carnation",
  "Yellow Gerbera", "Red Gerbera", "White Gerbera", "Purple Gerbera", "Peach Gerbera",
  "Yellow Tulip", "Pink Tulip", "White Tulip", "Purple Tulip", "Orange Tulip",
  "Blue Iris", "White Iris", "Yellow Iris", "Pink Gladiolus", "White Gladiolus", "Red Gladiolus",
  "White Daisy", "Shasta Daisy", "Aster Purple", "Aster Pink", "White Lisianthus", "Purple Lisianthus",
  "Pink Peony", "White Peony", "Blue Delphinium", "Pink Hydrangea", "Blue Hydrangea", "White Hydrangea",
  "Bird of Paradise", "Anthurium Red", "Baby's Breath", "White Freesia", "Yellow Freesia", "Waxflower Pink",
  "Purple Statice", "Red Amaryllis", "White Ranunculus", "Pink Ranunculus", "Purple Chrysanthemum",
  "Yellow Chrysanthemum", "Jasmine Mogra", "Pink Lotus", "Yellow Dahlia", "Red Dahlia",
];
const ADDITIONAL_PLANTS = [
  "Golden Pothos", "Neon Pothos", "Marble Queen Pothos", "Heartleaf Philodendron", "Philodendron Brasil",
  "Monstera Deliciosa", "Monstera Adansonii", "Rubber Plant", "Variegated Rubber Plant", "Fiddle Leaf Fig",
  "Weeping Fig", "Chinese Evergreen", "Aglaonema Red", "Spider Plant", "Boston Fern", "Bird's Nest Fern",
  "Maidenhair Fern", "Calathea Orbifolia", "Calathea Medallion", "Prayer Plant", "Alocasia Polly",
  "Elephant Ear Plant", "Ponytail Palm", "Parlor Palm", "Kentia Palm", "Bamboo Palm", "Lucky Bamboo",
  "Dracaena Marginata", "Dracaena Fragrans", "Croton Petra", "Syngonium Pink", "Syngonium Green",
  "String of Pearls", "String of Hearts", "Echeveria Succulent", "Haworthia Zebra", "Burro's Tail Succulent",
  "Christmas Cactus", "Pencil Cactus", "Bunny Ear Cactus", "Golden Barrel Cactus", "African Violet",
  "Anthurium Plant", "Begonia Rex", "Orchid Pot Plant", "Bird of Paradise Plant", "Schefflera Arboricola",
  "Hoya Carnosa", "English Ivy", "Pilea Peperomioides", "Peperomia Obtusifolia", "Fittonia Nerve Plant",
];
function productSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function keywordFor(name: string): string {
  const cleaned = name.replace(/\([^)]*\)/g, "").replace(/[^a-zA-Z ]/g, "").trim().toLowerCase();
  const words = cleaned.split(/\s+/);
  const family = words.find((word) => ["rose", "lily", "orchid", "carnation", "gerbera", "tulip", "iris", "gladiolus", "daisy", "aster", "lisianthus", "peony", "delphinium", "hydrangea", "chrysanthemum", "jasmine", "lotus", "dahlia", "pothos", "philodendron", "monstera", "fern", "palm", "cactus", "plant", "succulent", "anthurium", "aloe", "bamboo", "ficus"].includes(word));
  return family ?? words.slice(-2).join("-");
}
function photoUrl(name: string, slug: string, kind: "flower" | "plant" | "bouquet"): string {
  const topic = keywordFor(name);
  // A deterministic, keyword-based remote *photograph* from LoremFlickr.
  // Display is illustrative; remote services require internet. The UI has local SVG fallback.
  const hash = Array.from(slug).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 3);
  const search = kind === "plant" ? `${topic},plant` : kind === "bouquet" ? "flower-bouquet" : `${topic},flower`;
  return `https://loremflickr.com/640/640/${encodeURIComponent(search)}?lock=${hash % 99991}`;
}
const MORE_FLOWERS = ADDITIONAL_FLOWERS.map((name, index) => ({
  slug: `variety-${productSlug(name)}`, name,
  colorHex: ["#ec6c89", "#f5d05c", "#f5a38c", "#ac83d0", "#eee8df"][index % 5],
  pricePerStemPaise: (25 + (index % 12) * 8) * 100,
  stockStems: 30 + (index % 8) * 15,
  description: `${name} — a florist's selection for arrangements and custom bouquets. Demo availability and per-stem price; confirm stock before fulfilment.`,
}));
const MORE_PLANTS = ADDITIONAL_PLANTS.map((name, index) => ({
  slug: `variety-${productSlug(name)}`, name,
  description: `${name} in a nursery pot. Demo listing; follow species-specific care guidance before growing.`,
  careWatering: index % 3 === 0 ? "Water when the upper soil is dry" : "Check soil moisture weekly",
  careLight: index % 4 === 0 ? "Bright indirect light" : "Species-dependent filtered light",
  careNotes: "Check the plant's actual light and moisture requirements; avoid overwatering.",
  variants: [
    { potType: "Nursery", size: "Small", label: "Nursery pot · Small", pricePaise: (199 + (index % 9) * 40) * 100, stock: 12 + (index % 6) * 3 },
    { potType: "Ceramic", size: "Medium", label: "Ceramic pot · Medium", pricePaise: (399 + (index % 9) * 45) * 100, stock: 5 + (index % 5) },
  ],
}));
const MORE_BOUQUETS = [
  { slug: "garden-party", name: "Garden Party", pricePaise: 69900, description: "Fresh gerberas and roses in a cheerful party bouquet.", recipe: { "gerbera-orange": 4, "gerbera-pink": 4, "rose-pink": 4 } },
  { slug: "pink-blossom", name: "Pink Blossom", pricePaise: 74900, description: "Elegant pink lilies, carnations and roses.", recipe: { "lily-pink": 2, "carnation-pink": 8, "rose-pink": 4 } },
  { slug: "sunshine-smile", name: "Sunshine Smile", pricePaise: 59900, description: "Sunny yellow sunflowers with orange gerberas.", recipe: { "sunflower": 5, "gerbera-orange": 5 } },
  { slug: "serene-whites", name: "Serene Whites", pricePaise: 89900, description: "Graceful lilies and pure white roses.", recipe: { "rose-white": 8, "lily-white": 3 } },
  { slug: "purple-dream", name: "Purple Dream", pricePaise: 119900, description: "Orchids wrapped with white blooms.", recipe: { "orchid-purple": 5, "rose-white": 5 } },
  { slug: "festival-gold", name: "Festival Gold", pricePaise: 39900, description: "Indian marigold and sunshine gerbera bouquet.", recipe: { "marigold-orange": 20, "gerbera-orange": 4 } },
];

const WRAPPINGS = [
  { name: "Classic Paper", chargePaise: 3000 },
  { name: "Kraft Paper", chargePaise: 5000 },
  { name: "Jute Wrap", chargePaise: 7000 },
  { name: "Premium Floral Sheet", chargePaise: 8000 },
];
const RIBBONS = [
  { name: "No Ribbon", chargePaise: 0 },
  { name: "Jute Twine", chargePaise: 1000 },
  { name: "Satin Ribbon", chargePaise: 2000 },
  { name: "Velvet Ribbon", chargePaise: 4000 },
];
const EXTRAS = [
  { name: "Greeting Card", kind: "CARD" as const, chargePaise: 3000 },
  { name: "Chocolate Box (5 pc)", kind: "ADDON" as const, chargePaise: 15000 },
  { name: "Small Teddy Bear", kind: "ADDON" as const, chargePaise: 19900 },
  { name: "Flower Food Sachet", kind: "ADDON" as const, chargePaise: 1000 },
];

const PINCODES: Array<[string, string, number]> = [
  ["110001", "New Delhi — Connaught Place", 4000],
  ["110002", "New Delhi — Ajmeri Gate", 4000],
  ["110003", "New Delhi — Civil Lines", 4500],
  ["110019", "New Delhi — Kalkaji", 4500],
  ["110024", "New Delhi — Lajpat Nagar", 4500],
  ["201301", "Noida", 5000],
  ["122001", "Gurugram", 5000],
  ["400001", "Mumbai — Fort", 7000],
  ["560001", "Bengaluru — MG Road", 7000],
  ["600001", "Chennai — Parrys", 7000],
  ["700001", "Kolkata — BBD Bagh", 7000],
  ["500001", "Hyderabad — Old City", 7000],
];

const SLOTS = [
  { label: "Morning (9 AM – 12 PM)", sortOrder: 1 },
  { label: "Afternoon (12 – 4 PM)", sortOrder: 2 },
  { label: "Evening (4 – 8 PM)", sortOrder: 3 },
];

async function main() {
  console.log("🌱 Seeding BloomNest demonstration data…");

  for (const f of [...FLOWERS, ...MORE_FLOWERS]) {
    const existing = await prisma.flower.findUnique({ where: { slug: f.slug }, select: { imageUrl: true } });
    await prisma.flower.upsert({
      where: { slug: f.slug },
      create: { ...f, imageUrl: photoUrl(f.name, f.slug, "flower") },
      update: { description: f.description, colorHex: f.colorHex,
        ...(existing?.imageUrl.endsWith(".svg") ? { imageUrl: photoUrl(f.name, f.slug, "flower") } : {}) }, // preserves admin photos and prices
    });
  }

  for (const b of [...BOUQUETS, ...MORE_BOUQUETS]) {
    const existing = await prisma.bouquet.findUnique({ where: { slug: b.slug }, select: { imageUrl: true } });
    const created = await prisma.bouquet.upsert({
      where: { slug: b.slug },
      create: {
        slug: b.slug, name: b.name, description: b.description,
        pricePaise: b.pricePaise, imageUrl: photoUrl(b.name, b.slug, "bouquet"),
      },
      update: { description: b.description,
        ...(existing?.imageUrl.endsWith(".svg") ? { imageUrl: photoUrl(b.name, b.slug, "bouquet") } : {}) },
    });
    for (const [flowerSlug, stems] of Object.entries(b.recipe)) {
      const flower = await prisma.flower.findUniqueOrThrow({ where: { slug: flowerSlug } });
      await prisma.bouquetItem.upsert({
        where: { bouquetId_flowerId: { bouquetId: created.id, flowerId: flower.id } },
        create: { bouquetId: created.id, flowerId: flower.id, stems },
        update: { stems },
      });
    }
  }

  for (const p of [...PLANTS, ...MORE_PLANTS]) {
    const existing = await prisma.plant.findUnique({ where: { slug: p.slug }, select: { imageUrl: true } });
    const plant = await prisma.plant.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug, name: p.name, description: p.description,
        careWatering: p.careWatering, careLight: p.careLight, careNotes: p.careNotes,
        imageUrl: photoUrl(p.name, p.slug, "plant"),
      },
      update: { description: p.description, careWatering: p.careWatering, careLight: p.careLight, careNotes: p.careNotes,
        ...(existing?.imageUrl.endsWith(".svg") ? { imageUrl: photoUrl(p.name, p.slug, "plant") } : {}) },
    });
    for (const v of p.variants) {
      await prisma.plantVariant.upsert({
        where: { plantId_potType_size: { plantId: plant.id, potType: v.potType, size: v.size } },
        create: { plantId: plant.id, ...v },
        update: { label: v.label },
      });
    }
  }

  for (const w of WRAPPINGS) await prisma.wrappingOption.upsert({ where: { name: w.name }, create: w, update: {} });
  for (const r of RIBBONS) await prisma.ribbonOption.upsert({ where: { name: r.name }, create: r, update: {} });
  for (const e of EXTRAS) await prisma.extraOption.upsert({ where: { name: e.name }, create: e, update: {} });
  for (const [pincode, city, fee] of PINCODES) {
    await prisma.serviceablePincode.upsert({ where: { pincode }, create: { pincode, city, deliveryFeePaise: fee }, update: { city } });
  }
  for (const s of SLOTS) await prisma.deliverySlot.upsert({ where: { label: s.label }, create: s, update: {} });

  // Demonstration accounts (for evaluation; create real admins via `npm run create-admin`)
  const adminPass = await bcrypt.hash("Admin@1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@bloomnest.test" },
    create: { email: "admin@bloomnest.test", name: "BloomNest Admin", passwordHash: adminPass, role: "ADMIN", phone: "9800000001" },
    update: {},
  });
  const demoPass = await bcrypt.hash("Demo@1234", 10);
  await prisma.user.upsert({
    where: { email: "demo@bloomnest.test" },
    create: { email: "demo@bloomnest.test", name: "Demo Customer", passwordHash: demoPass, role: "CUSTOMER", phone: "9800000002" },
    update: {},
  });

  const counts = {
    flowers: await prisma.flower.count(),
    bouquets: await prisma.bouquet.count(),
    plants: await prisma.plant.count(),
    variants: await prisma.plantVariant.count(),
    pincodes: await prisma.serviceablePincode.count(),
  };
  console.log("✅ Seed complete:", counts);
  console.log("   Demo admin    : admin@bloomnest.test / Admin@1234");
  console.log("   Demo customer : demo@bloomnest.test / Demo@1234");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
