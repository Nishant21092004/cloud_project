/**
 * Payment routes — Razorpay checkout creation, verification and webhooks.
 * Every path here is idempotent; repeated callbacks can never double-mark
 * an order or double-deduct stock (stock was reserved once at order time).
 */
import { Router } from "express";
import { createHash } from "node:crypto";
import type { AuthedRequest } from "../../middleware/auth.js";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { badRequest, conflict, notFound } from "../../lib/errors.js";
import { parse } from "../../lib/validate.js";
import { z } from "zod";
import { razorpayEnabled, env } from "../../config/env.js";
import { createPaymentOrder, fetchProviderPayment, verifyCheckoutSignature, verifyWebhookSignature } from "./razorpay.js";

export const paymentsRouter = Router();

/** Public: the frontend asks whether online payment is available (+ public key id). */
paymentsRouter.get("/config", (_req, res) => {
  res.json({ enabled: razorpayEnabled, keyId: razorpayEnabled ? env.RAZORPAY_KEY_ID : null });
});

/** Create a gateway order for a pending online-payment order. */
paymentsRouter.post("/razorpay/create", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const { orderNumber } = parse(z.object({ orderNumber: z.string().min(3) }), req.body);
    const order = await prisma.order.findUnique({ where: { orderNumber }, include: { payments: true } });
    if (!order || order.userId !== user.id) throw notFound("Order not found");
    if (order.paymentMethod !== "RAZORPAY") throw badRequest("NOT_ONLINE_ORDER", "This order is not an online-payment order");
    if (order.paymentStatus !== "PENDING") throw conflict("PAYMENT_NOT_PENDING", `This order's payment is ${order.paymentStatus.toLowerCase()}`);
    if (order.status === "CANCELLED") throw conflict("ORDER_CANCELLED", "This order was cancelled — stock was released. Please place a new order.");
    if (order.expiresAt && order.expiresAt < new Date()) throw conflict("ORDER_EXPIRED", "The payment window for this order expired — please place a new order");

    // reuse an existing gateway order if one was already created (idempotent)
    const existing = order.payments.find((p) => p.rzpOrderId);
    if (existing) {
      res.json({ razorpayOrderId: existing.rzpOrderId, amountPaise: order.totalPaise, keyId: env.RAZORPAY_KEY_ID, orderNumber });
      return;
    }
    const rzpOrder = await createPaymentOrder(order.totalPaise, orderNumber);
    await prisma.payment.updateMany({ where: { orderId: order.id, rzpOrderId: null }, data: { rzpOrderId: rzpOrder.id } });
    res.json({ razorpayOrderId: rzpOrder.id, amountPaise: order.totalPaise, keyId: env.RAZORPAY_KEY_ID, orderNumber });
  } catch (e) {
    next(e);
  }
});

/** Client callback after checkout.js completes — signature + provider verified. */
paymentsRouter.post("/razorpay/verify", requireAuth, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const body = parse(
      z.object({
        orderNumber: z.string().min(3),
        razorpay_order_id: z.string().min(3),
        razorpay_payment_id: z.string().min(3),
        razorpay_signature: z.string().min(8),
      }),
      req.body,
    );
    const order = await prisma.order.findUnique({ where: { orderNumber: body.orderNumber }, include: { payments: true } });
    if (!order || order.userId !== user.id) throw notFound("Order not found");

    // idempotent: already paid → acknowledge quietly
    if (order.paymentStatus === "PAID") {
      res.json({ paid: true, already: true, orderNumber: body.orderNumber });
      return;
    }

    // late payment after cancellation/expiry — handled honestly, order stays cancelled
    if (order.status === "CANCELLED") {
      await prisma.payment.updateMany({
        where: { orderId: order.id, status: { in: ["CREATED"] } },
        data: { status: "LATE", rzpPaymentId: body.razorpay_payment_id, rzpSignature: body.razorpay_signature },
      });
      await prisma.orderEvent.create({
        data: { orderId: order.id, status: "PAYMENT_LATE", note: "Payment arrived after cancellation. Refund via Razorpay dashboard — order NOT revived.", actorRole: "SYSTEM" },
      });
      throw conflict("PAYMENT_AFTER_CANCELLATION", "This payment arrived after the order was cancelled. The amount can be refunded from the Razorpay dashboard; the order itself is closed.");
    }

    if (order.paymentMethod !== "RAZORPAY" || order.paymentStatus !== "PENDING") throw conflict("PAYMENT_NOT_PENDING", "This order is not awaiting payment");

    // 1. signature check
    if (!verifyCheckoutSignature({ rzpOrderId: body.razorpay_order_id, rzpPaymentId: body.razorpay_payment_id, signature: body.razorpay_signature })) {
      throw badRequest("INVALID_SIGNATURE", "Payment signature verification failed");
    }

    // 2. provider confirmation (when gateway reachable) — never trust the browser alone
    let method: string | null = null;
    if (razorpayEnabled) {
      try {
        const remote = await fetchProviderPayment(body.razorpay_payment_id);
        if (!remote || remote.status !== "captured" || remote.amount !== order.totalPaise || remote.order_id !== body.razorpay_order_id) {
          throw badRequest("PAYMENT_NOT_CONFIRMED", "The payment could not be confirmed with the payment gateway");
        }
        method = remote.method ?? null;
      } catch (e) {
        if (e instanceof Error && (e as { statusCode?: number }).statusCode !== undefined) {
          throw badRequest("PAYMENT_NOT_CONFIRMED", "The payment could not be confirmed with the payment gateway");
        }
        throw e;
      }
    }

    // 3. guarded transition PENDING → PAID (idempotent even under races/webhooks)
    const updated = await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: "PENDING" },
      data: { paymentStatus: "PAID" },
    });
    if (updated.count === 1) {
      await recordPaymentCapture(order.id, body.razorpay_payment_id, body.razorpay_signature, method);
      await prisma.orderEvent.create({ data: { orderId: order.id, status: "PAYMENT_RECEIVED", note: `Payment verified (${body.razorpay_payment_id})`, actorRole: "SYSTEM" } });
    }
    res.json({ paid: true, orderNumber: body.orderNumber });
  } catch (e) {
    next(e);
  }
});

async function recordPaymentCapture(orderId: string, paymentId: string, signature: string, method: string | null) {
  try {
    await prisma.payment.updateMany({
      where: { orderId, rzpPaymentId: null, status: { in: ["CREATED"] } },
      data: { rzpPaymentId: paymentId, rzpSignature: signature, status: "CAPTURED", method },
    });
  } catch {
    // unique(rzpPaymentId) clash → webhook already recorded it; nothing to do
  }
}

/** Gateway webhook — app.ts mounts express.raw() for this path. */
paymentsRouter.post("/razorpay/webhook", async (req, res, next) => {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
    const result = await handleWebhook(raw, req.header("x-razorpay-signature"));
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/**
 * Webhook — raw-body HMAC verified. Handles duplicate deliveries silently.
 * order.paid / payment.captured → mark PAID (guarded); payment.failed → note.
 */
export async function handleWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    throw badRequest("INVALID_WEBHOOK_SIGNATURE", "Webhook signature verification failed");
  }
  const event = JSON.parse(rawBody.toString("utf8")) as { event: string; payload?: Record<string, unknown> };
  const eventId = (event.payload?.payment as { id?: string } | undefined)?.id ?? createHash("sha1").update(rawBody).digest("hex");

  // deduplication barrier — Razorpay may deliver the same event repeatedly
  try {
    await prisma.webhookEvent.create({ data: { eventId, type: event.event } });
  } catch {
    return { duplicate: true };
  }

  const extract = (key: string) => {
    const entity = (event.payload?.[key] as { entity?: Record<string, string> } | undefined)?.entity;
    return entity ?? null;
  };

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const paymentEntity = extract("payment");
    const orderEntity = extract("order");
    const rzpOrderId = paymentEntity?.order_id ?? orderEntity?.id ?? null;
    const rzpPaymentId = paymentEntity?.id ?? orderEntity?.id ?? null;
    if (!rzpOrderId || !rzpPaymentId) return { ignored: true };

    const paymentRow = await prisma.payment.findFirst({ where: { rzpOrderId }, include: { order: true } });
    if (!paymentRow) return { ignored: true };
    const order = paymentRow.order;

    if (order.status === "CANCELLED") {
      // late webhook — record honestly, never revive a cancelled order
      await prisma.payment.updateMany({ where: { orderId: order.id, status: { in: ["CREATED"] } }, data: { status: "LATE", rzpPaymentId } });
      await prisma.orderEvent.create({ data: { orderId: order.id, status: "PAYMENT_LATE", note: "Webhook captured payment after cancellation — refund via dashboard", actorRole: "SYSTEM" } });
      return { late: true };
    }
    const updated = await prisma.order.updateMany({ where: { id: order.id, paymentStatus: "PENDING" }, data: { paymentStatus: "PAID" } });
    if (updated.count === 1) {
      await recordPaymentCapture(order.id, rzpPaymentId, signature, (paymentEntity?.method as string) ?? null);
      await prisma.orderEvent.create({ data: { orderId: order.id, status: "PAYMENT_RECEIVED", note: `Webhook verified (${rzpPaymentId})`, actorRole: "SYSTEM" } });
    }
    return { ok: true };
  }

  if (event.event === "payment.failed") {
    const paymentEntity = extract("payment");
    if (paymentEntity?.order_id) {
      await prisma.payment.updateMany({ where: { rzpOrderId: paymentEntity.order_id, status: "CREATED" }, data: { status: "FAILED", rzpPaymentId: paymentEntity.id ?? null } });
    }
    return { ok: true };
  }
  return { ignored: true };
}
