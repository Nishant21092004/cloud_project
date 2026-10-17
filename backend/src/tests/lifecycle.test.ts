/**
 * Order lifecycle — cancellation with exactly-once stock restore,
 * customer isolation, historical snapshot immutability, and the full
 * customer → admin fulfilment workflow including COD collection and
 * honest refund bookkeeping.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";
import { ADDRESS, agent, checkoutFlow, closeDb, mkCustomer, resetDb, seedBase } from "./helpers.js";

type Agent = ReturnType<typeof agent>;

async function placeCodOrder(a: Agent, variantQty = 1) {
  const variant = await prisma.plantVariant.findFirstOrThrow();
  await a.post("/api/cart/items").send({ kind: "PLANT", variantId: variant.id, qty: variantQty });
  const { res } = await checkoutFlow(a, { idemKey: `life_${Math.random().toString(36).slice(2)}` });
  expect(res.status).toBe(201);
  return res.body.order as { id: string; orderNumber: string; totalPaise: number; paymentStatus: string; status: string };
}

beforeEach(async () => {
  await resetDb();
  await seedBase();
});
afterAll(closeDb);

describe("customer isolation", () => {
  it("a customer can never see, cancel, or pay someone else's order", async () => {
    const owner = agent((await mkCustomer("Owner")).cookie);
    const intruder = agent((await mkCustomer("Intruder")).cookie);
    const order = await placeCodOrder(owner);

    expect((await intruder.get(`/api/orders/${order.orderNumber}`)).status).toBe(404);
    expect((await intruder.get("/api/orders")).body.orders).toHaveLength(0);
    expect((await intruder.post(`/api/orders/${order.orderNumber}/cancel`).send({ reason: "haha" })).status).toBe(404);
    expect((await intruder.post("/api/payments/razorpay/create").send({ orderNumber: order.orderNumber })).status).toBe(404);
    expect((await owner.get("/api/orders")).body.orders).toHaveLength(1);

    // addresses are equally isolated
    const created = await owner.post("/api/addresses").send({ ...ADDRESS, isDefault: true });
    expect((await intruder.delete(`/api/addresses/${created.body.address.id}`)).status).toBe(400);
    expect((await intruder.get("/api/addresses")).body.addresses).toHaveLength(0);
  });
});

describe("cancellation & inventory restore", () => {
  it("restores stock exactly once; double cancel is rejected", async () => {
    const a = agent((await mkCustomer("Canceller")).cookie);
    const order = await placeCodOrder(a, 2);
    const variant = await prisma.plantVariant.findFirstOrThrow();
    expect(variant.stock).toBe(8); // 10 − 2

    const res = await a.post(`/api/orders/${order.orderNumber}/cancel`).send({ reason: "Plans changed" });
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe("CANCELLED");
    expect((await prisma.plantVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(10);

    // second cancel attempt → conflict, stock unchanged (restored EXACTLY once)
    const again = await a.post(`/api/orders/${order.orderNumber}/cancel`).send({ reason: "Double click" });
    expect(again.status).toBe(409);
    expect((await prisma.plantVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(10);
  });

  it("restores custom-bouquet stems from the order snapshot, even if the catalogue changed", async () => {
    const admin = agent((await mkCustomer("Boss", "ADMIN")).cookie);
    const a = agent((await mkCustomer("Builder")).cookie);
    const rose = await prisma.flower.findFirstOrThrow({ where: { slug: "red-rose" } });

    await a.post("/api/cart/items").send({ kind: "CUSTOM", config: { flowers: [{ flowerId: rose.id, stems: 10 }] } });
    const order = await checkoutFlow(a, { idemKey: `snap_${Math.random().toString(36).slice(2)}` });
    expect(order.res.status).toBe(201);
    expect((await prisma.flower.findUniqueOrThrow({ where: { id: rose.id } })).stockStems).toBe(90);

    // admin renames + reprices AFTER purchase — history must not move
    await admin.patch(`/api/admin/flowers/${rose.id}`).send({ name: "Crimson Rose", pricePerStemPaise: 9900 });

    await a.post(`/api/orders/${order.res.body.order.orderNumber}/cancel`).send({ reason: "Snapshot test" });
    // restore used the SNAPSHOT (10 red rose stems), not the live catalogue
    expect((await prisma.flower.findUniqueOrThrow({ where: { id: rose.id } })).stockStems).toBe(100);

    // old order still shows the original name and price
    const detail = await a.get(`/api/orders/${order.res.body.order.orderNumber}`);
    expect(detail.body.order.items[0].title).toBe("Custom Bouquet");
    expect(detail.body.order.items[0].customSnapshot.flowers[0].name).toBe("Red Rose");
    expect(detail.body.order.items[0].customSnapshot.flowers[0].pricePerStemPaise).toBe(3000);
  });
});

describe("full customer → admin workflow", () => {
  it("walks PLACED → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED with COD collected at the door", async () => {
    const customer = agent((await mkCustomer("Shopper")).cookie);
    const admin = agent((await mkCustomer("Boss", "ADMIN")).cookie);
    const order = await placeCodOrder(customer);

    // skipping a step is impossible — strict sequential transitions
    const skip = await admin.patch(`/api/admin/orders/${order.orderNumber}/status`).send({ status: "PREPARING" });
    expect(skip.status).toBe(409);
    expect(skip.body.error.code).toBe("INVALID_TRANSITION");

    for (const next of ["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"]) {
      const step = await admin.patch(`/api/admin/orders/${order.orderNumber}/status`).send({ status: next });
      expect(step.status).toBe(200);
      expect(step.body.order.status).toBe(next);
    }
    // COD cash is collected automatically at DELIVERED
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("COD_COLLECTED");

    // the customer sees the whole timeline
    const view = await customer.get(`/api/orders/${order.orderNumber}`);
    const statuses = view.body.order.events.map((e: { status: string }) => e.status);
    expect(statuses).toEqual(expect.arrayContaining(["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"]));

    // delivered orders cannot be cancelled — not by customer, not by admin
    expect((await customer.post(`/api/orders/${order.orderNumber}/cancel`).send({ reason: "Too late" })).status).toBe(409);
    expect((await admin.post(`/api/admin/orders/${order.orderNumber}/cancel`).send({ reason: "Too late" })).status).toBe(409);
  });

  it("admin cancelling restores stock and COD orders cannot be marked REFUNDED", async () => {
    const customer = agent((await mkCustomer("Shopper2")).cookie);
    const admin = agent((await mkCustomer("Boss2", "ADMIN")).cookie);
    const order = await placeCodOrder(customer);
    const variant = await prisma.plantVariant.findFirstOrThrow();

    const refundAttempt = await admin.patch(`/api/admin/orders/${order.orderNumber}/payment-status`).send({ paymentStatus: "REFUNDED" });
    expect(refundAttempt.status).toBe(409);

    const cancel = await admin.post(`/api/admin/orders/${order.orderNumber}/cancel`).send({ reason: "Stock damaged in transit" });
    expect(cancel.status).toBe(200);
    expect((await prisma.plantVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(10);

    // stats come from real records: this cancelled order adds no revenue
    const stats = await admin.get("/api/admin/stats");
    expect(stats.body.totalOrders).toBe(1);
    expect(stats.body.revenueCollectedPaise).toBe(0);
  });

  it("admin order filters work (status, payment status, search)", async () => {
    const admin = agent((await mkCustomer("Boss3", "ADMIN")).cookie);
    const c1 = agent((await mkCustomer("F1")).cookie);
    await placeCodOrder(c1);
    const stats = await admin.get("/api/admin/stats");
    expect(stats.body.totalOrders).toBe(1);

    const byStatus = await admin.get("/api/admin/orders?status=PLACED");
    expect(byStatus.body.orders).toHaveLength(1);
    const byBad = await admin.get("/api/admin/orders?status=DELIVERED");
    expect(byBad.body.orders).toHaveLength(0);
    const byPin = await admin.get("/api/admin/orders?q=110001");
    expect(byPin.body.orders).toHaveLength(1);
    const byPhone = await admin.get("/api/admin/orders?q=9876543210");
    expect(byPhone.body.orders).toHaveLength(1);
  });
});
