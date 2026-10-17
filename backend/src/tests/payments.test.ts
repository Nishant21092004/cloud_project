/**
 * Payment integration — the Razorpay SDK is mocked so no real gateway or
 * credentials are needed. What IS real: signature checks (see signatures.test.ts
 * for the live HMAC), idempotent transitions, webhooks, expiry and late payments.
 */
import { createHmac } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { prisma } from "../lib/prisma.js";
import { sweepExpiredOrders, cancelOrder } from "../modules/orders/service.js";
import { handleWebhook } from "../modules/payments/router.js";
import { ADDRESS, agent, app, checkoutFlow, closeDb, mkCustomer, resetDb, seedBase, tomorrow } from "./helpers.js";

vi.mock("../modules/payments/razorpay.js", () => ({
  getRazorpay: vi.fn(() => ({})),
  createPaymentOrder: vi.fn(async (amount: number, receipt: string) => ({ id: `order_test_${receipt}`, amount, currency: "INR", status: "created" })),
  fetchProviderPayment: vi.fn(async () => null),
  verifyCheckoutSignature: vi.fn(() => false),
  verifyWebhookSignature: vi.fn(() => false),
}));

// eslint-disable-next-line import/first
import { createPaymentOrder, fetchProviderPayment, verifyCheckoutSignature, verifyWebhookSignature } from "../modules/payments/razorpay.js";
const mockCreate = vi.mocked(createPaymentOrder);
const mockFetch = vi.mocked(fetchProviderPayment);
const mockCheckoutSig = vi.mocked(verifyCheckoutSignature);
const mockWebhookSig = vi.mocked(verifyWebhookSignature);

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "test_webhook_secret";

async function mkPaidFlowOptions() {
  const { cookie } = await mkCustomer("Payer");
  const a = agent(cookie);
  const variant = await prisma.plantVariant.findFirstOrThrow();
  await a.post("/api/cart/items").send({ kind: "PLANT", variantId: variant.id, qty: 1 });
  const { res } = await checkoutFlow(a, { paymentMethod: "RAZORPAY", idemKey: `pay_${Math.random().toString(36).slice(2)}` });
  expect(res.status).toBe(201);
  return { a, order: res.body.order as { id: string; orderNumber: string; totalPaise: number } };
}

function realWebhookSig(body: string) {
  return createHmac("sha256", WEBHOOK_SECRET).update(Buffer.from(body)).digest("hex");
}

beforeEach(async () => {
  await resetDb();
  await seedBase();
  mockCreate.mockClear();
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(null);
  mockCheckoutSig.mockReset();
  mockCheckoutSig.mockReturnValue(false);
  mockWebhookSig.mockReset();
  mockWebhookSig.mockReturnValue(false);
});
afterAll(closeDb);

describe("razorpay order creation", () => {
  it("creates a gateway order and REUSES it on repeated calls (idempotent)", async () => {
    const { a, order } = await mkPaidFlowOptions();
    const first = await a.post("/api/payments/razorpay/create").send({ orderNumber: order.orderNumber });
    expect(first.status).toBe(200);
    expect(first.body.razorpayOrderId).toBe(`order_test_${order.orderNumber}`);
    const second = await a.post("/api/payments/razorpay/create").send({ orderNumber: order.orderNumber });
    expect(second.body.razorpayOrderId).toBe(first.body.razorpayOrderId);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(await prisma.payment.count({ where: { orderId: order.id } })).toBe(1);
  });

  it("refuses payment creation for someone else's order", async () => {
    const { order } = await mkPaidFlowOptions();
    const stranger = agent((await mkCustomer("Stranger")).cookie);
    const res = await stranger.post("/api/payments/razorpay/create").send({ orderNumber: order.orderNumber });
    expect(res.status).toBe(404);
  });
});

describe("razorpay verify", () => {
  it("rejects an invalid signature with INVALID_SIGNATURE", async () => {
    const { a, order } = await mkPaidFlowOptions();
    mockCheckoutSig.mockReturnValue(false);
    const res = await a.post("/api/payments/razorpay/verify").send({
      orderNumber: order.orderNumber, razorpay_order_id: "order_X1", razorpay_payment_id: "pay_X1", razorpay_signature: "deadbeefdeadbeef",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_SIGNATURE");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PENDING");
  });

  it("rejects when the provider does not confirm capture (forged success)", async () => {
    const { a, order } = await mkPaidFlowOptions();
    mockCheckoutSig.mockReturnValue(true);
    mockFetch.mockResolvedValue({ id: "pay_X1", status: "failed", amount: order.totalPaise, order_id: "order_X1" });
    const res = await a.post("/api/payments/razorpay/verify").send({
      orderNumber: order.orderNumber, razorpay_order_id: "order_X1", razorpay_payment_id: "pay_X1", razorpay_signature: "a".repeat(64),
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("PAYMENT_NOT_CONFIRMED");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PENDING");
  });

  it("marks PAID once on a verified capture and stays idempotent on repeated callbacks", async () => {
    const { a, order } = await mkPaidFlowOptions();
    await a.post("/api/payments/razorpay/create").send({ orderNumber: order.orderNumber });
    mockCheckoutSig.mockReturnValue(true);
    mockFetch.mockImplementation(async (id: string) => ({ id, status: "captured", amount: order.totalPaise, order_id: `order_test_${order.orderNumber}`, method: "upi" }));

    const body = {
      orderNumber: order.orderNumber, razorpay_order_id: `order_test_${order.orderNumber}`,
      razorpay_payment_id: "pay_OK1", razorpay_signature: "s".repeat(64),
    };
    const first = await a.post("/api/payments/razorpay/verify").send(body);
    expect(first.status).toBe(200);
    expect(first.body.paid).toBe(true);

    const again = await a.post("/api/payments/razorpay/verify").send(body);
    expect(again.status).toBe(200);
    expect(again.body.already).toBe(true);

    const events = await prisma.orderEvent.findMany({ where: { orderId: order.id, status: "PAYMENT_RECEIVED" } });
    expect(events).toHaveLength(1); // no duplicate capture events
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PAID");
  });

  it("handles a LATE payment after cancellation honestly — order stays cancelled", async () => {
    const { a, order } = await mkPaidFlowOptions();
    await a.post("/api/payments/razorpay/create").send({ orderNumber: order.orderNumber });
    await cancelOrder(order.orderNumber, null, "Customer changed their mind", "CUSTOMER");
    const stock = (await prisma.plantVariant.findFirstOrThrow()).stock;

    mockCheckoutSig.mockReturnValue(true);
    const res = await a.post("/api/payments/razorpay/verify").send({
      orderNumber: order.orderNumber, razorpay_order_id: `order_test_${order.orderNumber}`,
      razorpay_payment_id: "pay_LATE1", razorpay_signature: "s".repeat(64),
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PAYMENT_AFTER_CANCELLATION");
    const fresh = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(fresh.status).toBe("CANCELLED");
    expect(fresh.paymentStatus).toBe("CANCELLED");
    // stock was already restored by the cancellation and is NOT deducted again
    expect((await prisma.plantVariant.findFirstOrThrow()).stock).toBe(stock);
    expect((await prisma.orderEvent.findMany({ where: { orderId: order.id, status: "PAYMENT_LATE" } })).length).toBe(1);
  });
});

describe("razorpay webhook", () => {
  const payload = (event: string, payment: Record<string, unknown>) =>
    JSON.stringify({ event, payload: { payment: { entity: { id: "pay_W1", ...payment } } } });

  it("rejects an invalid webhook signature", async () => {
    mockWebhookSig.mockReturnValue(false);
    const res = await request(app)
      .post("/api/payments/razorpay/webhook")
      .set("Content-Type", "application/json")
      .set("x-razorpay-signature", "not_valid")
      .send(payload("payment.captured", { order_id: "order_zz" }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_WEBHOOK_SIGNATURE");
  });

  it("marks the order PAID on a valid payment.captured", async () => {
    const { order } = await mkPaidFlowOptions();
    const rzpOrderId = `order_test_${order.orderNumber}`;
    await prisma.payment.updateMany({ where: { orderId: order.id }, data: { rzpOrderId } });

    const body = payload("payment.captured", { id: "pay_W1", order_id: rzpOrderId, method: "card" });
    mockWebhookSig.mockReturnValue(true);
    const res = await request(app)
      .post("/api/payments/razorpay/webhook")
      .set("Content-Type", "application/json")
      .set("x-razorpay-signature", realWebhookSig(body))
      .send(body);
    expect(res.status).toBe(200);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PAID");
  });

  it("deduplicates repeated deliveries of the same webhook event", async () => {
    const { order } = await mkPaidFlowOptions();
    const rzpOrderId = `order_test_${order.orderNumber}`;
    await prisma.payment.updateMany({ where: { orderId: order.id }, data: { rzpOrderId } });

    const body = payload("payment.captured", { id: "pay_DUP", order_id: rzpOrderId });
    mockWebhookSig.mockReturnValue(true);
    const send = () =>
      request(app).post("/api/payments/razorpay/webhook").set("Content-Type", "application/json").set("x-razorpay-signature", realWebhookSig(body)).send(body);

    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(200);
    const direct = await handleWebhook(Buffer.from(body), realWebhookSig(body));
    expect(direct).toEqual({ duplicate: true });

    expect((await prisma.orderEvent.findMany({ where: { orderId: order.id, status: "PAYMENT_RECEIVED" } })).length).toBe(1);
    expect(await prisma.webhookEvent.count()).toBe(1);
  });

  it("records payment.failed without touching the order payment status", async () => {
    const { order } = await mkPaidFlowOptions();
    const rzpOrderId = `order_test_${order.orderNumber}`;
    await prisma.payment.updateMany({ where: { orderId: order.id }, data: { rzpOrderId } });
    const body = payload("payment.failed", { id: "pay_FAIL", order_id: rzpOrderId });
    mockWebhookSig.mockReturnValue(true);
    const res = await request(app).post("/api/payments/razorpay/webhook").set("Content-Type", "application/json").set("x-razorpay-signature", realWebhookSig(body)).send(body);
    expect(res.status).toBe(200);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PENDING");
    expect((await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })).status).toBe("FAILED");
  });

  it("never revives a cancelled order from a late webhook", async () => {
    const { order } = await mkPaidFlowOptions();
    const rzpOrderId = `order_test_${order.orderNumber}`;
    await prisma.payment.updateMany({ where: { orderId: order.id }, data: { rzpOrderId } });
    await cancelOrder(order.orderNumber, null, "Expired", "CUSTOMER");
    const stockAfterCancel = (await prisma.plantVariant.findFirstOrThrow()).stock;
    expect(stockAfterCancel).toBe(10); // restore happened exactly once

    const body = payload("payment.captured", { id: "pay_LATE", order_id: rzpOrderId });
    mockWebhookSig.mockReturnValue(true);
    const res = await request(app).post("/api/payments/razorpay/webhook").set("Content-Type", "application/json").set("x-razorpay-signature", realWebhookSig(body)).send(body);
    expect(res.status).toBe(200);
    const fresh = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(fresh.status).toBe("CANCELLED");
    expect(fresh.paymentStatus).toBe("CANCELLED");
    // still 10 — the late capture did NOT deduct or restore anything again
    expect((await prisma.plantVariant.findFirstOrThrow()).stock).toBe(stockAfterCancel);
  });
});

describe("payment window expiry", () => {
  it("sweeps expired pending orders: cancelled, stock restored exactly once, payment EXPIRED", async () => {
    const { order } = await mkPaidFlowOptions();
    const variant = await prisma.plantVariant.findFirstOrThrow();
    expect(variant.stock).toBe(9); // reserved at checkout

    await prisma.order.update({ where: { id: order.id }, data: { expiresAt: new Date(Date.now() - 60_000) } });
    await sweepExpiredOrders();

    const fresh = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(fresh.status).toBe("CANCELLED");
    expect(fresh.stockRestored).toBe(true);
    expect((await prisma.plantVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(10);
    expect((await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })).status).toBe("EXPIRED");

    // sweeping again is a no-op — restore happens exactly once
    await sweepExpiredOrders();
    expect((await prisma.plantVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(10);
  });
});
