/**
 * Catalogue data integrity — no database needed.
 *
 * These are the checks that a hand-written-but-large seed file always needs:
 * enough products, no duplicate slugs, bouquet recipes that resolve to real
 * flower names, prices that are not nonsense, and at least a few sold-out
 * rows so the "Out of stock" UI is exercised by the demo data itself.
 */
import { describe, expect, it } from "vitest";
import { flowerRecords, FLOWER_FAMILIES, slugify } from "../../prisma/data/flowers";
import { plantRecords, PLANT_GROUPS } from "../../prisma/data/plants";
import { BOUQUETS } from "../../prisma/data/bouquets";

const flowers = flowerRecords();
const plants = plantRecords();

describe("flower catalogue", () => {
  it("lists at least 100 distinct flower varieties", () => {
    expect(flowers.length).toBeGreaterThanOrEqual(100);
    expect(FLOWER_FAMILIES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(flowers.map((f) => f.slug)).size).toBe(flowers.length);
    expect(new Set(flowers.map((f) => f.name)).size).toBe(flowers.length);
  });

  it("gives every flower a price, a colour, stock figures and a photo query", () => {
    for (const f of flowers) {
      expect(f.pricePerStemPaise).toBeGreaterThan(0);
      expect(f.pricePerStemPaise % 100).toBe(0); // whole rupees
      expect(f.pricePerStemPaise).toBeLessThan(100_000); // ₹1 000/stem is the sane ceiling
      expect(f.stockStems).toBeGreaterThanOrEqual(0);
      expect(f.colorHex).toMatch(/^#[0-9a-f]{6}$/);
      expect(f.description.length).toBeGreaterThan(40);
      expect(f.photoTerms.length).toBeGreaterThan(2);
      expect(f.slug).toBe(slugify(f.name));
    }
  });

  it("keeps some varieties deliberately out of stock (the UI must have data to show)", () => {
    const soldOut = flowers.filter((f) => f.stockStems === 0);
    expect(soldOut.length).toBeGreaterThanOrEqual(5);
  });

  it("writes search aliases into the description so Hindi names match", () => {
    const marigold = flowers.find((f) => /genda/i.test(f.name) || /marigold/i.test(f.name));
    expect(marigold?.description).toMatch(/genda/i);
    const rose = flowers.find((f) => /rose/i.test(f.name));
    expect(rose?.description).toMatch(/gulab/i);
  });
});

describe("plant catalogue", () => {
  it("lists at least 100 distinct plants across the nursery groups", () => {
    expect(plants.length).toBeGreaterThanOrEqual(100);
    expect(PLANT_GROUPS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(plants.map((p) => p.slug)).size).toBe(plants.length);
  });

  it("gives every plant purchasable variants with their own price and stock", () => {
    for (const p of plants) {
      expect(p.variants.length).toBeGreaterThanOrEqual(1);
      for (const v of p.variants) {
        expect(v.pricePaise).toBeGreaterThan(0);
        expect(v.label.length).toBeGreaterThan(3);
        expect(v.stock).toBeGreaterThanOrEqual(0);
      }
      expect(p.careWatering.length).toBeGreaterThan(5);
      expect(p.careLight.length).toBeGreaterThan(5);
    }
  });
});

describe("bouquet recipes", () => {
  it("only reference flowers that actually exist in the catalogue", () => {
    const names = new Set(flowers.map((f) => f.name));
    const dangling: string[] = [];
    for (const b of BOUQUETS) {
      for (const name of Object.keys(b.recipe)) {
        if (!names.has(name)) dangling.push(`${b.slug} → ${name}`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it("costs more than the sum of its stems (a bouquet is sold on arranging, not loss)", () => {
    const byName = new Map(flowers.map((f) => [f.name, f.pricePerStemPaise]));
    for (const b of BOUQUETS) {
      const stems = Object.entries(b.recipe).reduce((sum, [name, qty]) => sum + (byName.get(name) ?? 0) * qty, 0);
      const retail = Math.max(99, Math.floor(((stems / 100) * b.margin + b.packingRupees) / 50) * 50 - 1) * 100;
      expect(retail, b.slug).toBeGreaterThan(stems);
      expect(Object.keys(b.recipe).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("has unique slugs and descriptions long enough to render", () => {
    expect(new Set(BOUQUETS.map((b) => b.slug)).size).toBe(BOUQUETS.length);
    for (const b of BOUQUETS) {
      expect(b.description.length).toBeGreaterThan(50);
      expect(b.margin).toBeGreaterThanOrEqual(1.1);
      expect(b.packingRupees).toBeGreaterThanOrEqual(0);
    }
  });
});
