/**
 * Checkout integration — ordering a plant + custom bouquet together,
 * server-side price revalidation (manipulated totals are rejected),
 * the concurrent last-item race, and idempotent retries.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";
import { ADDRESS, agent, checkoutFlow, closeDb, mkCustomer, resetDb, seedBase } from "./helpers.js";

beforeEach(async () => {
  await resetDb();
  await seedBase();
});
afterAll(closeDb);

describe("ordering a plant and a custom bouquet together", () => {
  it("creates ONE order with both lines, correct math, snapshots, and stock deduction", async () => {
    const { cookie } = await mkCustomer();
    const a = agent(cookie);
    const variant = await prisma.plantVariant.findFirstOrThrow();
    const rose = await prisma.flower.findFirstOrThrow({ where: { slug: "red-rose" } });
    const lily = await prisma.flower.findFirstOrThrow({ where: { slug: "white-lily" } });
    const wrap = await prisma.wrappingOption.findFirstOrThrow();
    const ribbon = await prisma.ribbonOption.findFirstOrThrow();

    // add a plant (qty 1) and a custom bouquet (5 roses + 3 lilies + wrap + ribbon)
    expect((await a.post("/api/cart/items").send({ kind: "PLANT", variantId: variant.id, qty: 1 })).status).toBe(201);
    expect(
      (await a.post("/api/cart/items").send({
        kind: "CUSTOM",
        config: { flowers: [{ flowerId: rose.id, stems: 5 }, { flowerId: lily.id, stems: 3 }], wrappingId: wrap.id, ribbonId: ribbon.id },
      })).status,
    ).toBe(201);

    // subtotal BEFORE the address fee: 299.00 + 5×30 + 3×80 + 50 + 20 = ₹759
    const q = await a.get("/api/orders/quote");
    expect(q.body.quote.subtotalPaise).toBe(29900 + 46000);

    const { res } = await checkoutFlow(a);
    expect(res.status).toBe(201);
    const order = res.body.order;
    expect(order.orderNumber).toMatch(/^BN-\d{6}-[A-Z0-9]{5}$/);
    expect(order.items).toHaveLength(2);
    expect(order.paymentStatus).toBe("COD_PENDING");
    expect(order.totalPaise).toBe(29900 + 46000 + 4000); // + ₹40 Delhi delivery

    const custom = order.items.find((i: { kind: string }) => i.kind === "CUSTOM");
    const plantLine = order.items.find((i: { kind: string }) => i.kind === "PLANT");
    expect(custom.customSnapshot.flowers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Red Rose", stems: 5, pricePerStemPaise: 3000 }),
        expect.objectContaining({ name: "White Lily", stems: 3, pricePerStemPaise: 8000 }),
      ]),
    );
    expect(plantLine.unitPricePaise).toBe(29900);

    // stock deducted exactly once
    expect((await prisma.flower.findUniqueOrThrow({ where: { id: rose.id } })).stockStems).toBe(95);
    expect((await prisma.flower.findUniqueOrThrow({ where: { id: lily.id } })).stockStems).toBe(57);
    expect((await prisma.plantVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(9);

    // cart is emptied (custom bouquet rows removed too)
    const cart = await a.get("/api/cart");
    expect(cart.body.cart.lines).toHaveLength(0);
  });

  it("rejects a custom bouquet that breaks builder rules (min stems)", async () => {
    const { cookie } = await mkCustomer();
    const a = agent(cookie);
    const rose = await prisma.flower.findFirstOrThrow({ where: { slug: "red-rose" } });
    const res = await a.post("/api/cart/items").send({ kind: "CUSTOM", config: { flowers: [{ flowerId: rose.id, stems: 2 }] } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_BOUQUET");
  });
});

describe("server-side price revalidation", () => {
  it("rejects checkout computed against stale prices, then succeeds at the NEW price after confirmation", async () => {
    const { cookie } = await mkCustomer();
    const admin = agent((await mkCustomer("Boss", "ADMIN")).cookie);
    const a = agent(cookie);
    const rose = await prisma.flower.findFirstOrThrow({ where: { slug: "red-rose" } });

    await a.post("/api/cart/items").send({ kind: "CUSTOM", config: { flowers: [{ flowerId: rose.id, stems: 8 }] } });
    const q = await a.get("/api/orders/quote");
    expect(q.body.quote.subtotalPaise).toBe(8 * 3000); // ₹240

    // catalogue price changes AFTER the customer got their quote
    await admin.patch(`/api/admin/flowers/${rose.id}`).send({ pricePerStemPaise: 5000 });

    // replaying the OLD totals is rejected — the client can never dictate prices
    const slot = await prisma.deliverySlot.findFirstOrThrow();
    const staleRes = await a.post("/api/orders").set("Idempotency-Key", "stale_key_1234").send({
      address: ADDRESS, slotId: slot.id, deliveryDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      paymentMethod: "COD", confirmPricing: q.body.quote,
    });
    expect(staleRes.status).toBe(409);
    expect(staleRes.body.error.code).toBe("PRICE_CHANGED");
    expect(staleRes.body.error.details.quote.subtotalPaise).toBe(8 * 5000);

    // confirming the fresh quote succeeds at the new price
    const { res } = await checkoutFlow(a, { idemKey: "stale_key_1234_confirmed" });
    expect(res.status).toBe(201);
    expect(res.body.order.totalPaise).toBe(8 * 5000 + 4000);
    // the line stores its own snapshot at the price actually charged (8 × ₹50)
    expect(res.body.order.items[0].unitPricePaise).toBe(40000);
  });

  it("rejects a lying confirmPricing even with a matching fingerprint", async () => {
    const { cookie } = await mkCustomer();
    const a = agent(cookie);
    const variant = await prisma.plantVariant.findFirstOrThrow();
    await a.post("/api/cart/items").send({ kind: "PLANT", variantId: variant.id, qty: 1 });
    const q = await a.get("/api/orders/quote");
    const slot = await prisma.deliverySlot.findFirstOrThrow();
    const res = await a
      .post("/api/orders")
      .set("Idempotency-Key", "key_lie12345")
      .send({
        address: ADDRESS, slotId: slot.id,
        deliveryDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), paymentMethod: "COD",
        confirmPricing: { fingerprint: q.body.quote.fingerprint, subtotalPaise: 1, deliveryFeePaise: 0 }, // forged total
      });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PRICE_CHANGED");
  });

  it("refuses delivery to unserviceable PIN codes", async () => {
    const { cookie } = await mkCustomer();
    const a = agent(cookie);
    const variant = await prisma.plantVariant.findFirstOrThrow();
    await a.post("/api/cart/items").send({ kind: "PLANT", variantId: variant.id, qty: 1 });
    const q = await a.get("/api/orders/quote");
    const slot = await prisma.deliverySlot.findFirstOrThrow();
    const res = await a
      .post("/api/orders")
      .set("Idempotency-Key", "key_pin99999")
      .send({
        address: { ...ADDRESS, pincode: "999999" }, slotId: slot.id,
        deliveryDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), paymentMethod: "COD", confirmPricing: q.body.quote,
      });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("NOT_SERVICEABLE");
  });
});

describe("concurrent checkout — the last item race", () => {
  it("lets exactly ONE buyer win the last unit; losers get 409 and stock never goes negative", async () => {
    const variant = await prisma.plantVariant.findFirstOrThrow();
    await prisma.plantVariant.update({ where: { id: variant.id }, data: { stock: 1 } });

    const buyers = await Promise.all([mkCustomer("B1"), mkCustomer("B2"), mkCustomer("B3"), mkCustomer("B4")]);

    // every buyer prepares their cart and gets past the pricing gate first
    const armed = [] as Array<{ cookie: string; key: string; quote: { fingerprint: string; subtotalPaise: number; deliveryFeePaise: number } }>;
    for (const [i, { cookie }] of buyers.entries()) {
      const a = agent(cookie);
      const add = await a.post("/api/cart/items").send({ kind: "PLANT", variantId: variant.id, qty: 1 });
      expect(add.status).toBe(201);
      const key = `race_${i}_${Math.random().toString(36).slice(2)}`;
      const q = await a.get("/api/orders/quote");
      const slot = await prisma.deliverySlot.findFirstOrThrow();
      // first POST resolves the delivery fee (PRICE_CHANGED dance)
      const first = await a.post("/api/orders").set("Idempotency-Key", key).send({
        address: ADDRESS, slotId: slot.id, deliveryDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        paymentMethod: "COD", confirmPricing: q.body.quote,
      });
      expect(first.status).toBe(409);
      expect(first.body.error.code).toBe("PRICE_CHANGED");
      armed.push({ cookie, key, quote: first.body.error.details.quote });
    }

    // four checkouts for one unit fire simultaneously — the real race
    const slot = await prisma.deliverySlot.findFirstOrThrow();
    const results = await Promise.all(
      armed.map(({ cookie, key, quote }) =>
        agent(cookie)
          .post("/api/orders")
          .set("Idempotency-Key", key)
          .send({
            address: ADDRESS, slotId: slot.id,
            deliveryDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
            paymentMethod: "COD", confirmPricing: quote,
          })
          .then((r) => r.status),
      ),
    );

    expect(results.filter((s) => s === 201)).toHaveLength(1);
    expect(results.filter((s) => s === 409)).toHaveLength(3);
    expect((await prisma.plantVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(0);
    expect(await prisma.order.count()).toBe(1);
  });
});

describe("idempotent checkout", () => {
  it("replaying the same Idempotency-Key returns the SAME order and deducts stock once", async () => {
    const { cookie } = await mkCustomer();
    const a = agent(cookie);
    const variant = await prisma.plantVariant.findFirstOrThrow();
    await a.post("/api/cart/items").send({ kind: "PLANT", variantId: variant.id, qty: 2 });

    const first = await checkoutFlow(a, { idemKey: "same_key_12345" });
    expect(first.res.status).toBe(201);
    const second = await checkoutFlow(a, { idemKey: "same_key_12345" });
    expect(second.res.status).toBe(200);
    expect(second.res.body.replayed).toBe(true);
    expect(second.res.body.order.id).toBe(first.res.body.order.id);

    expect(await prisma.order.count()).toBe(1);
    expect((await prisma.plantVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(8);
  });
});
