/**
 * Pricing engine — PURE functions, no database access.
 * ─────────────────────────────────────────────────────────────────
 * Every rupee the customer is charged is computed here, server-side,
 * from database values. Client-submitted prices/totals are always
 * ignored. Used by the live bouquet preview, the cart and checkout,
 * so all three can never disagree.
 *
 * All amounts are INTEGER PAISE. (₹1 = 100 paise)
 */
import type { ExtraKind } from "@prisma/client";

// ── builder rules (documented in README; admin-editable stock is the real cap) ──
export const BUILDER_RULES = {
  MIN_TOTAL_STEMS: 6,
  MAX_TOTAL_STEMS: 50,
  MAX_PER_FLOWER: 24,
  MAX_DISTINCT_FLOWERS: 8,
  MAX_MESSAGE_CHARS: 200,
} as const;

// ── input shapes (loaded by services, then passed in) ────────────────
export interface PricedFlower {
  id: string;
  name: string;
  colorHex: string;
  imageUrl: string;
  pricePerStemPaise: number;
  stockStems: number;
  active: boolean;
}

export interface PricedOption {
  id: string;
  name: string;
  chargePaise: number;
  active: boolean;
}

export interface PricedExtra extends PricedOption {
  kind: ExtraKind;
}

export interface CustomConfigInput {
  flowers: Array<{ flower: PricedFlower; stems: number }>;
  wrapping: PricedOption | null;
  ribbon: PricedOption | null;
  extras: PricedExtra[];
  greetingMessage?: string | null;
}

export interface PriceLine {
  label: string;
  detail?: string;
  unitPaise: number;
  qty: number;
  totalPaise: number;
  colorHex?: string;
}

export type PricingResult =
  | { ok: true; lines: PriceLine[]; subtotalPaise: number; totalStems: number }
  | { ok: false; errors: Array<{ code: string; message: string }>; lines: PriceLine[]; subtotalPaise: number; totalStems: number };

/** Validate + price a custom bouquet configuration. */
export function priceCustomBouquet(config: CustomConfigInput): PricingResult {
  const errors: Array<{ code: string; message: string }> = [];
  const lines: PriceLine[] = [];

  const merged = new Map<string, { flower: PricedFlower; stems: number }>();
  for (const line of config.flowers) {
    if (!line.flower.active) errors.push({ code: "INACTIVE_FLOWER", message: `“${line.flower.name}” is currently unavailable` });
    if (!Number.isInteger(line.stems) || line.stems < 1) errors.push({ code: "INVALID_QTY", message: `Choose at least 1 stem of ${line.flower.name}` });
    else if (line.stems > BUILDER_RULES.MAX_PER_FLOWER)
      errors.push({ code: "MAX_PER_FLOWER", message: `At most ${BUILDER_RULES.MAX_PER_FLOWER} stems of ${line.flower.name}` });
    const prev = merged.get(line.flower.id);
    merged.set(line.flower.id, { flower: line.flower, stems: (prev?.stems ?? 0) + Math.max(0, line.stems) });
  }
  if (merged.size === 0) errors.push({ code: "EMPTY_BOUQUET", message: "Add at least one flower to your bouquet" });
  if (merged.size > BUILDER_RULES.MAX_DISTINCT_FLOWERS)
    errors.push({ code: "TOO_MANY_VARIETIES", message: `Choose up to ${BUILDER_RULES.MAX_DISTINCT_FLOWERS} flower varieties` });

  const totalStems = [...merged.values()].reduce((s, f) => s + f.stems, 0);
  if (merged.size > 0 && totalStems < BUILDER_RULES.MIN_TOTAL_STEMS)
    errors.push({ code: "MIN_STEMS", message: `A bouquet needs at least ${BUILDER_RULES.MIN_TOTAL_STEMS} stems — currently ${totalStems}` });
  if (totalStems > BUILDER_RULES.MAX_TOTAL_STEMS)
    errors.push({ code: "MAX_STEMS", message: `A bouquet can hold at most ${BUILDER_RULES.MAX_TOTAL_STEMS} stems — currently ${totalStems}` });

  let flowersPaise = 0;
  for (const { flower, stems } of merged.values()) {
    const lineTotal = flower.pricePerStemPaise * stems;
    flowersPaise += lineTotal;
    lines.push({
      label: flower.name,
      detail: `${stems} stem${stems > 1 ? "s" : ""} × ₹${(flower.pricePerStemPaise / 100).toFixed(2)}`,
      unitPaise: flower.pricePerStemPaise,
      qty: stems,
      totalPaise: lineTotal,
      colorHex: flower.colorHex,
    });
  }

  const hasCard = config.extras.some((e) => e.kind === "CARD");
  const message = (config.greetingMessage ?? "").trim();
  if (message.length > BUILDER_RULES.MAX_MESSAGE_CHARS)
    errors.push({ code: "MESSAGE_TOO_LONG", message: `Greeting message must be ≤ ${BUILDER_RULES.MAX_MESSAGE_CHARS} characters` });
  if (message.length > 0 && !hasCard)
    errors.push({ code: "MESSAGE_WITHOUT_CARD", message: "Add a greeting card to include a message" });

  if (config.wrapping) {
    if (!config.wrapping.active) errors.push({ code: "INACTIVE_OPTION", message: `“${config.wrapping.name}” wrapping is unavailable` });
    else {
      lines.push({ label: `Wrapping — ${config.wrapping.name}`, unitPaise: config.wrapping.chargePaise, qty: 1, totalPaise: config.wrapping.chargePaise });
    }
  }
  if (config.ribbon) {
    if (!config.ribbon.active) errors.push({ code: "INACTIVE_OPTION", message: `“${config.ribbon.name}” ribbon is unavailable` });
    else {
      lines.push({ label: `Ribbon — ${config.ribbon.name}`, unitPaise: config.ribbon.chargePaise, qty: 1, totalPaise: config.ribbon.chargePaise });
    }
  }
  for (const extra of config.extras) {
    if (!extra.active) errors.push({ code: "INACTIVE_OPTION", message: `“${extra.name}” is unavailable` });
    else lines.push({ label: extra.name, unitPaise: extra.chargePaise, qty: 1, totalPaise: extra.chargePaise });
  }
  if (message && hasCard) {
    lines.push({ label: "Greeting message", detail: message, unitPaise: 0, qty: 1, totalPaise: 0 });
  }

  const subtotalPaise = lines.reduce((s, l) => s + l.totalPaise, 0);
  if (errors.length > 0) return { ok: false, errors, lines, subtotalPaise, totalStems };
  return { ok: true, lines, subtotalPaise, totalStems };
}

/** Stock units a cart line requires. Returns null when the line is invalid. */
export interface StockRequirement {
  flowers: Record<string, number>; // flowerId → stems needed
  plantVariants: Record<string, number>; // variantId → units needed
}

/** Snapshot used to reproduce an order line for admin display & stock restore. */
export interface CustomSnapshot {
  flowers: Array<{ flowerId: string; name: string; colorHex: string; pricePerStemPaise: number; stems: number }>;
  wrapping: { name: string; chargePaise: number } | null;
  ribbon: { name: string; chargePaise: number } | null;
  extras: Array<{ name: string; chargePaise: number }>;
  greetingMessage: string | null;
  subtotalPaise: number;
}
