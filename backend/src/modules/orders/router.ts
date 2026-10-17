import { Router } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../../middleware/auth.js";
import { requireAuth } from "../../middleware/auth.js";
import { checkoutLimiter } from "../../middleware/ratelimit.js";
import { parse, phoneSchema, pincodeSchema } from "../../lib/validate.js";
import { badRequest } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { cancelOrder, createOrder, getOrderForUser, listOrdersForUser, quoteCheckout } from "./service.js";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

/** Fresh server-computed quote for the checkout page. */
ordersRouter.get("/quote", async (req, res, next) => {
  try { res.json({ quote: await quoteCheckout((req as AuthedRequest).user!.id) }); } catch (e) { next(e); }
});

const addressSchema = z.object({
  recipientName: z.string().trim().min(2, "Recipient name is required").max(80),
  phone: phoneSchema,
  pincode: pincodeSchema,
  line1: z.string().trim().min(5, "Address line 1 is required").max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2, "City is required").max(80),
  state: z.string().trim().min(2, "State is required").max(80),
});

const checkoutSchema = z.object({
  addressId: z.string().optional(),
  address: addressSchema.optional(),
  slotId: z.string().min(1, "Please choose a delivery slot"),
  deliveryDate: z.string().min(10),
  paymentMethod: z.enum(["COD", "RAZORPAY", "DEMO_ONLINE"]),
  confirmPricing: z
    .object({ fingerprint: z.string(), subtotalPaise: z.number().int(), deliveryFeePaise: z.number().int() })
    .optional(),
});

/**
 * Checkout. Sends `Idempotency-Key` → retries/double-clicks return the SAME
 * order. A 409 PRICE_CHANGED carries a fresh quote the client must confirm.
 */
ordersRouter.post("/", checkoutLimiter, async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const body = parse(checkoutSchema, req.body);
    if (!body.addressId && !body.address) throw badRequest("ADDRESS_REQUIRED", "Please choose or enter a delivery address");
    const idempotencyKey = req.header("idempotency-key") ?? "";
    if (!idempotencyKey || idempotencyKey.length < 8) throw badRequest("IDEMPOTENCY_KEY_REQUIRED", "Missing checkout request key");
    const { order, replayed } = await createOrder(user.id, body, idempotencyKey);
    res.status(replayed ? 200 : 201).json({ order, replayed });
  } catch (e) { next(e); }
});

ordersRouter.get("/", async (req, res, next) => {
  try {
    const orders = await listOrdersForUser((req as AuthedRequest).user!.id);
    res.json({
      orders: orders.map((o) => ({
        ...o,
        itemCount: o.items.length,
        items: undefined,
      })),
    });
  } catch (e) { next(e); }
});

ordersRouter.get("/:orderNumber", async (req, res, next) => {
  try {
    const order = await getOrderForUser(req.params.orderNumber, (req as AuthedRequest).user!.id);
    res.json({ order });
  } catch (e) { next(e); }
});

ordersRouter.post("/:orderNumber/cancel", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const { reason } = parse(z.object({ reason: z.string().trim().max(300).optional() }), req.body ?? {});
    const order = await cancelOrder(req.params.orderNumber, user.id, reason ?? "Cancelled by customer", "CUSTOMER");
    res.json({ order });
  } catch (e) { next(e); }
});

// ── addresses (owned strictly by the signed-in customer) ─────────────
export const addressesRouter = Router();
addressesRouter.use(requireAuth);

const newAddress = addressSchema.extend({ isDefault: z.boolean().optional() });

addressesRouter.get("/", async (req, res, next) => {
  try {
    const addresses = await prisma.address.findMany({ where: { userId: (req as AuthedRequest).user!.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
    res.json({ addresses });
  } catch (e) { next(e); }
});

addressesRouter.post("/", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const body = parse(newAddress, req.body);
    if (body.isDefault) await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    const address = await prisma.address.create({ data: { ...body, userId: user.id } });
    res.status(201).json({ address });
  } catch (e) { next(e); }
});

addressesRouter.delete("/:id", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const deleted = await prisma.address.deleteMany({ where: { id: req.params.id, userId: user.id } });
    if (deleted.count === 0) throw badRequest("NOT_FOUND", "Address not found");
    res.json({ ok: true });
  } catch (e) { next(e); }
});
