/**
 * BloomNest seed — realistic demonstration data (all editable afterwards).
 * -----------------------------------------------------------------------
 * Prices are INTEGER PAISE (₹1 = 100 paise). Stock lives per stem / per
 * plant variant.
 *
 * Safe to re-run (idempotent):
 *   - never touches orders, carts or real users;
 *   - preserves prices, stock and any photo an admin uploaded;
 *   - retires the pre-2026-10 placeholder catalogue ("variety-*" slugs and the
 *     old 14-item core list) instead of leaving duplicates on the shop page —
 *     and only when nothing references those rows.
 *
 * Run:  npm run seed        (or: docker compose exec backend npm run seed)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { flowerRecords, FLOWER_FAMILIES } from "./data/flowers";
import { plantRecords, PLANT_GROUPS } from "./data/plants";
import { BOUQUETS } from "./data/bouquets";

const prisma = new PrismaClient();

/* ── photographs ───────────────────────────────────────────────────────
 * imageUrl stores a *fallback* photograph only. The storefront first asks
 * Wikimedia Commons for real photographs of the exact species (see
 * frontend/src/lib/photos.ts); if that call cannot be made (offline demo,
 * blocked network) the browser falls back to this keyword search and finally
 * to the bundled SVG. LoremFlickr serves third-party CC photos picked by
 * keyword, so it is illustrative — never guaranteed to be the listed cultivar.
 * ────────────────────────────────────────────────────────────────────── */
function photoUrl(terms: string, slug: string, kind: "flower" | "plant" | "bouquet"): string {
  const cleaned = terms.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  const search =
    kind === "bouquet" ? "flower,bouquet"
    : kind === "plant" ? [cleaned[0], "plant", "pot"].filter(Boolean).join(",")
    : cleaned.slice(0, 2).join(",");
  const hash = Array.from(slug).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 3);
  return `https://loremflickr.com/800/800/${encodeURIComponent(search)}?lock=${hash % 99991}`;
}

/** True when the stored image is ours to replace (fallback art / generated URL). */
function isReplaceableImage(url: string | null | undefined): boolean {
  if (!url) return true;
  return url.endsWith(".svg") || url.includes("loremflickr.com");
}

/** Slugs from the pre-expansion demo catalogue, retired on re-seed. */
const LEGACY_FLOWER_SLUGS = [
  "rose-red", "rose-pink", "rose-white", "lily-white", "lily-pink", "orchid-purple", "carnation-pink",
  "gerbera-orange", "gerbera-pink", "sunflower", "marigold-orange", "tulip-red", "chrysanthemum-white", "tuberose",
];
const LEGACY_PLANT_SLUGS = ["money-plant", "tulsi-holy-basil", "aloe-vera", "snake-plant", "jade-plant", "peace-lily", "areca-palm", "zz-plant"];

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
const SLOTS = [
  { label: "Morning (9 AM – 12 PM)", sortOrder: 1 },
  { label: "Afternoon (12 – 4 PM)", sortOrder: 2 },
  { label: "Evening (4 – 8 PM)", sortOrder: 3 },
];

/**
 * A handful of PIN rows so the admin screen shows something real and so an
 * "explicit override" is demonstrable. Everything else in India is priced by
 * the coverage engine — these are the exceptions, not the whitelist.
 */
/**
 * Explicit exceptions to the coverage engine, not a whitelist: every other
 * Indian PIN is priced by src/modules/catalog/pincode-data.ts. Fees here are
 * chosen shop values (₹) and `active: false` demonstrates a disabled zone.
 * A `9xxxxx` PIN is Army/APO mail — always switched off.
 */
const PINCODES: Array<{ pincode: string; city: string; feeRupees: number; active?: boolean }> = [
  { pincode: "110001", city: "New Delhi — Connaught Place", feeRupees: 40 },
  { pincode: "110019", city: "New Delhi — Kalkaji", feeRupees: 40 },
  { pincode: "122001", city: "Gurugram — Sector 17", feeRupees: 45 },
  { pincode: "201301", city: "Noida — Sector 18", feeRupees: 45 },
  { pincode: "380001", city: "Ahmedabad — Lal Darwaja", feeRupees: 50 },
  { pincode: "395007", city: "Surat — Adajan", feeRupees: 50 },
  { pincode: "400001", city: "Mumbai — Fort", feeRupees: 55 },
  { pincode: "411001", city: "Pune — Camp", feeRupees: 55 },
  { pincode: "452001", city: "Indore — Palda", feeRupees: 65 },
  { pincode: "500001", city: "Hyderabad — Old City", feeRupees: 65 },
  { pincode: "560001", city: "Bengaluru — MG Road", feeRupees: 65 },
  { pincode: "600001", city: "Chennai — Parrys", feeRupees: 65 },
  { pincode: "682001", city: "Kochi — Fort Kochi", feeRupees: 75 },
  { pincode: "700001", city: "Kolkata — BBD Bagh", feeRupees: 75 },
  { pincode: "800001", city: "Patna — Gandhi Maidan", feeRupees: 85 },
  { pincode: "171001", city: "Shimla — The Ridge", feeRupees: 110 },
  { pincode: "744101", city: "Port Blair — Andaman & Nicobar", feeRupees: 140 },
  { pincode: "999999", city: "Army Postal / APO (not serviceable online)", feeRupees: 0, active: false },
];

async function pruneLegacy() {
  const retired = { flowers: 0, plants: 0, bouquets: 0 };
  const legacyFlowerIds = await prisma.flower.findMany({
    where: { OR: [{ slug: { startsWith: "variety-" } }, { slug: { in: LEGACY_FLOWER_SLUGS } }] },
    select: { id: true, slug: true },
  });
  for (const f of legacyFlowerIds) {
    // Anything an order, a cart or a saved custom bouquet points at is only
    // switched off — history and other people's carts must never break.
    const referenced =
      (await prisma.orderItem.count({ where: { flowerId: f.id } })) +
      (await prisma.cartItem.count({ where: { flowerId: f.id } })) +
      (await prisma.customBouquetFlower.count({ where: { flowerId: f.id } }));
    if (referenced > 0) {
      await prisma.flower.update({ where: { id: f.id }, data: { active: false } });
    } else {
      await prisma.bouquetItem.deleteMany({ where: { flowerId: f.id } });
      await prisma.flower.delete({ where: { id: f.id } });
    }
    retired.flowers += 1;
  }
  for (const slug of LEGACY_PLANT_SLUGS) {
    const plant = await prisma.plant.findUnique({ where: { slug }, include: { variants: true } });
    if (!plant) continue;
    const variantIds = plant.variants.map((v) => v.id);
    const referenced =
      (await prisma.orderItem.count({ where: { plantId: plant.id } })) +
      (variantIds.length
        ? await prisma.cartItem.count({ where: { plantVariantId: { in: variantIds } } }) +
          await prisma.orderItem.count({ where: { plantVariantId: { in: variantIds } } })
        : 0);
    if (referenced > 0) {
      await prisma.plant.update({ where: { id: plant.id }, data: { active: false } });
      for (const id of variantIds) await prisma.plantVariant.update({ where: { id }, data: { active: false } });
    } else {
      await prisma.plantVariant.deleteMany({ where: { plantId: plant.id } });
      await prisma.plant.delete({ where: { id: plant.id } });
    }
    retired.plants += 1;
  }
  return retired;
}

async function main() {
  console.log("🌱 Seeding BloomNest demonstration data…");
  const retired = await pruneLegacy();
  if (retired.flowers || retired.plants) console.log(`   retired placeholder rows → flowers: ${retired.flowers}, plants: ${retired.plants}`);

  /* flowers */
  const flowersByName = new Map<string, { id: string; pricePerStemPaise: number }>();
  for (const f of flowerRecords()) {
    const existing = await prisma.flower.findUnique({ where: { slug: f.slug }, select: { id: true, imageUrl: true } });
    const row = await prisma.flower.upsert({
      where: { slug: f.slug },
      create: {
        slug: f.slug, name: f.name, description: f.description, colorHex: f.colorHex,
        pricePerStemPaise: f.pricePerStemPaise, stockStems: f.stockStems,
        lowStockThreshold: Math.max(10, Math.round(f.stockStems * 0.1)),
        imageUrl: photoUrl(f.photoTerms, f.slug, "flower"), active: true,
      },
      // Prices and stock are the shop's business — never overwritten by a re-seed.
      update: {
        name: f.name, description: f.description, colorHex: f.colorHex, active: true,
        ...(isReplaceableImage(existing?.imageUrl) ? { imageUrl: photoUrl(f.photoTerms, f.slug, "flower") } : {}),
      },
    });
    flowersByName.set(row.name, { id: row.id, pricePerStemPaise: row.pricePerStemPaise });
  }

  /* bouquets — priced from live stem prices so a recipe can never cost less than its stems */
  const warnings: string[] = [];
  for (const b of BOUQUETS) {
    const recipeIds: Array<{ flowerId: string; stems: number; name: string }> = [];
    let stemCostPaise = 0;
    for (const [name, stems] of Object.entries(b.recipe)) {
      const flower = flowersByName.get(name);
      if (!flower) {
        warnings.push(`bouquet "${b.name}" references unknown flower "${name}" — line skipped`);
        continue;
      }
      recipeIds.push({ flowerId: flower.id, stems, name });
      stemCostPaise += flower.pricePerStemPaise * stems;
    }
    // retail = stems + arranging margin + packing, snapped to a ₹…49/₹…99 price point
    const rawRupees = (stemCostPaise / 100) * b.margin + b.packingRupees;
    const derived = Math.max(99, Math.floor(rawRupees / 50) * 50 - 1);
    const existing = await prisma.bouquet.findUnique({ where: { slug: b.slug }, select: { id: true, imageUrl: true, pricePaise: true } });
    const bouquet = await prisma.bouquet.upsert({
      where: { slug: b.slug },
      create: { slug: b.slug, name: b.name, description: b.description, pricePaise: derived, imageUrl: photoUrl("flower,bouquet", b.slug, "bouquet"), active: true },
      update: {
        name: b.name, description: b.description, active: true,
        ...(isReplaceableImage(existing?.imageUrl) ? { imageUrl: photoUrl("flower,bouquet", b.slug, "bouquet") } : {}),
      },
    });
    if (existing && existing.pricePaise < stemCostPaise) {
      warnings.push(`bouquet "${b.name}" is priced ₹${(existing.pricePaise / 100).toFixed(0)} but its stems cost ₹${(stemCostPaise / 100).toFixed(0)} — edit it in Admin → Products`);
    }
    // replace the recipe (stale lines removed; nothing else references BouquetItem)
    await prisma.bouquetItem.deleteMany({ where: { bouquetId: bouquet.id } });
    for (const line of recipeIds) {
      await prisma.bouquetItem.create({ data: { bouquetId: bouquet.id, flowerId: line.flowerId, stems: line.stems } });
    }
  }

  /* plants + variants */
  for (const p of plantRecords()) {
    const existing = await prisma.plant.findUnique({ where: { slug: p.slug }, select: { id: true, imageUrl: true } });
    const plant = await prisma.plant.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug, name: p.name, description: p.description,
        careWatering: p.careWatering, careLight: p.careLight, careNotes: p.careNotes,
        imageUrl: photoUrl(p.photoTerms, p.slug, "plant"), active: true,
      },
      update: {
        name: p.name, description: p.description, careWatering: p.careWatering, careLight: p.careLight, careNotes: p.careNotes, active: true,
        ...(isReplaceableImage(existing?.imageUrl) ? { imageUrl: photoUrl(p.photoTerms, p.slug, "plant") } : {}),
      },
    });
    for (const v of p.variants) {
      await prisma.plantVariant.upsert({
        where: { plantId_potType_size: { plantId: plant.id, potType: v.potType, size: v.size } },
        create: { plantId: plant.id, potType: v.potType, size: v.size, label: v.label, pricePaise: v.pricePaise, stock: v.stock, active: true },
        update: { label: v.label, active: true },
      });
    }
    // retire variants this re-seed no longer offers
    const wanted = new Set(p.variants.map((v) => `${v.potType}|${v.size}`));
    const current = await prisma.plantVariant.findMany({ where: { plantId: plant.id }, select: { id: true, potType: true, size: true } });
    for (const cv of current) {
      if (wanted.has(`${cv.potType}|${cv.size}`)) continue;
      const used =
        (await prisma.orderItem.count({ where: { plantVariantId: cv.id } })) +
        (await prisma.cartItem.count({ where: { plantVariantId: cv.id } }));
      if (used > 0) await prisma.plantVariant.update({ where: { id: cv.id }, data: { active: false } });
      else await prisma.plantVariant.delete({ where: { id: cv.id } });
    }
  }

  /* options, slots, delivery config */
  for (const w of WRAPPINGS) await prisma.wrappingOption.upsert({ where: { name: w.name }, create: w, update: {} });
  for (const r of RIBBONS) await prisma.ribbonOption.upsert({ where: { name: r.name }, create: r, update: {} });
  for (const e of EXTRAS) await prisma.extraOption.upsert({ where: { name: e.name }, create: e, update: {} });
  for (const s of SLOTS) await prisma.deliverySlot.upsert({ where: { label: s.label }, create: s, update: {} });

  for (const pin of PINCODES) {
    const active = pin.active ?? true;
    await prisma.serviceablePincode.upsert({
      where: { pincode: pin.pincode },
      create: { pincode: pin.pincode, city: pin.city, deliveryFeePaise: Math.round(pin.feeRupees * 100), active },
      // a re-seed never clobbers a fee the shop has since edited — only the label
      update: { city: pin.city, active },
    });
  }

  /* demo accounts (evaluation only — real admins come from `npm run create-admin`) */
  const adminPass = await bcrypt.hash("Admin@1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@bloomnest.test" },
    create: { email: "admin@bloomnest.test", name: "BloomNest Admin", passwordHash: adminPass, role: "ADMIN", phone: "9800000001" },
    update: {},
  });
  const demoPass = await bcrypt.hash("Demo@1234", 10);
  const demo = await prisma.user.upsert({
    where: { email: "demo@bloomnest.test" },
    create: { email: "demo@bloomnest.test", name: "Demo Customer", passwordHash: demoPass, role: "CUSTOMER", phone: "9800000002" },
    update: {},
  });
  // A saved address in a non-metro PIN so checkout demos India-wide coverage at once.
  const savedPin = "395007";
  const existingAddr = await prisma.address.findFirst({ where: { userId: demo.id, pincode: savedPin } });
  if (!existingAddr) {
    await prisma.address.create({
      data: { userId: demo.id, recipientName: "Demo Customer", phone: "9800000002", pincode: savedPin, line1: "402 Riverside Residency, Varachha", city: "Surat", state: "Gujarat", isDefault: true },
    });
  }

  const counts = {
    flowers: await prisma.flower.count({ where: { active: true } }),
    bouquets: await prisma.bouquet.count({ where: { active: true } }),
    plants: await prisma.plant.count({ where: { active: true } }),
    variants: await prisma.plantVariant.count({ where: { active: true } }),
    pincodes: await prisma.serviceablePincode.count(),
    outOfStockFlowers: await prisma.flower.count({ where: { active: true, stockStems: 0 } }),
  };
  console.log("✅ Seed complete:", counts);
  console.log(`   catalogue source: ${FLOWER_FAMILIES.length} flower families, ${PLANT_GROUPS.length} plant groups, ${BOUQUETS.length} bouquet recipes`);
  for (const w of warnings) console.warn(`   ⚠️  ${w}`);
  console.log("   Demo admin    : admin@bloomnest.test / Admin@1234");
  console.log("   Demo customer : demo@bloomnest.test / Demo@1234  (default address: Surat 395007)");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
