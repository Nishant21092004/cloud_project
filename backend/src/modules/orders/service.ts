import { checkServiceability } from "../catalog/service.js";
/**
 * Orders service — the transactional heart of BloomNest.
 *
 * Guarantees implemented here:
 *  1. Price & stock are recomputed server-side at checkout; a changed total
 *     requires the customer's explicit confirmation (PRICE_CHANGED 409).
 *  2. Stock is decremented with CONDITIONAL updates inside a transaction —
 *     two buyers racing for the last stem: exactly one wins (409 for the rest).
 *  3. `Idempotency-Key` → repeated checkout attempts return the SAME order
 *     and never deduct stock twice.
 *  4. Cancellation / expiry restores stock EXACTLY ONCE via a status
 *     transition guard (PLACED/CONFIRMED/PREPARING → CANCELLED).
 *  5. Order lines store price + composition SNAPSHOTS — later catalogue
 *     edits never rewrite history.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError, badRequest, conflict, notFound } from "../../lib/errors.js";
import { uniqueOrderNumber } from "../../lib/ids.js";
import { env } from "../../config/env.js";
import { loadPricedCart, customSnapshotOf } from "../cart/service.js";
import type { CustomSnapshot } from "../catalog/pricing.js";

export interface CheckoutInput {
  addressId?: string;
  address?: {
    recipientName: string;
    phone: string;
    pincode: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
  };
  slotId: string;
  deliveryDate: string; // YYYY-MM-DD
  paymentMethod: "COD" | "RAZORPAY" | "DEMO_ONLINE";
  confirmPricing?: { fingerprint: string; subtotalPaise: number; deliveryFeePaise: number };
}

export interface CheckoutQuote {
  fingerprint: string;
  subtotalPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
  itemCount: number;
  lines: Array<{ title: string; subtitle: string | null; qty: number; lineTotalPaise: number; issues: string[] }>;
}

const CANCELLABLE_STATUSES = ["PLACED", "CONFIRMED", "PREPARING"] as const;
const MAX_DELIVERY_DAYS_AHEAD = 7;

export async function quoteCheckout(userId: string): Promise<CheckoutQuote> {
  const cart = await loadPricedCart(userId);
  return {
    fingerprint: cart.fingerprint,
    subtotalPaise: cart.subtotalPaise,
    deliveryFeePaise: 0, // address not chosen yet
    totalPaise: cart.subtotalPaise,
    itemCount: cart.itemCount,
    lines: cart.lines.map((l) => ({ title: l.title, subtitle: l.subtitle, qty: l.qty, lineTotalPaise: l.lineTotalPaise, issues: l.issues })),
  };
}

export async function createOrder(userId: string, input: CheckoutInput, idempotencyKey: string) {
  // 1 ── idempotent replay: same key returns the same order, no side effects
  const existingKey = await prisma.idempotencyKey.findUnique({
    where: { userId_key: { userId, key: idempotencyKey } },
    include: { },
  });
  if (existingKey?.orderId) {
    const order = await prisma.order.findUnique({ where: { id: existingKey.orderId } });
    if (order) return { order: await getOrderForUser(order.orderNumber, userId), replayed: true };
  }

  // 2 ── resolve address + delivery config
  const addressData = await resolveAddress(userId, input);
  const pincodeRow = await checkServiceability(addressData.pincode);
  if (!pincodeRow.serviceable) {
    throw conflict("NOT_SERVICEABLE", `Sorry, we do not deliver to PIN ${addressData.pincode} yet`, { pincode: addressData.pincode });
  }
  const slot = await prisma.deliverySlot.findFirst({ where: { id: input.slotId, active: true } });
  if (!slot) throw badRequest("INVALID_SLOT", "Please choose a valid delivery slot");

  const deliveryDate = parseDeliveryDate(input.deliveryDate);

  // 3 ── price the cart from live data (never trusts the client)
  const cart = await loadPricedCart(userId);
  if (cart.lines.length === 0) throw badRequest("EMPTY_CART", "Your cart is empty");
  const stockIssues = cart.lines.flatMap((l) => l.issues);
  if (stockIssues.length > 0) {
    throw conflict("OUT_OF_STOCK", "Some items in your cart are no longer available in the requested quantity", {
      issues: stockIssues,
      cart: await quoteCheckout(userId),
    });
  }

  // 4 ── pricing confirmation gate (protects against stale totals after edits)
  const subtotalPaise = cart.subtotalPaise;
  const deliveryFeePaise = pincodeRow.deliveryFeePaise!;
  const totalPaise = subtotalPaise + deliveryFeePaise;
  const confirmed = input.confirmPricing;
  if (!confirmed || confirmed.fingerprint !== cart.fingerprint || confirmed.subtotalPaise !== subtotalPaise || confirmed.deliveryFeePaise !== deliveryFeePaise) {
    throw conflict("PRICE_CHANGED", "Your cart total has been updated — please review and confirm", {
      quote: { fingerprint: cart.fingerprint, subtotalPaise, deliveryFeePaise, totalPaise, itemCount: cart.itemCount },
    });
  }

  // 5 ── claim the idempotency key (unique constraint → race-safe replay)
  try {
    await prisma.idempotencyKey.create({ data: { userId, key: idempotencyKey } });
  } catch {
    const winner = await prisma.idempotencyKey.findUnique({ where: { userId_key: { userId, key: idempotencyKey } } });
    if (winner?.orderId) return { order: await getOrderForUser((await prisma.order.findUniqueOrThrow({ where: { id: winner.orderId } })).orderNumber, userId), replayed: true };
    throw conflict("CHECKOUT_IN_PROGRESS", "A checkout with this request is already being processed");
  }

  // 6 ── transactional order creation with conditional stock updates
  const orderNumber = await uniqueOrderNumber();
  const now = new Date();
  const expiresAt = input.paymentMethod === "RAZORPAY" ? new Date(now.getTime() + env.ORDER_PAYMENT_TTL_MINUTES * 60_000) : null;

  const order = await prisma.$transaction(async (tx) => {
    // 6a. flowers: aggregate every stem the cart needs (loose + recipes + customs)
    const flowerNeeds = new Map<string, number>();
    const variantNeeds = new Map<string, number>();
    for (const line of cart.lines) {
      if (line.kind === "FLOWER" && line.flowerId) {
        flowerNeeds.set(line.flowerId, (flowerNeeds.get(line.flowerId) ?? 0) + line.qty);
      } else if (line.kind === "BOUQUET" && line.bouquetId) {
        const recipe = await tx.bouquetItem.findMany({ where: { bouquetId: line.bouquetId }, select: { flowerId: true, stems: true } });
        for (const ri of recipe) flowerNeeds.set(ri.flowerId, (flowerNeeds.get(ri.flowerId) ?? 0) + ri.stems * line.qty);
      } else if (line.kind === "PLANT" && line.plantVariantId) {
        variantNeeds.set(line.plantVariantId, (variantNeeds.get(line.plantVariantId) ?? 0) + line.qty);
      } else if (line.kind === "CUSTOM" && line.customBouquetId) {
        const cfg = await tx.customBouquetFlower.findMany({ where: { customBouquetId: line.customBouquetId }, select: { flowerId: true, stems: true } });
        for (const cf of cfg) flowerNeeds.set(cf.flowerId, (flowerNeeds.get(cf.flowerId) ?? 0) + cf.stems);
      }
    }

    // 6b. conditional decrements — the anti-oversell barrier
    for (const [flowerId, need] of flowerNeeds) {
      const res = await tx.flower.updateMany({
        where: { id: flowerId, active: true, stockStems: { gte: need } },
        data: { stockStems: { decrement: need } },
      });
      if (res.count !== 1) {
        const f = await tx.flower.findUnique({ where: { id: flowerId } });
        throw conflict("OUT_OF_STOCK", `Sorry — “${f?.name ?? "an item"}” just sold out. Please review your bouquet.`, { flowerId });
      }
    }
    for (const [variantId, need] of variantNeeds) {
      const res = await tx.plantVariant.updateMany({
        where: { id: variantId, active: true, stock: { gte: need } },
        data: { stock: { decrement: need } },
      });
      if (res.count !== 1) {
        throw conflict("OUT_OF_STOCK", "Sorry — that plant variant just sold out. Please review your cart.", { variantId });
      }
    }

    // 6c. order + items (snapshots!) + timeline
    const itemsData: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];
    for (const line of cart.lines) {
      const base: Prisma.OrderItemUncheckedCreateWithoutOrderInput = {
        kind: line.kind,
        title: line.title,
        subtitle: line.subtitle,
        qty: line.kind === "FLOWER" ? 1 : line.qty,
        stems: line.kind === "FLOWER" ? line.qty : null,
        unitPricePaise: line.unitPaise,
        lineTotalPaise: line.lineTotalPaise,
        flowerId: line.flowerId,
        plantVariantId: line.plantVariantId,
        bouquetId: line.bouquetId,
      };
      if (line.kind === "CUSTOM" && line.customBouquetId) {
        const cb = await tx.customBouquet.findUniqueOrThrow({
          where: { id: line.customBouquetId },
          include: { wrapping: true, ribbon: true, extras: { include: { extra: true } }, flowers: { include: { flower: true } } },
        });
        const config = {
          flowers: cb.flowers.map((f) => ({ flower: f.flower, stems: f.stems })),
          wrapping: cb.wrapping,
          ribbon: cb.ribbon,
          extras: cb.extras.map((e) => e.extra),
          greetingMessage: cb.greetingMessage,
        };
        base.customSnapshot = customSnapshotOf(config, line.lineTotalPaise) as unknown as Prisma.InputJsonValue;
      }
      if (line.kind === "BOUQUET" && line.bouquetId) {
        // recipe snapshot → exact stock restore later even if the recipe changes
        const recipe = await tx.bouquetItem.findMany({ where: { bouquetId: line.bouquetId }, include: { flower: true } });
        base.customSnapshot = {
          recipe: recipe.map((ri) => ({ flowerId: ri.flowerId, name: ri.flower.name, stems: ri.stems })),
        } as unknown as Prisma.InputJsonValue;
      }
      if (line.kind === "PLANT" && line.plantVariantId) {
        const variant = await tx.plantVariant.findUniqueOrThrow({ where: { id: line.plantVariantId }, select: { plantId: true } });
        base.plantId = variant.plantId;
      }
      itemsData.push(base);
    }

    const created = await tx.order.create({
      data: {
        orderNumber,
        userId,
        status: "PLACED",
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentMethod === "COD" ? "COD_PENDING" : input.paymentMethod === "DEMO_ONLINE" ? "DEMO_PAID" : "PENDING",
        subtotalPaise,
        deliveryFeePaise,
        totalPaise,
        recipientName: addressData.recipientName,
        phone: addressData.phone,
        pincode: addressData.pincode,
        addressLine: [addressData.line1, addressData.line2].filter(Boolean).join(", "),
        city: addressData.city,
        state: addressData.state,
        deliveryDate,
        slotLabel: slot.label,
        expiresAt,
        items: { create: itemsData },
        events: { create: { status: "PLACED", note: `Order placed via ${input.paymentMethod === "COD" ? "Cash on Delivery" : input.paymentMethod === "DEMO_ONLINE" ? "SIMULATED online payment (no money charged)" : "Razorpay online payment"}`, actorRole: "CUSTOMER" } },
      },
    });

    if (input.paymentMethod === "RAZORPAY") {
      await tx.payment.create({ data: { orderId: created.id, amountPaise: totalPaise, status: "CREATED" } });
    }

    // 6d. cart empties — custom bouquet rows are orphaned, clean them
    const cartId = cart.cartId;
    await tx.customBouquet.deleteMany({ where: { cartItem: { cartId } } });
    await tx.cartItem.deleteMany({ where: { cartId } });
    return created;
  });

  // 7 ── link the key to the order so REPLAYS return it (idempotent retries)
  await prisma.idempotencyKey.update({
    where: { userId_key: { userId, key: idempotencyKey } },
    data: { orderId: order.id },
  });

  return { order: await getOrderForUser(order.orderNumber, userId), replayed: false };
}

async function resolveAddress(userId: string, input: CheckoutInput) {
  if (input.addressId) {
    const addr = await prisma.address.findFirst({ where: { id: input.addressId, userId } });
    if (!addr) throw notFound("Selected address was not found — please pick another one");
    return addr;
  }
  if (input.address) {
    const created = await prisma.address.create({ data: { ...input.address, userId } });
    return created;
  }
  throw badRequest("ADDRESS_REQUIRED", "Please choose or enter a delivery address");
}

function parseDeliveryDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw badRequest("INVALID_DATE", "Delivery date must be YYYY-MM-DD");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw badRequest("INVALID_DATE", "Invalid delivery date");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const max = new Date(today.getTime() + MAX_DELIVERY_DAYS_AHEAD * 86_400_000);
  if (date.getTime() < today.getTime()) throw badRequest("INVALID_DATE", "Delivery date cannot be in the past");
  if (date.getTime() > max.getTime()) throw badRequest("INVALID_DATE", `Delivery is available up to ${MAX_DELIVERY_DAYS_AHEAD} days ahead`);
  return date;
}

// ── reads ────────────────────────────────────────────────────────────
const orderInclude = {
  items: { orderBy: { createdAt: "asc" as const } },
  events: { orderBy: { createdAt: "asc" as const } },
  payments: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.OrderInclude;

export async function getOrderForUser(orderNumber: string, userId: string) {
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: orderInclude });
  // customer isolation: a wrong owner is indistinguishable from "doesn't exist"
  if (!order || order.userId !== userId) throw notFound("Order not found");
  return order;
}

export async function listOrdersForUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
}

// ── cancellation & stock restore (exactly once) ──────────────────────
export async function cancelOrder(orderNumber: string, userId: string | null, reason: string, actorRole: "CUSTOMER" | "ADMIN") {
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: { items: true } });
  if (!order) throw notFound("Order not found");
  if (userId && order.userId !== userId) throw notFound("Order not found");

  if (!CANCELLABLE_STATUSES.includes(order.status as (typeof CANCELLABLE_STATUSES)[number])) {
    throw conflict("NOT_CANCELLABLE", `An order that is ${order.status.replace(/_/g, " ").toLowerCase()} can no longer be cancelled`);
  }

  // status-transition guard → only ONE concurrent request performs the restore
  const updated = await prisma.order.updateMany({
    where: { id: order.id, status: { in: [...CANCELLABLE_STATUSES] } },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason || "Cancelled",
      stockRestored: true,
      ...(order.paymentMethod === "RAZORPAY" && order.paymentStatus === "PENDING" ? { paymentStatus: "CANCELLED" } : {}),
      ...(order.paymentMethod === "DEMO_ONLINE" ? { paymentStatus: "CANCELLED" } : {}),
      ...(order.paymentMethod === "RAZORPAY" && order.paymentStatus === "PAID"
        ? { paymentStatus: "REFUND_REQUESTED", refundNote: "Prepaid order cancelled. Refund must be completed in the Razorpay dashboard; status shows REFUNDED only after an admin verifies it." }
        : {}),
    },
  });
  if (updated.count !== 1) throw conflict("ALREADY_CANCELLED", "This order was already cancelled");

  // restore inventory from stored snapshots (immune to catalogue edits)
  for (const item of order.items) {
    if (item.kind === "FLOWER" && item.flowerId && item.stems) {
      await prisma.flower.update({ where: { id: item.flowerId }, data: { stockStems: { increment: item.stems } } });
    } else if (item.kind === "PLANT" && item.plantVariantId) {
      await prisma.plantVariant.update({ where: { id: item.plantVariantId }, data: { stock: { increment: item.qty } } });
    } else if (item.kind === "BOUQUET" && item.bouquetId && item.customSnapshot) {
      const snap = item.customSnapshot as unknown as { recipe?: Array<{ flowerId: string; stems: number }> };
      for (const ri of snap.recipe ?? []) {
        await prisma.flower.update({ where: { id: ri.flowerId }, data: { stockStems: { increment: ri.stems * item.qty } } }).catch(() => {});
      }
    } else if (item.kind === "CUSTOM" && item.customSnapshot) {
      const snap = item.customSnapshot as unknown as CustomSnapshot;
      for (const f of snap.flowers) {
        await prisma.flower.update({ where: { id: f.flowerId }, data: { stockStems: { increment: f.stems } } }).catch(() => {});
      }
    }
  }

  await prisma.orderEvent.create({
    data: {
      orderId: order.id,
      status: "CANCELLED",
      note: `Cancelled by ${actorRole === "ADMIN" ? "admin" : "customer"}${reason ? `: ${reason}` : ""}`,
      actorRole,
    },
  });
  return prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
}

// ── expiry sweeper for unpaid online orders ──────────────────────────
export async function sweepExpiredOrders(): Promise<number> {
  const expired = await prisma.order.findMany({
    where: { paymentMethod: "RAZORPAY", paymentStatus: "PENDING", status: "PLACED", expiresAt: { lt: new Date() } },
    include: { items: true },
    take: 50,
  });
  let swept = 0;
  for (const order of expired) {
    const updated = await prisma.order.updateMany({
      where: { id: order.id, status: "PLACED", paymentStatus: "PENDING" },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Payment window expired", stockRestored: true, paymentStatus: "CANCELLED" },
    });
    if (updated.count !== 1) continue;
    swept++;
    for (const item of order.items) {
      if (item.kind === "FLOWER" && item.flowerId && item.stems) {
        await prisma.flower.update({ where: { id: item.flowerId }, data: { stockStems: { increment: item.stems } } }).catch(() => {});
      } else if (item.kind === "PLANT" && item.plantVariantId) {
        await prisma.plantVariant.update({ where: { id: item.plantVariantId }, data: { stock: { increment: item.qty } } }).catch(() => {});
      } else if (item.kind === "BOUQUET" && item.bouquetId && item.customSnapshot) {
        const snap = item.customSnapshot as unknown as { recipe?: Array<{ flowerId: string; stems: number }> };
        for (const ri of snap.recipe ?? []) {
          await prisma.flower.update({ where: { id: ri.flowerId }, data: { stockStems: { increment: ri.stems * item.qty } } }).catch(() => {});
        }
      } else if (item.kind === "CUSTOM" && item.customSnapshot) {
        const snap = item.customSnapshot as unknown as CustomSnapshot;
        for (const f of snap.flowers) {
          await prisma.flower.update({ where: { id: f.flowerId }, data: { stockStems: { increment: f.stems } } }).catch(() => {});
        }
      }
    }
    await prisma.payment.updateMany({ where: { orderId: order.id, status: { in: ["CREATED"] } }, data: { status: "EXPIRED" } });
    await prisma.orderEvent.create({
      data: { orderId: order.id, status: "CANCELLED", note: "Online payment not completed within the reservation window — stock released", actorRole: "SYSTEM" },
    });
  }
  return swept;
}

export { CANCELLABLE_STATUSES, orderInclude };
