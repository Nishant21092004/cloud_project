/**
 * Catalogue service — storefront reads with search / filters / sorting,
 * bouquet availability derived from recipes, plant variants, delivery
 * configuration (serviceable PIN codes, slots) and builder options.
 */
import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../lib/errors.js";

export interface CatalogFilters {
  q?: string;
  color?: string;
  minPrice?: number; // rupees in query, converted to paise
  maxPrice?: number;
  inStock?: boolean;
  sort?: "price_asc" | "price_desc" | "name" | "newest";
}

export async function listFlowers(f: CatalogFilters) {
  const flowers = await prisma.flower.findMany({
    where: {
      active: true,
      ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { description: { contains: f.q, mode: "insensitive" } }] } : {}),
      ...(f.color ? { colorHex: { contains: f.color } } : {}),
      ...(f.inStock ? { stockStems: { gt: 0 } } : {}),
      ...(f.minPrice !== undefined || f.maxPrice !== undefined
        ? { pricePerStemPaise: { gte: (f.minPrice ?? 0) * 100, lte: f.maxPrice !== undefined ? f.maxPrice * 100 : undefined } }
        : {}),
    },
    orderBy: f.sort === "price_asc" ? { pricePerStemPaise: "asc" } : f.sort === "price_desc" ? { pricePerStemPaise: "desc" } : f.sort === "name" ? { name: "asc" } : { createdAt: "desc" },
  });
  return flowers.map((fl) => ({ ...fl, inStock: fl.stockStems > 0, unitLabel: "per stem" }));
}

export async function listBouquets(f: CatalogFilters) {
  const bouquets = await prisma.bouquet.findMany({
    where: {
      active: true,
      ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { description: { contains: f.q, mode: "insensitive" } }] } : {}),
      ...(f.minPrice !== undefined || f.maxPrice !== undefined
        ? { pricePaise: { gte: (f.minPrice ?? 0) * 100, lte: f.maxPrice !== undefined ? f.maxPrice * 100 : undefined } }
        : {}),
    },
    include: { recipe: { include: { flower: true } } },
    orderBy: f.sort === "price_asc" ? { pricePaise: "asc" } : f.sort === "price_desc" ? { pricePaise: "desc" } : f.sort === "name" ? { name: "asc" } : { createdAt: "desc" },
  });
  return bouquets
    .map((b) => {
      const availableQty = b.recipe.reduce((min, ri) => (ri.flower.active ? Math.min(min, Math.floor(ri.flower.stockStems / ri.stems)) : 0), Number.MAX_SAFE_INTEGER);
      return {
        id: b.id, slug: b.slug, name: b.name, description: b.description, imageUrl: b.imageUrl,
        pricePaise: b.pricePaise, inStock: availableQty > 0, availableQty,
        composition: b.recipe.map((ri) => ({ flowerId: ri.flowerId, name: ri.flower.name, colorHex: ri.flower.colorHex, stems: ri.stems })),
      };
    })
    .filter((b) => (f.inStock ? b.inStock : true));
}

export async function listPlants(f: CatalogFilters) {
  const plants = await prisma.plant.findMany({
    where: {
      active: true,
      ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { description: { contains: f.q, mode: "insensitive" } }] } : {}),
    },
    include: { variants: { where: { active: true }, orderBy: { pricePaise: "asc" } } },
    orderBy: f.sort === "name" ? { name: "asc" } : { createdAt: "desc" },
  });
  const mapped = plants.map((p) => {
    const prices = p.variants.map((v) => v.pricePaise);
    const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
    return {
      id: p.id, slug: p.slug, name: p.name, description: p.description, imageUrl: p.imageUrl,
      careWatering: p.careWatering, careLight: p.careLight, careNotes: p.careNotes,
      priceFromPaise: prices.length ? Math.min(...prices) : null,
      totalStock, inStock: totalStock > 0,
      variants: p.variants.map((v) => ({ id: v.id, label: v.label, potType: v.potType, size: v.size, pricePaise: v.pricePaise, stock: v.stock, inStock: v.stock > 0 })),
    };
  });
  return mapped.filter((p) => (f.inStock ? p.inStock : true));
}

export type ProductDetail =
  | ({ type: "flower" } & Awaited<ReturnType<typeof listFlowers>>[number])
  | ({ type: "bouquet" } & Awaited<ReturnType<typeof listBouquets>>[number])
  | ({ type: "plant" } & Awaited<ReturnType<typeof listPlants>>[number]);

export async function getProductBySlug(slug: string): Promise<ProductDetail> {  const flower = await prisma.flower.findUnique({ where: { slug } });
  if (flower && flower.active) {
    return { type: "flower", ...flower, inStock: flower.stockStems > 0, unitLabel: "per stem" };
  }
  const bouquet = await prisma.bouquet.findUnique({ where: { slug }, include: { recipe: { include: { flower: true } } } });
  if (bouquet && bouquet.active) {
    const [listed] = (await listBouquets({})).filter((b) => b.slug === slug);
    if (listed) return { type: "bouquet", ...listed };
  }
  const plant = await prisma.plant.findUnique({ where: { slug } });
  if (plant && plant.active) {
    const [listed] = (await listPlants({})).filter((p) => p.slug === slug);
    if (listed) return { type: "plant", ...listed };
  }
  throw notFound("Product not found");
}

export async function getBuilderOptions() {
  const [wrappings, ribbons, extras] = await Promise.all([
    prisma.wrappingOption.findMany({ where: { active: true }, orderBy: { chargePaise: "asc" } }),
    prisma.ribbonOption.findMany({ where: { active: true }, orderBy: { chargePaise: "asc" } }),
    prisma.extraOption.findMany({ where: { active: true }, orderBy: { chargePaise: "asc" } }),
  ]);
  return { wrappings, ribbons, extras };
}

export async function checkServiceability(pincode: string) {
  const row = await prisma.serviceablePincode.findUnique({ where: { pincode } });
  return { pincode, serviceable: Boolean(row?.active), deliveryFeePaise: row?.active ? row.deliveryFeePaise : null, city: row?.city ?? null };
}

export async function getActiveSlots() {
  return prisma.deliverySlot.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, label: true } });
}

/** Flower species tokens used to group sibling varieties for recommendations. */
const FLOWER_FAMILIES = [
  "bird-of-paradise", "alstroemeria", "chrysanthemum", "babys-breath", "eucalyptus",
  "anthurium", "hydrangea", "gladiolus", "delphinium", "sunflower", "tuberose",
  "carnation", "gerbera", "marigold", "lisianthus", "freesia", "daffodil",
  "jasmine", "lavender", "orchid", "dahlia", "peony", "zinnia", "cosmos",
  "gazania", "lily", "iris", "tulip", "rose", "lotus", "aster", "daisy",
];

function flowerFamily(slug: string): string | null {
  const parts = slug.split("-");
  for (const f of FLOWER_FAMILIES) if (parts.includes(f)) return f;
  return null;
}

export type RelatedItem =
  | { type: "flower"; slug: string; name: string; imageUrl: string; pricePerStemPaise: number; inStock: boolean; stockStems: number; subtitle: string; gallery: string[] }
  | { type: "bouquet"; slug: string; name: string; imageUrl: string; pricePaise: number; inStock: boolean; subtitle: string; gallery: string[] }
  | { type: "plant"; slug: string; name: string; imageUrl: string; priceFromPaise: number | null; inStock: boolean; subtitle: string; accent: string; gallery: string[] };

/**
 * Rule-based "You may also like" recommendations:
 *  - flowers → same species family first (in-stock first, then most stocked),
 *    then the store's most-stocked flowers as a popularity fallback;
 *  - bouquets → closest price first (same budget), in-stock first;
 *  - plants  → same light requirement first, then closest price.
 * Deterministic, cheap and explainable — no personal data required.
 */
export async function getRelatedProducts(slug: string, limit = 4): Promise<RelatedItem[]> {
  const product = await getProductBySlug(slug);

  if (product.type === "flower") {
    const self = flowerFamily(slug);
    const all = await prisma.flower.findMany({ where: { active: true, slug: { not: slug } }, orderBy: [{ stockStems: "desc" }, { name: "asc" }] });
    const inStockFirst = <T extends { stockStems: number }>(a: T, b: T) => Number(b.stockStems > 0) - Number(a.stockStems > 0) || b.stockStems - a.stockStems;
    const family = all.filter((f) => self !== null && flowerFamily(f.slug) === self).sort(inStockFirst);
    const rest = all.filter((f) => self === null || flowerFamily(f.slug) !== self).sort(inStockFirst);
    const galleryFor = (f: (typeof all)[number]) =>
      self === null
        ? []
        : all.filter((o) => o.slug !== f.slug && flowerFamily(o.slug) === self).slice(0, 3).map((o) => o.imageUrl);
    return [...family, ...rest].slice(0, limit).map((f) => ({
      type: "flower" as const, slug: f.slug, name: f.name, imageUrl: f.imageUrl,
      pricePerStemPaise: f.pricePerStemPaise, inStock: f.stockStems > 0, stockStems: f.stockStems,
      subtitle: f.description, gallery: galleryFor(f),
    }));
  }

  if (product.type === "bouquet") {
    const all = await listBouquets({});
    const others = all
      .filter((b) => b.slug !== slug)
      .sort((a, b) => Number(b.inStock) - Number(a.inStock) || Math.abs(a.pricePaise - product.pricePaise) - Math.abs(b.pricePaise - product.pricePaise));
    return others.slice(0, limit).map((b) => ({
      type: "bouquet" as const, slug: b.slug, name: b.name, imageUrl: b.imageUrl,
      pricePaise: b.pricePaise, inStock: b.inStock, subtitle: b.description, gallery: [],
    }));
  }

  const all = await listPlants({});
  const others = all.filter((p) => p.slug !== slug);
  const byLight = others
    .filter((p) => p.careLight === product.careLight)
    .sort((a, b) => Number(b.inStock) - Number(a.inStock) || (a.priceFromPaise ?? 0) - (b.priceFromPaise ?? 0));
  const rest = others
    .filter((p) => p.careLight !== product.careLight)
    .sort((a, b) => (a.priceFromPaise ?? 0) - (b.priceFromPaise ?? 0));
  return [...byLight, ...rest].slice(0, limit).map((p) => ({
    type: "plant" as const, slug: p.slug, name: p.name, imageUrl: p.imageUrl,
    priceFromPaise: p.priceFromPaise, inStock: p.inStock, subtitle: p.description,
    accent: `💧 ${p.careWatering}`, gallery: [],
  }));
}
