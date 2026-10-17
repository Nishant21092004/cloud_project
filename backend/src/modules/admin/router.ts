/**
 * Admin module — every route is gated by requireAdmin (server-side role
 * check from the session; the UI hiding buttons is never the security).
 * Order history is never rewritten: product edits don't touch old orders.
 */
import { Router } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../../middleware/auth.js";
import { requireAdmin } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { badRequest, conflict, notFound } from "../../lib/errors.js";
import { parse, paiseSchema, phoneSchema, pincodeSchema } from "../../lib/validate.js";
import { validateUploadSize, safeUploadPath } from "../../lib/images.js";
import { writeFileSync } from "node:fs";
import { cancelOrder, orderInclude } from "../orders/service.js";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

/* ── dashboard statistics — always computed from real records ───────── */
adminRouter.get("/stats", async (_req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [ordersToday, totalOrders, byStatus, pendingPayments, collected, lowFlowers, lowVariants, deliveredCount] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.count(),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.order.count({ where: { paymentStatus: "PENDING", status: { not: "CANCELLED" } } }),
      prisma.order.aggregate({
        where: { paymentStatus: { in: ["PAID", "COD_COLLECTED"] }, status: { not: "CANCELLED" } },
        _sum: { totalPaise: true },
      }),
      prisma.flower.findMany({ where: { active: true }, orderBy: { stockStems: "asc" }, take: 8 }),
      prisma.plantVariant.findMany({ where: { active: true }, include: { plant: true }, orderBy: { stock: "asc" }, take: 8 }),
      prisma.order.count({ where: { status: "DELIVERED" } }),
    ]);
    res.json({
      ordersToday,
      totalOrders,
      deliveredCount,
      pendingPayments,
      revenueCollectedPaise: collected._sum.totalPaise ?? 0,
      ordersByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
      lowStock: {
        flowers: lowFlowers.filter((f) => f.stockStems <= f.lowStockThreshold).map((f) => ({ id: f.id, name: f.name, stock: f.stockStems, threshold: f.lowStockThreshold, unit: "stems" })),
        plantVariants: lowVariants.filter((v) => v.stock <= 5).map((v) => ({ id: v.id, name: `${v.plant.name} — ${v.label}`, stock: v.stock, threshold: 5, unit: "units" })),
      },
    });
  } catch (e) { next(e); }
});

/* ── flowers ────────────────────────────────────────────────────────── */
const flowerSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, hyphens").optional(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(1000),
  colorHex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default("#e56b8c"),
  imageUrl: z.string().trim().min(1),
  pricePerStemPaise: paiseSchema.refine((n) => n > 0, "Price must be greater than zero"),
  stockStems: z.number().int().min(0).max(100000),
  lowStockThreshold: z.number().int().min(0).max(10000).optional(),
  active: z.boolean().optional(),
});

adminRouter.get("/flowers", async (_req, res, next) => {
  try { res.json({ flowers: await prisma.flower.findMany({ orderBy: { name: "asc" } }) }); } catch (e) { next(e); }
});

adminRouter.post("/flowers", async (req, res, next) => {
  try {
    const body = parse(flowerSchema, req.body);
    const slug = body.slug ?? body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const flower = await prisma.flower.create({ data: { ...body, slug, lowStockThreshold: body.lowStockThreshold ?? 20 } });
    res.status(201).json({ flower });
  } catch (e) { next(e); }
});

adminRouter.patch("/flowers/:id", async (req, res, next) => {
  try {
    const body = parse(flowerSchema.partial(), req.body);
    const flower = await prisma.flower.update({ where: { id: req.params.id }, data: body });
    res.json({ flower });
  } catch (e) { next(e); }
});

/* ── ready-made bouquets + recipes ──────────────────────────────────── */
const bouquetSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).optional(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(1000),
  imageUrl: z.string().trim().min(1),
  pricePaise: paiseSchema.refine((n) => n > 0, "Price must be greater than zero"),
  active: z.boolean().optional(),
  recipe: z.array(z.object({ flowerId: z.string(), stems: z.number().int().min(1).max(50) })).min(1).optional(),
});

adminRouter.get("/bouquets", async (_req, res, next) => {
  try { res.json({ bouquets: await prisma.bouquet.findMany({ include: { recipe: { include: { flower: true } } }, orderBy: { name: "asc" } }) }); } catch (e) { next(e); }
});

adminRouter.post("/bouquets", async (req, res, next) => {
  try {
    const body = parse(bouquetSchema, req.body);
    const slug = body.slug ?? body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { recipe, ...data } = body;
    const bouquet = await prisma.bouquet.create({
      data: {
        ...data, slug,
        recipe: recipe ? { create: recipe.map((r) => ({ flowerId: r.flowerId, stems: r.stems })) } : undefined,
      },
      include: { recipe: true },
    });
    res.status(201).json({ bouquet });
  } catch (e) { next(e); }
});

adminRouter.patch("/bouquets/:id", async (req, res, next) => {
  try {
    const body = parse(bouquetSchema.partial(), req.body);
    const { recipe, ...data } = body;
    const bouquet = await prisma.$transaction(async (tx) => {
      if (recipe) {
        await tx.bouquetItem.deleteMany({ where: { bouquetId: req.params.id } });
        await tx.bouquetItem.createMany({ data: recipe.map((r) => ({ bouquetId: req.params.id, flowerId: r.flowerId, stems: r.stems })) });
      }
      return tx.bouquet.update({ where: { id: req.params.id }, data, include: { recipe: { include: { flower: true } } } });
    });
    res.json({ bouquet });
  } catch (e) { next(e); }
});

/* ── plants + variants ──────────────────────────────────────────────── */
const plantSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).optional(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(1000),
  imageUrl: z.string().trim().min(1),
  careWatering: z.string().trim().min(2).max(120),
  careLight: z.string().trim().min(2).max(120),
  careNotes: z.string().trim().max(500).optional(),
  active: z.boolean().optional(),
  variants: z
    .array(
      z.object({
        potType: z.string().trim().min(1).max(40),
        size: z.string().trim().min(1).max(20),
        label: z.string().trim().min(2).max(60),
        pricePaise: paiseSchema.refine((n) => n > 0, "Variant price must be greater than zero"),
        stock: z.number().int().min(0).max(10000),
      }),
    )
    .min(1)
    .optional(),
});

adminRouter.get("/plants", async (_req, res, next) => {
  try { res.json({ plants: await prisma.plant.findMany({ include: { variants: true }, orderBy: { name: "asc" } }) }); } catch (e) { next(e); }
});

adminRouter.post("/plants", async (req, res, next) => {
  try {
    const body = parse(plantSchema, req.body);
    const slug = body.slug ?? body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { variants, careNotes, ...data } = body;
    const plant = await prisma.plant.create({
      data: {
        ...data, slug, careNotes: careNotes ?? null,
        variants: variants ? { create: variants.map((v) => ({ ...v, active: true })) } : undefined,
      },
      include: { variants: true },
    });
    res.status(201).json({ plant });
  } catch (e) { next(e); }
});

adminRouter.patch("/plants/:id", async (req, res, next) => {
  try {
    const body = parse(plantSchema.partial(), req.body);
    const { variants, ...data } = body;
    const plant = await prisma.plant.update({ where: { id: req.params.id }, data, include: { variants: true } });
    res.json({ plant });
  } catch (e) { next(e); }
});

adminRouter.patch("/plant-variants/:id", async (req, res, next) => {
  try {
    const body = parse(
      z.object({
        label: z.string().trim().min(2).max(60).optional(),
        pricePaise: paiseSchema.refine((n) => n > 0).optional(),
        stock: z.number().int().min(0).max(10000).optional(),
        active: z.boolean().optional(),
      }),
      req.body,
    );
    const variant = await prisma.plantVariant.update({ where: { id: req.params.id }, data: body });
    res.json({ variant });
  } catch (e) { next(e); }
});

/* ── customisation options ──────────────────────────────────────────── */
const optionSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  chargePaise: paiseSchema.optional(),
  active: z.boolean().optional(),
  kind: z.enum(["ADDON", "CARD"]).optional(),
});

adminRouter.get("/options", async (_req, res, next) => {
  try {
    const [wrappings, ribbons, extras] = await Promise.all([
      prisma.wrappingOption.findMany({ orderBy: { name: "asc" } }),
      prisma.ribbonOption.findMany({ orderBy: { name: "asc" } }),
      prisma.extraOption.findMany({ orderBy: { name: "asc" } }),
    ]);
    res.json({ wrappings, ribbons, extras });
  } catch (e) { next(e); }
});

adminRouter.post("/options/:type", async (req, res, next) => {
  try {
    const body = parse(optionSchema.required({ name: true, chargePaise: true }), req.body);
    const created = await createOption(req.params.type, body);
    res.status(201).json({ option: created });
  } catch (e) { next(e); }
});

adminRouter.patch("/options/:type/:id", async (req, res, next) => {
  try {
    const body = parse(optionSchema, req.body);
    const updated = await updateOption(req.params.type, req.params.id, body);
    res.json({ option: updated });
  } catch (e) { next(e); }
});

async function createOption(type: string, body: { name: string; chargePaise: number; active?: boolean; kind?: "ADDON" | "CARD" }) {
  switch (type) {
    case "wrapping": return prisma.wrappingOption.create({ data: { name: body.name, chargePaise: body.chargePaise, active: body.active ?? true } });
    case "ribbon": return prisma.ribbonOption.create({ data: { name: body.name, chargePaise: body.chargePaise, active: body.active ?? true } });
    case "extra": return prisma.extraOption.create({ data: { name: body.name, chargePaise: body.chargePaise, kind: body.kind ?? "ADDON", active: body.active ?? true } });
    default: throw badRequest("UNKNOWN_OPTION_TYPE", "Option type must be wrapping, ribbon or extra");
  }
}
async function updateOption(type: string, id: string, body: { name?: string; chargePaise?: number; active?: boolean; kind?: "ADDON" | "CARD" }) {
  switch (type) {
    case "wrapping": return prisma.wrappingOption.update({ where: { id }, data: body });
    case "ribbon": return prisma.ribbonOption.update({ where: { id }, data: body });
    case "extra": return prisma.extraOption.update({ where: { id }, data: { name: body.name, chargePaise: body.chargePaise, active: body.active, kind: body.kind } });
    default: throw badRequest("UNKNOWN_OPTION_TYPE", "Option type must be wrapping, ribbon or extra");
  }
}

/* ── delivery configuration ─────────────────────────────────────────── */
adminRouter.get("/pincodes", async (_req, res, next) => {
  try { res.json({ pincodes: await prisma.serviceablePincode.findMany({ orderBy: { pincode: "asc" } }) }); } catch (e) { next(e); }
});

adminRouter.post("/pincodes", async (req, res, next) => {
  try {
    const body = parse(z.object({ pincode: pincodeSchema, city: z.string().trim().max(120).optional(), deliveryFeePaise: paiseSchema }), req.body);
    const row = await prisma.serviceablePincode.upsert({
      where: { pincode: body.pincode },
      create: body,
      update: { city: body.city, deliveryFeePaise: body.deliveryFeePaise, active: true },
    });
    res.status(201).json({ pincode: row });
  } catch (e) { next(e); }
});

adminRouter.patch("/pincodes/:pincode", async (req, res, next) => {
  try {
    const body = parse(z.object({ deliveryFeePaise: paiseSchema.optional(), active: z.boolean().optional(), city: z.string().trim().max(120).optional() }), req.body);
    const row = await prisma.serviceablePincode.update({ where: { pincode: req.params.pincode }, data: body });
    res.json({ pincode: row });
  } catch (e) { next(e); }
});

adminRouter.get("/slots", async (_req, res, next) => {
  try { res.json({ slots: await prisma.deliverySlot.findMany({ orderBy: { sortOrder: "asc" } }) }); } catch (e) { next(e); }
});

adminRouter.post("/slots", async (req, res, next) => {
  try {
    const body = parse(z.object({ label: z.string().trim().min(2).max(60), sortOrder: z.number().int().min(0).max(100).default(0) }), req.body);
    const slot = await prisma.deliverySlot.create({ data: body });
    res.status(201).json({ slot });
  } catch (e) { next(e); }
});

adminRouter.patch("/slots/:id", async (req, res, next) => {
  try {
    const body = parse(z.object({ label: z.string().trim().min(2).max(60).optional(), sortOrder: z.number().int().min(0).max(100).optional(), active: z.boolean().optional() }), req.body);
    const slot = await prisma.deliverySlot.update({ where: { id: req.params.id }, data: body });
    res.json({ slot });
  } catch (e) { next(e); }
});

/* ── orders ─────────────────────────────────────────────────────────── */
adminRouter.get("/orders", async (req, res, next) => {
  try {
    const q = req.query;
    const orders = await prisma.order.findMany({
      where: {
        ...(typeof q.status === "string" && q.status ? { status: q.status as never } : {}),
        ...(typeof q.paymentStatus === "string" && q.paymentStatus ? { paymentStatus: q.paymentStatus as never } : {}),
        ...(typeof q.q === "string" && q.q
          ? { OR: [{ orderNumber: { contains: q.q, mode: "insensitive" } }, { recipientName: { contains: q.q, mode: "insensitive" } }, { phone: { contains: q.q } }, { pincode: { contains: q.q } }] }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { items: { select: { title: true } }, user: { select: { name: true, email: true } } },
    });
    res.json({ orders: orders.map((o) => ({ ...o, itemCount: o.items.length })) });
  } catch (e) { next(e); }
});

adminRouter.get("/orders/:orderNumber", async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { orderNumber: req.params.orderNumber }, include: { ...orderInclude, user: { select: { name: true, email: true } } } });
    if (!order) throw notFound("Order not found");
    res.json({ order });
  } catch (e) { next(e); }
});

// strict sequential fulfilment transitions
const NEXT_STATUS: Record<string, string> = {
  PLACED: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
};

adminRouter.patch("/orders/:orderNumber/status", async (req, res, next) => {
  try {
    const body = parse(z.object({ status: z.enum(["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"]), note: z.string().trim().max(300).optional() }), req.body);
    const order = await prisma.order.findUnique({ where: { orderNumber: req.params.orderNumber } });
    if (!order) throw notFound("Order not found");
    if (order.status === "CANCELLED") throw conflict("ORDER_CANCELLED", "Cancelled orders cannot be fulfilled further");
    if (NEXT_STATUS[order.status] !== body.status) {
      throw conflict("INVALID_TRANSITION", `An order in ${order.status} can only move to ${NEXT_STATUS[order.status] ?? "nowhere — it is final"}`);
    }
    const updated = await prisma.order.updateMany({
      where: { id: order.id, status: order.status },
      data: {
        status: body.status,
        // COD cash is collected at the door
        ...(body.status === "DELIVERED" && order.paymentMethod === "COD" && order.paymentStatus === "COD_PENDING" ? { paymentStatus: "COD_COLLECTED" } : {}),
      },
    });
    if (updated.count !== 1) throw conflict("RACE", "Order status changed concurrently — reload and retry");
    await prisma.orderEvent.create({ data: { orderId: order.id, status: body.status, note: body.note ?? null, actorRole: "ADMIN" } });
    const fresh = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
    res.json({ order: fresh });
  } catch (e) { next(e); }
});

adminRouter.post("/orders/:orderNumber/cancel", async (req, res, next) => {
  try {
    const { reason } = parse(z.object({ reason: z.string().trim().min(3, "Give a short reason").max(300) }), req.body);
    const order = await cancelOrder(req.params.orderNumber, null, reason, "ADMIN");
    res.json({ order });
  } catch (e) { next(e); }
});

// payment-status corrections (COD collected, verified refunds) — audited
adminRouter.patch("/orders/:orderNumber/payment-status", async (req, res, next) => {
  try {
    const body = parse(z.object({ paymentStatus: z.enum(["COD_PENDING", "COD_COLLECTED", "REFUNDED"]), note: z.string().trim().max(300).optional() }), req.body);
    const order = await prisma.order.findUnique({ where: { orderNumber: req.params.orderNumber } });
    if (!order) throw notFound("Order not found");
    if (body.paymentStatus === "REFUNDED" && order.paymentStatus !== "REFUND_REQUESTED") {
      throw conflict("INVALID_REFUND_STATE", "REFUNDED can only be set after a cancellation created a REFUND_REQUESTED (i.e. after the refund is verified in the Razorpay dashboard)");
    }
    if (body.paymentStatus === "COD_COLLECTED" && order.paymentMethod !== "COD") {
      throw conflict("INVALID_PAYMENT_STATE", "COD statuses apply only to Cash on Delivery orders");
    }
    const updated = await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: order.paymentStatus },
      data: { paymentStatus: body.paymentStatus, ...(body.note ? { refundNote: body.note } : {}) },
    });
    if (updated.count !== 1) throw conflict("RACE", "Payment status changed concurrently — reload and retry");
    await prisma.orderEvent.create({ data: { orderId: order.id, status: `PAYMENT_${body.paymentStatus}`, note: body.note ?? null, actorRole: "ADMIN" } });
    res.json({ order: await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude }) });
  } catch (e) { next(e); }
});

/* ── image uploads → persistent volume ─────────────────────────────── */
// NOTE: app.ts mounts express.raw({type:'*/*'}) on this path, so req.body
// is the raw Buffer — validated by magic bytes, never by client claims.
adminRouter.post("/uploads", async (req, res, next) => {
  try {
    const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.concat([]);
    validateUploadSize(buf);
    const { absolute, publicUrl } = safeUploadPath(buf);
    writeFileSync(absolute, buf);
    res.status(201).json({ url: publicUrl });
  } catch (e) { next(e); }
});
