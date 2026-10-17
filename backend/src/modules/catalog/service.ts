/**
 * Catalogue service — storefront reads with search / filters / sorting,
 * bouquet availability derived from recipes, plant variants, delivery
 * configuration (serviceable PIN codes, slots) and builder options.
 */
import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../lib/errors.js";
import { estimateDemoDelivery } from "./delivery.js";

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

export async function getProductBySlug(slug: string): Promise<ProductDetail> {
  const flower = await prisma.flower.findUnique({ where: { slug } });
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
  if (row) return { pincode, serviceable: row.active, deliveryFeePaise: row.active ? row.deliveryFeePaise : null, city: row.city, demoCoverage: false };
  const demoFee = estimateDemoDelivery(pincode);
  return { pincode, serviceable: demoFee !== null, deliveryFeePaise: demoFee, city: demoFee === null ? null : "India-wide (demo estimate)", demoCoverage: demoFee !== null };
}

export async function getActiveSlots() {
  return prisma.deliverySlot.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, label: true } });
}
