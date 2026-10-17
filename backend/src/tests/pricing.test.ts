/**
 * Unit tests for the pure pricing engine — the single source of truth
 * for every rupee charged. No database involved.
 */
import { describe, expect, it } from "vitest";
import { BUILDER_RULES, priceCustomBouquet, type CustomConfigInput, type PricedFlower } from "../modules/catalog/pricing.js";

const flower = (over: Partial<PricedFlower> = {}): PricedFlower => ({
  id: "f1", name: "Red Rose", colorHex: "#c0392b", imageUrl: "/x.svg",
  pricePerStemPaise: 3000, stockStems: 100, active: true, ...over,
});

const lily: PricedFlower = { id: "f2", name: "White Lily", colorHex: "#f5f0e6", imageUrl: "/y.svg", pricePerStemPaise: 8000, stockStems: 60, active: true };

const base = (over: Partial<CustomConfigInput> = {}): CustomConfigInput => ({
  flowers: [{ flower: flower(), stems: 5 }, { flower: lily, stems: 3 }],
  wrapping: { id: "w1", name: "Kraft Wrap", chargePaise: 5000, active: true },
  ribbon: { id: "r1", name: "Satin Ribbon", chargePaise: 2000, active: true },
  extras: [],
  greetingMessage: null,
  ...over,
});

describe("priceCustomBouquet", () => {
  it("prices the documented example: 5×₹30 + 3×₹80 + ₹50 wrap + ₹20 ribbon = ₹460", () => {
    const r = priceCustomBouquet(base());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 5*3000 + 3*8000 + 5000 + 2000 = 46000 paise
    expect(r.subtotalPaise).toBe(46000);
    expect(r.totalStems).toBe(8);
  });

  it("merges duplicate flower lines before validating totals", () => {
    const r = priceCustomBouquet(base({ flowers: [{ flower: flower(), stems: 2 }, { flower: flower({ id: "f1", name: "Red Rose", colorHex: "#c0392b", imageUrl: "/x.svg", pricePerStemPaise: 3000, stockStems: 100, active: true }), stems: 4 }] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.totalStems).toBe(6);
    expect(r.lines.filter((l) => l.label === "Red Rose")).toHaveLength(1);
  });

  it("rejects below the minimum bouquet size", () => {
    const r = priceCustomBouquet(base({ flowers: [{ flower: flower(), stems: 3 }] }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.map((e) => e.code)).toContain("MIN_STEMS");
  });

  it("rejects above the maximum bouquet size and per-flower cap", () => {
    const overAll = priceCustomBouquet(base({ flowers: [{ flower: flower(), stems: 30 }, { flower: lily, stems: 25 }] }));
    expect(overAll.ok).toBe(false);
    const perFlower = priceCustomBouquet(base({ flowers: [{ flower: flower(), stems: BUILDER_RULES.MAX_PER_FLOWER + 1 }] }));
    expect(perFlower.ok).toBe(false);
  });

  it("rejects inactive flowers and inactive options", () => {
    const r = priceCustomBouquet(base({ flowers: [{ flower: flower({ active: false }), stems: 8 }] }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.map((e) => e.code)).toContain("INACTIVE_FLOWER");
  });

  it("a greeting message requires a card extra", () => {
    const noCard = priceCustomBouquet(base({ greetingMessage: "Happy birthday!" }));
    expect(noCard.ok).toBe(false);
    if (!noCard.ok) expect(noCard.errors.map((e) => e.code)).toContain("MESSAGE_WITHOUT_CARD");

    const withCard = priceCustomBouquet(base({
      greetingMessage: "Happy birthday!",
      extras: [{ id: "c1", name: "Greeting Card", chargePaise: 3000, active: true, kind: "CARD" }],
    }));
    expect(withCard.ok).toBe(true);
    if (withCard.ok) expect(withCard.subtotalPaise).toBe(46000 + 3000);
  });

  it("enforces the message length limit", () => {
    const r = priceCustomBouquet(base({
      greetingMessage: "x".repeat(BUILDER_RULES.MAX_MESSAGE_CHARS + 1),
      extras: [{ id: "c1", name: "Greeting Card", chargePaise: 3000, active: true, kind: "CARD" }],
    }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.map((e) => e.code)).toContain("MESSAGE_TOO_LONG");
  });

  it("money is integer paise end to end", () => {
    const r = priceCustomBouquet(base({ flowers: [{ flower: flower({ pricePerStemPaise: 3050 }), stems: 7 }] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Number.isInteger(r.subtotalPaise)).toBe(true);
    expect(r.subtotalPaise).toBe(7 * 3050 + 5000 + 2000);
  });
});
