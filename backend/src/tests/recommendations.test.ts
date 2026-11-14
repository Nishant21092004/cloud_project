/**
 * Rule-based recommendations — "You may also like" on the product page.
 * Same species family first (in-stock first), popularity / price / care-light
 * fallbacks, self always excluded, unknown slug → 404.
 */
import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";
import { agent, closeDb, mkCustomer, resetDb, seedBase } from "./helpers";

beforeEach(async () => { await resetDb(); await seedBase(); });
afterAll(closeDb);

async function seedRelatedCatalogue() {
  const [rosePink, roseWhite, marigold] = await Promise.all([
    prisma.flower.create({ data: { slug: "rose-pink", name: "Pink Rose", description: "Soft pink rose.", colorHex: "#f4c2d7", imageUrl: "/images/products/rose-pink.jpg", pricePerStemPaise: 3200, stockStems: 5 } }),
    prisma.flower.create({ data: { slug: "rose-white", name: "White Rose", description: "Ivory white rose.", colorHex: "#f8f4ea", imageUrl: "/images/products/rose-white.jpg", pricePerStemPaise: 3400, stockStems: 0 } }),
    prisma.flower.create({ data: { slug: "marigold-orange", name: "Orange Marigold", description: "Bright marigold.", colorHex: "#f39c12", imageUrl: "/images/products/marigold-orange.jpg", pricePerStemPaise: 1000, stockStems: 200 } }),
  ]);
  const rose = await prisma.flower.findFirstOrThrow({ where: { slug: "red-rose" } });
  const [cheap, premium] = await Promise.all([
    prisma.bouquet.create({ data: { slug: "rose-duo", name: "Rose Duo", description: "Two dozen roses.", imageUrl: "/images/products/rose-duo.jpg", pricePaise: 49900, recipe: { create: [{ flowerId: rose.id, stems: 12 }] } } }),
    prisma.bouquet.create({ data: { slug: "luxury-mix", name: "Luxury Mix", description: "Premium mix.", imageUrl: "/images/products/luxury-mix.jpg", pricePaise: 149900, recipe: { create: [{ flowerId: rose.id, stems: 12 }] } } }),
  ]);
  await prisma.plant.create({
    data: {
      slug: "pothos", name: "Pothos", description: "Trailing indoor plant.", imageUrl: "/images/products/pothos.jpg",
      careWatering: "Every 5–7 days", careLight: "Indirect light", active: true,
      variants: { create: [{ potType: "Nursery", size: "S", label: "Nursery pot · Small", pricePaise: 19900, stock: 4, active: true }] },
    },
  });
  await prisma.plant.create({
    data: {
      slug: "cactus", name: "Barrel Cactus", description: "Desert cactus.", imageUrl: "/images/products/cactus.jpg",
      careWatering: "Once a month", careLight: "Full sun", active: true,
      variants: { create: [{ potType: "Ceramic", size: "S", label: "Ceramic pot · Small", pricePaise: 24900, stock: 2, active: true }] },
    },
  });
  return { rosePink, roseWhite, marigold, cheap, premium };
}

describe("GET /api/catalog/products/:slug/related", () => {
  it("flowers: same family first (in-stock before out-of-stock), popularity fills the rest, gallery is same-family", async () => {
    const { rosePink, roseWhite, marigold } = await seedRelatedCatalogue();
    const { cookie } = await mkCustomer();
    const res = await agent(cookie).get("/api/catalog/products/red-rose/related");
    expect(res.status).toBe(200);
    const slugs = res.body.related.map((r: { slug: string }) => r.slug);
    expect(slugs).not.toContain("red-rose");
    // family first, in-stock rose-pink ahead of out-of-stock rose-white even with less stock
    expect(slugs.indexOf("rose-pink")).toBeLessThan(slugs.indexOf("rose-white"));
    // popularity fallback (marigold has the most stock)
    expect(slugs).toContain("marigold-orange");
    expect(slugs).toContain("white-lily");
    const pink = res.body.related.find((r: { slug: string }) => r.slug === "rose-pink");
    expect(pink.type).toBe("flower");
    // gallery = up to 3 same-family images (red-rose is the current product, so only rose-white)
    expect(pink.gallery).toEqual(["/images/products/rose-white.jpg"]);
    void rosePink; void roseWhite; void marigold;
  });

  it("bouquets: self excluded, in-stock and closest price first", async () => {
    await seedRelatedCatalogue();
    const { cookie } = await mkCustomer();
    const res = await agent(cookie).get("/api/catalog/products/rose-duo/related");
    expect(res.status).toBe(200);
    const slugs = res.body.related.map((r: { slug: string }) => r.slug);
    expect(slugs).not.toContain("rose-duo");
    expect(slugs[0]).toBe("luxury-mix"); // only other bouquet → closest price
  });

  it("plants: same light requirement first, then others; unknown slug → 404", async () => {
    await seedRelatedCatalogue();
    const { cookie } = await mkCustomer();
    const res = await agent(cookie).get("/api/catalog/products/money-plant/related");
    expect(res.status).toBe(200);
    expect(res.body.related[0].slug).toBe("pothos"); // same "Indirect light"
    expect(res.body.related.map((r: { slug: string }) => r.slug)).toContain("cactus");

    const missing = await agent(cookie).get("/api/catalog/products/no-such-thing/related");
    expect(missing.status).toBe(404);
  });
});
