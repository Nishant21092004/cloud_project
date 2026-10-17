/**
 * Catalogue service — storefront reads with search / filters / sorting,
 * bouquet availability derived from recipes, plant variants, delivery
 * coverage (admin PIN rows + the India-wide demo estimate) and builder options.
 *
 * Search behaviour worth knowing (it is a product decision, not an accident):
 * a search that matches nothing in the catalogue is NOT a dead end. The
 * response carries an `unavailable` record so the storefront can show the item
 * as **Out of stock** with a photograph, plus the closest in-stock relatives —
 * which is what a customer actually wants when they type "genda phool" and we
 * do not list that exact variety.
 */
import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../lib/errors.js";
import { estimateIndiaDelivery, listDeliveryCircles } from "./pincode-data.js";

export interface CatalogFilters {
  q?: string;
  color?: string;
  minPrice?: number; // rupees in query, converted to paise
  maxPrice?: number;
  inStock?: boolean;
  sort?: "price_asc" | "price_desc" | "name" | "newest";
}

export interface CatalogMeta {
  total: number;
  returned: number;
  /** Present when the search string matched nothing in this category. */
  unavailable?: {
    term: string;
    /** Same words matched something in another category (e.g. "snake plant" typed under Flowers). */
    foundIn?: "flowers" | "bouquets" | "plants";
    foundInName?: string;
    /** Up to 4 loosely-related products worth showing instead of an empty page. */
    similar: Array<{ slug: string; name: string; pricePaise: number; inStock: boolean }>;
  };
}

/** Tokens a customer is likely to type that are not part of any product name. */
const STOP_WORDS = new Set(["for", "the", "and", "with", "phool", "flower", "flowers", "plant", "plants", "buy", "online", "near", "me", "ka", "ki", "ke", "wala", "wali", "a", "of", "in", "to"]);

function tokens(q: string): string[] {
  return [...new Set(
    q.toLowerCase().split(/[^a-z0-9]+/).map((t) => t.trim()).filter((t) => t.length > 2 && !STOP_WORDS.has(t)),
  )].slice(0, 6);
}

export async function listFlowers(f: CatalogFilters): Promise<{ flowers: unknown[]; meta: CatalogMeta }> {
  const where = {
    active: true,
    ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" as const } }, { description: { contains: f.q, mode: "insensitive" as const } }] } : {}),
    ...(f.color ? { colorHex: { contains: f.color } } : {}),
    ...(f.inStock ? { stockStems: { gt: 0 } } : {}),
    ...(f.minPrice !== undefined || f.maxPrice !== undefined
      ? { pricePerStemPaise: { gte: (f.minPrice ?? 0) * 100, lte: f.maxPrice !== undefined ? f.maxPrice * 100 : undefined } }
      : {}),
  };
  const flowers = await prisma.flower.findMany({
    where,
    orderBy: f.sort === "price_asc" ? { pricePerStemPaise: "asc" } : f.sort === "price_desc" ? { pricePerStemPaise: "desc" } : f.sort === "name" ? { name: "asc" } : { createdAt: "desc" },
  });
  const mapped = flowers.map((fl) => ({ ...fl, inStock: fl.stockStems > 0, unitLabel: "per stem" }));
  return {
    flowers: mapped,
    meta: {
      total: mapped.length,
      returned: mapped.length,
      ...(f.q && mapped.length === 0 ? { unavailable: await unavailableRecord(f.q, "flowers", { inStock: f.inStock, minPrice: f.minPrice, maxPrice: f.maxPrice }) } : {}),
    },
  };
}

export async function listBouquets(f: CatalogFilters): Promise<{ bouquets: unknown[]; meta: CatalogMeta }> {
  const bouquets = await prisma.bouquet.findMany({
    where: {
      active: true,
      ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" as const } }, { description: { contains: f.q, mode: "insensitive" as const } }] } : {}),
      ...(f.minPrice !== undefined || f.maxPrice !== undefined
        ? { pricePaise: { gte: (f.minPrice ?? 0) * 100, lte: f.maxPrice !== undefined ? f.maxPrice * 100 : undefined } }
        : {}),
    },
    include: { recipe: { include: { flower: true } } },
    orderBy: f.sort === "price_asc" ? { pricePaise: "asc" } : f.sort === "price_desc" ? { pricePaise: "desc" } : f.sort === "name" ? { name: "asc" } : { createdAt: "desc" },
  });
  const all = bouquets
    .map((b) => {
      const availableQty = b.recipe.reduce((min, ri) => (ri.flower.active ? Math.min(min, Math.floor(ri.flower.stockStems / ri.stems)) : 0), Number.MAX_SAFE_INTEGER);
      return {
        id: b.id, slug: b.slug, name: b.name, description: b.description, imageUrl: b.imageUrl,
        pricePaise: b.pricePaise, inStock: availableQty > 0, availableQty,
        composition: b.recipe.map((ri) => ({ flowerId: ri.flowerId, name: ri.flower.name, colorHex: ri.flower.colorHex, stems: ri.stems })),
      };
    })
    .filter((b) => (f.inStock ? b.inStock : true));
  return {
    bouquets: all,
    meta: {
      total: all.length,
      returned: all.length,
      ...(f.q && all.length === 0 ? { unavailable: await unavailableRecord(f.q, "bouquets", { inStock: f.inStock, minPrice: f.minPrice, maxPrice: f.maxPrice }) } : {}),
    },
  };
}

export async function listPlants(f: CatalogFilters): Promise<{ plants: unknown[]; meta: CatalogMeta }> {
  const plants = await prisma.plant.findMany({
    where: {
      active: true,
      ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" as const } }, { description: { contains: f.q, mode: "insensitive" as const } }] } : {}),
    },
    include: { variants: { where: { active: true }, orderBy: { pricePaise: "asc" } } },
    orderBy: f.sort === "name" ? { name: "asc" } : { createdAt: "desc" },
  });
  const mapped = plants
    .map((p) => {
      const prices = p.variants.map((v) => v.pricePaise);
      const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
      return {
        id: p.id, slug: p.slug, name: p.name, description: p.description, imageUrl: p.imageUrl,
        careWatering: p.careWatering, careLight: p.careLight, careNotes: p.careNotes,
        priceFromPaise: prices.length ? Math.min(...prices) : null,
        totalStock, inStock: totalStock > 0,
        variants: p.variants.map((v) => ({ id: v.id, label: v.label, potType: v.potType, size: v.size, pricePaise: v.pricePaise, stock: v.stock, inStock: v.stock > 0 })),
      };
    })
    .filter((p) => (f.inStock ? p.inStock : true));
  return {
    plants: mapped,
    meta: {
      total: mapped.length,
      returned: mapped.length,
      ...(f.q && mapped.length === 0 ? { unavailable: await unavailableRecord(f.q, "plants", { inStock: f.inStock, minPrice: f.minPrice, maxPrice: f.maxPrice }) } : {}),
    },
  };
}

/**
 * Zero-match research: is this product listed under another category, and which
 * catalogue items share the search words? Never throws — failing to produce
 * suggestions must not turn a search into an error page.
 */
async function unavailableRecord(
  q: string,
  category: "flowers" | "bouquets" | "plants",
  filters: { inStock?: boolean; minPrice?: number; maxPrice?: number },
): Promise<NonNullable<CatalogMeta["unavailable"]>> {
  const words = tokens(q);
  const result: NonNullable<CatalogMeta["unavailable"]> = { term: q, similar: [] };
  if (words.length === 0) return result;
  try {
    // 1. closest relatives inside the category the customer was searching
    if (category === "flowers") {
      const rows = await prisma.flower.findMany({
        where: { active: true, OR: words.flatMap((w) => [{ name: { contains: w, mode: "insensitive" as const } }, { description: { contains: w, mode: "insensitive" as const } }]) },
        orderBy: { stockStems: "desc" }, take: 30,
      });
      result.similar = rank(rows.map((r) => ({ slug: r.slug, name: r.name, pricePaise: r.pricePerStemPaise, inStock: r.stockStems > 0 })), words).slice(0, 4);
    } else if (category === "bouquets") {
      const rows = await prisma.bouquet.findMany({
        where: { active: true, OR: words.flatMap((w) => [{ name: { contains: w, mode: "insensitive" as const } }, { description: { contains: w, mode: "insensitive" as const } }]) },
        take: 30,
      });
      result.similar = rank(rows.map((r) => ({ slug: r.slug, name: r.name, pricePaise: r.pricePaise, inStock: true })), words).slice(0, 4);
    } else {
      const rows = await prisma.plant.findMany({
        where: { active: true, OR: words.flatMap((w) => [{ name: { contains: w, mode: "insensitive" as const } }, { description: { contains: w, mode: "insensitive" as const } }]) },
        include: { variants: { where: { active: true }, orderBy: { pricePaise: "asc" } } }, take: 30,
      });
      result.similar = rank(
        rows.map((r) => ({
          slug: r.slug, name: r.name,
          pricePaise: r.variants[0]?.pricePaise ?? 0,
          inStock: r.variants.some((v) => v.stock > 0),
        })),
        words,
      ).slice(0, 4);
    }
    if (filters.inStock) result.similar = result.similar.filter((s) => s.inStock);

    // 2. did the customer simply search the wrong department?
    const other = category === "flowers" ? ["plants", "bouquets"] as const : category === "plants" ? ["flowers", "bouquets"] as const : ["flowers", "plants"] as const;
    for (const cat of other) {
      const model = cat === "flowers" ? prisma.flower : cat === "plants" ? prisma.plant : prisma.bouquet;
      const hit = await (model as { findFirst(args: unknown): Promise<{ name: string } | null> }).findFirst({ where: { active: true, OR: words.map((w) => ({ name: { contains: w, mode: "insensitive" as const } })) } });
      if (hit) { result.foundIn = cat; result.foundInName = hit.name; break; }
    }
  } catch {
    // suggestions are a nicety, never a reason to fail a search
  }
  return result;
}

type SimilarRow = { slug: string; name: string; pricePaise: number; inStock: boolean };

/** Prefer names that contain several search words, then in-stock items. */
function rank(rows: SimilarRow[], words: string[]): SimilarRow[] {
  return rows
    .map((row) => ({ row, score: words.reduce((n, w) => n + (row.name.toLowerCase().includes(w) ? 3 : 0), 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.row.inStock) - Number(a.row.inStock))
    .map((x) => x.row);
}

export type ProductDetail =
  | ({ type: "flower" } & Awaited<ReturnType<typeof listFlowers>>["flowers"][number])
  | ({ type: "bouquet" } & Awaited<ReturnType<typeof listBouquets>>["bouquets"][number])
  | ({ type: "plant" } & Awaited<ReturnType<typeof listPlants>>["plants"][number]);

export async function getProductBySlug(slug: string): Promise<ProductDetail> {
  const flower = await prisma.flower.findUnique({ where: { slug } });
  if (flower && flower.active) {
    return { type: "flower", ...flower, inStock: flower.stockStems > 0, unitLabel: "per stem" };
  }
  const bouquet = await prisma.bouquet.findUnique({ where: { slug }, include: { recipe: { include: { flower: true } } } });
  if (bouquet && bouquet.active) {
    const { bouquets } = await listBouquets({});
    const [listed] = bouquets.filter((b) => (b as { slug: string }).slug === slug);
    if (listed) return { type: "bouquet", ...listed } as ProductDetail;
  }
  const plant = await prisma.plant.findUnique({ where: { slug } });
  if (plant && plant.active) {
    const { plants } = await listPlants({});
    const [listed] = plants.filter((p) => (p as { slug: string }).slug === slug);
    if (listed) return { type: "plant", ...listed } as ProductDetail;
  }
  throw notFound("Product not found");
}

/**
 * A customer asked for something we do not stock. Instead of a 404 the
 * storefront shows it as *out of stock* with a real photograph, so the search
 * is informative rather than a dead end. The flag in the response tells the UI
 * this is an unlisted item, not one of our own sold-out products.
 */
export async function lookupUnavailableProduct(q: string, category: "flowers" | "bouquets" | "plants") {
  return { unavailable: await unavailableRecord(q, category, {}), category };
}

export async function getBuilderOptions() {
  const [wrappings, ribbons, extras] = await Promise.all([
    prisma.wrappingOption.findMany({ where: { active: true }, orderBy: { chargePaise: "asc" } }),
    prisma.ribbonOption.findMany({ where: { active: true }, orderBy: { chargePaise: "asc" } }),
    prisma.extraOption.findMany({ where: { active: true }, orderBy: { chargePaise: "asc" } }),
  ]);
  return { wrappings, ribbons, extras };
}

export interface ServiceabilityResult {
  pincode: string;
  serviceable: boolean;
  deliveryFeePaise: number | null;
  city: string | null;
  state: string | null;
  circle: string | null;
  etaDaysMin: number | null;
  etaDaysMax: number | null;
  /** True when the fee came from the India-wide demo estimate, not an admin row. */
  demoCoverage: boolean;
  /** An admin explicitly switched this PIN off. */
  disabledByAdmin: boolean;
  hub: boolean;
  remote: boolean;
}

/**
 * Admin-configured PIN rows always win (including `active: false`, which is how
 * a shop turns a zone OFF). Everything else in India gets a demo estimate.
 */
export async function checkServiceability(pincode: string): Promise<ServiceabilityResult> {
  const row = await prisma.serviceablePincode.findUnique({ where: { pincode } });
  const estimate = estimateIndiaDelivery(pincode);
  if (row) {
    return {
      pincode,
      serviceable: row.active,
      deliveryFeePaise: row.active ? row.deliveryFeePaise : null,
      city: row.city ?? estimate?.city ?? null,
      state: estimate?.state ?? null,
      circle: estimate?.circle ?? null,
      etaDaysMin: row.active ? (estimate?.etaDaysMin ?? 3) : null,
      etaDaysMax: row.active ? (estimate?.etaDaysMax ?? 5) : null,
      demoCoverage: false,
      disabledByAdmin: !row.active,
      hub: estimate?.hub ?? false,
      remote: estimate?.remote ?? false,
    };
  }
  return {
    pincode,
    serviceable: estimate !== null,
    deliveryFeePaise: estimate?.feePaise ?? null,
    city: estimate?.city ?? null,
    state: estimate?.state ?? null,
    circle: estimate?.circle ?? null,
    etaDaysMin: estimate?.etaDaysMin ?? null,
    etaDaysMax: estimate?.etaDaysMax ?? null,
    demoCoverage: estimate !== null,
    disabledByAdmin: false,
    hub: estimate?.hub ?? false,
    remote: estimate?.remote ?? false,
  };
}

export async function getActiveSlots() {
  const slots = await prisma.deliverySlot.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, label: true } });
  if (slots.length > 0) return slots;
  // A database without the seeded slot rows must never leave checkout stuck.
  return [{ id: "default", label: "Any time (9 AM – 8 PM)" }];
}

/** Public coverage summary for the delivery page. */
export async function getDeliveryCoverage() {
  const rows = await prisma.serviceablePincode.findMany({ where: { active: true }, orderBy: { pincode: "asc" }, take: 200 });
  return {
    circles: listDeliveryCircles(),
    configuredPincodes: rows.map((r) => ({ pincode: r.pincode, city: r.city, deliveryFeePaise: r.deliveryFeePaise })),
  };
}
