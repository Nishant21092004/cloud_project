/**
 * Cart service — loads a user's cart, re-prices EVERY line server-side on
 * every read, verifies availability, and produces the checkout fingerprint.
 * The cart never stores prices — only structure. Prices are always derived
 * from the live catalogue, so catalogue edits are instantly reflected.
 */
import type { CartItem, CartItemKind } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { fingerprint } from "../../lib/ids.js";
import { priceCustomBouquet, type CustomSnapshot, type PricedExtra, type PricedFlower, type PricedOption, type StockRequirement } from "../catalog/pricing.js";

export interface PricedCartLine {
  itemId: string;
  kind: CartItemKind;
  title: string;
  subtitle: string | null;
  image: string | null;
  colorHex: string | null;
  qty: number; // stems for FLOWER, units otherwise
  unitPaise: number; // per stem / per unit / bouquet total
  lineTotalPaise: number;
  // edit handles
  flowerId: string | null;
  plantVariantId: string | null;
  bouquetId: string | null;
  customBouquetId: string | null;
  config: CustomSnapshot | null; // CUSTOM lines: itemised snapshot for editing
  maxQty: number; // max purchasable right now (for the UI stepper)
  issues: string[]; // e.g. "Only 3 stems of Pink Rose left"
}

export interface PricedCart {
  cartId: string;
  lines: PricedCartLine[];
  subtotalPaise: number;
  hasIssues: boolean;
  fingerprint: string;
  itemCount: number;
}

const includeForCart = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      flower: true,
      bouquet: { include: { recipe: { include: { flower: true } } } },
      plantVariant: { include: { plant: true } },
      customBouquet: { include: { wrapping: true, ribbon: true, extras: { include: { extra: true } }, flowers: { include: { flower: true } } } },
    },
  },
};

export async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({ where: { userId }, create: { userId }, update: {} });
}

export async function loadPricedCart(userId: string): Promise<PricedCart> {
  const cart = await getOrCreateCart(userId);
  const full = await prisma.cart.findUniqueOrThrow({ where: { id: cart.id }, include: includeForCart });

  const lines: PricedCartLine[] = [];
  const stock: StockRequirement = { flowers: {}, plantVariants: {} };

  for (const item of full.items) {
    const line = await priceLine(item, stock);
    if (line) lines.push(line);
  }

  const subtotalPaise = lines.reduce((s, l) => s + l.lineTotalPaise, 0);
  const hasIssues = lines.some((l) => l.issues.length > 0);

  // fingerprint over structure + computed prices → price/stock changes are detected at checkout
  const fp = fingerprint(
    lines.map((l) => ({
      id: l.itemId,
      k: l.kind,
      f: l.flowerId,
      v: l.plantVariantId,
      b: l.bouquetId,
      c: l.customBouquetId,
      q: l.qty,
      u: l.unitPaise,
      t: l.lineTotalPaise,
      i: l.issues,
    })),
  );

  return { cartId: cart.id, lines, subtotalPaise, hasIssues, fingerprint: fp, itemCount: lines.length };
}

async function priceLine(item: CartItem & Record<string, unknown>, stock: StockRequirement): Promise<PricedCartLine | null> {
  const issues: string[] = [];

  if (item.kind === "FLOWER") {
    const f = item.flower as PricedFlower | null;
    if (!f || !item.stems) return null;
    const stems = item.stems;
    if (!f.active) issues.push(`${f.name} is currently unavailable`);
    else if (f.stockStems < stems) issues.push(`Only ${f.stockStems} stem${f.stockStems === 1 ? "" : "s"} of ${f.name} left`);
    else stock.flowers[f.id] = (stock.flowers[f.id] ?? 0) + stems;
    return {
      itemId: item.id, kind: "FLOWER", title: f.name, subtitle: `${stems} loose stem${stems > 1 ? "s" : ""}`,
      image: f.imageUrl, colorHex: f.colorHex, qty: stems, unitPaise: f.pricePerStemPaise, lineTotalPaise: f.pricePerStemPaise * stems,
      flowerId: f.id, plantVariantId: null, bouquetId: null, customBouquetId: null, config: null,
      maxQty: f.stockStems, issues,
    };
  }

  if (item.kind === "BOUQUET") {
    const b = item.bouquet as
      | { id: string; slug: string; name: string; imageUrl: string; pricePaise: number; active: boolean; recipe: Array<{ flowerId: string; stems: number; flower: PricedFlower }> }
      | null;
    if (!b) return null;
    const qty = item.qty;
    let available = Number.MAX_SAFE_INTEGER;
    for (const ri of b.recipe) {
      if (!ri.flower.active) { available = 0; continue; }
      available = Math.min(available, Math.floor(ri.flower.stockStems / ri.stems));
      stock.flowers[ri.flowerId] = (stock.flowers[ri.flowerId] ?? 0) + ri.stems * qty;
    }
    if (!b.active) issues.push(`${b.name} is currently unavailable`);
    else if (available < qty) issues.push(`Only ${available === Number.MAX_SAFE_INTEGER ? 0 : available} left in stock`);
    const composition = b.recipe.map((ri) => `${ri.stems} × ${ri.flower.name}`).join(", ");
    return {
      itemId: item.id, kind: "BOUQUET", title: b.name, subtitle: composition,
      image: b.imageUrl, colorHex: null, qty, unitPaise: b.pricePaise, lineTotalPaise: b.pricePaise * qty,
      flowerId: null, plantVariantId: null, bouquetId: b.id, customBouquetId: null, config: null,
      maxQty: available === Number.MAX_SAFE_INTEGER ? 0 : available, issues,
    };
  }

  if (item.kind === "PLANT") {
    const v = item.plantVariant as
      | { id: string; label: string; pricePaise: number; stock: number; active: boolean; plant: { name: string; imageUrl: string; slug: string; active: boolean } }
      | null;
    if (!v) return null;
    const qty = item.qty;
    const max = v.active && v.plant.active ? v.stock : 0;
    if (!v.active || !v.plant.active) issues.push(`${v.plant.name} is currently unavailable`);
    else if (v.stock < qty) issues.push(`Only ${v.stock} left in stock`);
    else stock.plantVariants[v.id] = (stock.plantVariants[v.id] ?? 0) + qty;
    return {
      itemId: item.id, kind: "PLANT", title: v.plant.name, subtitle: v.label,
      image: v.plant.imageUrl, colorHex: null, qty, unitPaise: v.pricePaise, lineTotalPaise: v.pricePaise * qty,
      flowerId: null, plantVariantId: v.id, bouquetId: null, customBouquetId: null, config: null,
      maxQty: max, issues,
    };
  }

  // CUSTOM bouquet
  const cb = item.customBouquet as
    | {
        id: string;
        wrapping: PricedOption | null;
        ribbon: PricedOption | null;
        greetingMessage: string | null;
        extras: Array<{ extra: PricedExtra }>;
        flowers: Array<{ flowerId: string; stems: number; flower: PricedFlower }>;
      }
    | null;
  if (!cb) return null;
  const config: Parameters<typeof priceCustomBouquet>[0] = {
    flowers: cb.flowers.map((cf) => ({ flower: cf.flower, stems: cf.stems })),
    wrapping: cb.wrapping,
    ribbon: cb.ribbon,
    extras: cb.extras.map((ce) => ce.extra),
    greetingMessage: cb.greetingMessage,
  };
  const priced = priceCustomBouquet(config);
  if (!priced.ok) issues.push(...priced.errors.map((e) => e.message));
  if (priced.ok) {
    for (const fl of cb.flowers) {
      if (fl.flower.active && fl.flower.stockStems < fl.stems) issues.push(`Only ${fl.flower.stockStems} stems of ${fl.flower.name} left`);
      else if (fl.flower.active) stock.flowers[fl.flowerId] = (stock.flowers[fl.flowerId] ?? 0) + fl.stems;
    }
  }
  const snapshot = customSnapshotOf(config, priced.subtotalPaise);
  const summary = cb.flowers.map((cf) => `${cf.stems} × ${cf.flower.name}`).join(", ");
  return {
    itemId: item.id, kind: "CUSTOM", title: "Custom Bouquet", subtitle: summary,
    image: cb.flowers[0]?.flower.imageUrl ?? null, colorHex: null,
    qty: 1, unitPaise: priced.subtotalPaise, lineTotalPaise: priced.subtotalPaise,
    flowerId: null, plantVariantId: null, bouquetId: null, customBouquetId: cb.id,
    config: snapshot, maxQty: 1, issues,
  };
}

export function customSnapshotOf(config: Parameters<typeof priceCustomBouquet>[0], subtotalPaise: number): CustomSnapshot {
  return {
    flowers: config.flowers.map((f) => ({
      flowerId: f.flower.id, name: f.flower.name, colorHex: f.flower.colorHex,
      pricePerStemPaise: f.flower.pricePerStemPaise, stems: f.stems,
    })),
    wrapping: config.wrapping ? { name: config.wrapping.name, chargePaise: config.wrapping.chargePaise } : null,
    ribbon: config.ribbon ? { name: config.ribbon.name, chargePaise: config.ribbon.chargePaise } : null,
    extras: config.extras.map((e) => ({ name: e.name, chargePaise: e.chargePaise })),
    greetingMessage: (config.greetingMessage ?? "").trim() || null,
    subtotalPaise,
  };
}

/** Validates a custom config against live data (used by builder preview & cart writes). */
export async function loadConfigFromInput(input: {
  flowers: Array<{ flowerId: string; stems: number }>;
  wrappingId?: string | null;
  ribbonId?: string | null;
  extraIds?: string[];
  greetingMessage?: string | null;
}) {
  const ids = input.flowers.map((f) => f.flowerId);
  const flowers = await prisma.flower.findMany({ where: { id: { in: ids } } });
  const flowerMap = new Map(flowers.map((f) => [f.id, f]));
  const lines = input.flowers.map((f) => {
    const flower = flowerMap.get(f.flowerId);
    if (!flower) throw Object.assign(new Error("Unknown flower in configuration"), { status: 400 });
    return { flower, stems: f.stems };
  });
  const wrapping = input.wrappingId ? await prisma.wrappingOption.findUnique({ where: { id: input.wrappingId } }) : null;
  const ribbon = input.ribbonId ? await prisma.ribbonOption.findUnique({ where: { id: input.ribbonId } }) : null;
  const extras = input.extraIds?.length ? await prisma.extraOption.findMany({ where: { id: { in: input.extraIds } } }) : [];
  return { flowers: lines, wrapping, ribbon, extras, greetingMessage: input.greetingMessage ?? null };
}
