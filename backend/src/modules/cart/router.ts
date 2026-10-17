import { Router } from "express";
import { z } from "zod";
import type { AuthedRequest } from "../../middleware/auth.js";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { badRequest, conflict, notFound } from "../../lib/errors.js";
import { parse } from "../../lib/validate.js";
import { priceCustomBouquet } from "../catalog/pricing.js";
import { getOrCreateCart, loadConfigFromInput, loadPricedCart } from "./service.js";

export const cartRouter = Router();
cartRouter.use(requireAuth); // carts are persistent per signed-in customer

cartRouter.get("/", async (req, res, next) => {
  try {
    res.json({ cart: await loadPricedCart((req as AuthedRequest).user!.id) });
  } catch (e) { next(e); }
});

const addSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("FLOWER"), flowerId: z.string().min(1), stems: z.number().int().min(1).max(24) }),
  z.object({ kind: z.literal("BOUQUET"), bouquetId: z.string().min(1), qty: z.number().int().min(1).max(20) }),
  z.object({ kind: z.literal("PLANT"), variantId: z.string().min(1), qty: z.number().int().min(1).max(20) }),
  z.object({
    kind: z.literal("CUSTOM"),
    config: z.object({
      flowers: z.array(z.object({ flowerId: z.string(), stems: z.number().int().min(1).max(24) })).min(1).max(8),
      wrappingId: z.string().nullish(),
      ribbonId: z.string().nullish(),
      extraIds: z.array(z.string()).max(6).optional(),
      greetingMessage: z.string().max(300).nullish(),
    }),
  }),
]);

cartRouter.post("/items", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const body = parse(addSchema, req.body);
    const cart = await getOrCreateCart(user.id);

    if (body.kind === "FLOWER") {
      const flower = await prisma.flower.findUnique({ where: { id: body.flowerId } });
      if (!flower || !flower.active) throw notFound("This flower is not available");
      if (flower.stockStems < body.stems) throw conflict("OUT_OF_STOCK", `Only ${flower.stockStems} stems of ${flower.name} left`);
      // merge with an existing line for the same flower
      const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, kind: "FLOWER", flowerId: flower.id } });
      const newStems = Math.min((existing?.stems ?? 0) + body.stems, 24);
      if (existing) await prisma.cartItem.update({ where: { id: existing.id }, data: { stems: newStems } });
      else await prisma.cartItem.create({ data: { cartId: cart.id, kind: "FLOWER", flowerId: flower.id, stems: newStems } });
    } else if (body.kind === "BOUQUET") {
      const bouquet = await prisma.bouquet.findUnique({ where: { id: body.bouquetId }, include: { recipe: { include: { flower: true } } } });
      if (!bouquet || !bouquet.active) throw notFound("This bouquet is not available");
      const available = bouquet.recipe.reduce((min, ri) => (ri.flower.active ? Math.min(min, Math.floor(ri.flower.stockStems / ri.stems)) : 0), Number.MAX_SAFE_INTEGER);
      if (available < body.qty) throw conflict("OUT_OF_STOCK", `Only ${available === Number.MAX_SAFE_INTEGER ? 0 : available} “${bouquet.name}” left`);
      const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, kind: "BOUQUET", bouquetId: bouquet.id } });
      const newQty = Math.min((existing?.qty ?? 0) + body.qty, available);
      if (existing) await prisma.cartItem.update({ where: { id: existing.id }, data: { qty: newQty } });
      else await prisma.cartItem.create({ data: { cartId: cart.id, kind: "BOUQUET", bouquetId: bouquet.id, qty: newQty } });
    } else if (body.kind === "PLANT") {
      const variant = await prisma.plantVariant.findUnique({ where: { id: body.variantId }, include: { plant: true } });
      if (!variant || !variant.active || !variant.plant.active) throw notFound("This plant variant is not available");
      if (variant.stock < body.qty) throw conflict("OUT_OF_STOCK", `Only ${variant.stock} left in stock`);
      const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, kind: "PLANT", plantVariantId: variant.id } });
      const newQty = Math.min((existing?.qty ?? 0) + body.qty, variant.stock);
      if (existing) await prisma.cartItem.update({ where: { id: existing.id }, data: { qty: newQty } });
      else await prisma.cartItem.create({ data: { cartId: cart.id, kind: "PLANT", plantVariantId: variant.id, qty: newQty } });
    } else {
      // CUSTOM — validated + priced by the shared engine before persisting
      const config = await loadConfigFromInput({
        flowers: body.config.flowers,
        wrappingId: body.config.wrappingId ?? null,
        ribbonId: body.config.ribbonId ?? null,
        extraIds: body.config.extraIds ?? [],
        greetingMessage: body.config.greetingMessage ?? null,
      });
      const priced = priceCustomBouquet(config);
      if (!priced.ok) throw badRequest("INVALID_BOUQUET", priced.errors[0].message, { errors: priced.errors });
      // stock pre-check (final authority remains the checkout transaction)
      for (const line of config.flowers) {
        if (line.flower.stockStems < line.stems) throw conflict("OUT_OF_STOCK", `Only ${line.flower.stockStems} stems of ${line.flower.name} left`);
      }
      const created = await prisma.customBouquet.create({
        data: {
          wrappingId: config.wrapping?.id ?? null,
          ribbonId: config.ribbon?.id ?? null,
          greetingMessage: (config.greetingMessage ?? "").trim() || null,
          flowers: { create: config.flowers.map((f) => ({ flowerId: f.flower.id, stems: f.stems })) },
          extras: { create: config.extras.map((e) => ({ extraId: e.id })) },
        },
      });
      await prisma.cartItem.create({ data: { cartId: cart.id, kind: "CUSTOM", customBouquetId: created.id, qty: 1 } });
    }

    res.status(201).json({ cart: await loadPricedCart(user.id) });
  } catch (e) { next(e); }
});

const updateSchema = z.union([
  z.object({ itemId: z.string(), stems: z.number().int().min(1).max(24) }),
  z.object({ itemId: z.string(), qty: z.number().int().min(1).max(20) }),
  z.object({
    itemId: z.string(),
    config: z.object({
      flowers: z.array(z.object({ flowerId: z.string(), stems: z.number().int().min(1).max(24) })).min(1).max(8),
      wrappingId: z.string().nullish(),
      ribbonId: z.string().nullish(),
      extraIds: z.array(z.string()).max(6).optional(),
      greetingMessage: z.string().max(300).nullish(),
    }),
  }),
]);

cartRouter.patch("/items/:itemId", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const item = await findOwnedItem(user.id, req.params.itemId);
    const body = parse(updateSchema, { ...req.body, itemId: req.params.itemId });

    if ("stems" in body) {
      if (item.kind !== "FLOWER" || !item.flowerId) throw badRequest("INVALID_UPDATE", "Only loose flowers use stems");
      const flower = await prisma.flower.findUniqueOrThrow({ where: { id: item.flowerId } });
      if (flower.stockStems < body.stems) throw conflict("OUT_OF_STOCK", `Only ${flower.stockStems} stems of ${flower.name} left`);
      await prisma.cartItem.update({ where: { id: item.id }, data: { stems: body.stems } });
    } else if ("qty" in body) {
      if (item.kind === "CUSTOM") throw badRequest("INVALID_UPDATE", "Custom bouquets are edited, not multiplied");
      const max = item.kind === "PLANT" ? (await prisma.plantVariant.findUniqueOrThrow({ where: { id: item.plantVariantId! } })).stock
        : await bouquetAvailability(item.bouquetId!);
      if (body.qty > max) throw conflict("OUT_OF_STOCK", `Only ${max} left in stock`);
      await prisma.cartItem.update({ where: { id: item.id }, data: { qty: body.qty } });
    } else {
      if (item.kind !== "CUSTOM" || !item.customBouquetId) throw badRequest("INVALID_UPDATE", "Only custom bouquets accept a config");
      const config = await loadConfigFromInput({
        flowers: body.config.flowers,
        wrappingId: body.config.wrappingId ?? null,
        ribbonId: body.config.ribbonId ?? null,
        extraIds: body.config.extraIds ?? [],
        greetingMessage: body.config.greetingMessage ?? null,
      });
      const priced = priceCustomBouquet(config);
      if (!priced.ok) throw badRequest("INVALID_BOUQUET", priced.errors[0].message, { errors: priced.errors });
      for (const line of config.flowers) {
        if (line.flower.stockStems < line.stems) throw conflict("OUT_OF_STOCK", `Only ${line.flower.stockStems} stems of ${line.flower.name} left`);
      }
      await prisma.$transaction([
        prisma.customBouquetFlower.deleteMany({ where: { customBouquetId: item.customBouquetId } }),
        prisma.customBouquetExtra.deleteMany({ where: { customBouquetId: item.customBouquetId } }),
        prisma.customBouquet.update({
          where: { id: item.customBouquetId },
          data: {
            wrappingId: config.wrapping?.id ?? null,
            ribbonId: config.ribbon?.id ?? null,
            greetingMessage: (config.greetingMessage ?? "").trim() || null,
            flowers: { create: config.flowers.map((f) => ({ flowerId: f.flower.id, stems: f.stems })) },
            extras: { create: config.extras.map((e) => ({ extraId: e.id })) },
          },
        }),
      ]);
    }
    res.json({ cart: await loadPricedCart(user.id) });
  } catch (e) { next(e); }
});

cartRouter.delete("/items/:itemId", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const item = await findOwnedItem(user.id, req.params.itemId);
    if (item.customBouquetId) await prisma.customBouquet.delete({ where: { id: item.customBouquetId } });
    await prisma.cartItem.delete({ where: { id: item.id } });
    res.json({ cart: await loadPricedCart(user.id) });
  } catch (e) { next(e); }
});

cartRouter.delete("/", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user!;
    const cart = await getOrCreateCart(user.id);
    await prisma.customBouquet.deleteMany({ where: { cartItem: { cartId: cart.id } } });
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    res.json({ cart: await loadPricedCart(user.id) });
  } catch (e) { next(e); }
});

async function findOwnedItem(userId: string, itemId: string) {
  // ownership via cart join — a customer can never touch another cart
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cart: { userId } } });
  if (!item) throw notFound("Cart item not found");
  return item;
}

async function bouquetAvailability(bouquetId: string): Promise<number> {
  const bouquet = await prisma.bouquet.findUnique({ where: { id: bouquetId }, include: { recipe: { include: { flower: true } } } });
  if (!bouquet) return 0;
  return bouquet.recipe.reduce((min, ri) => (ri.flower.active ? Math.min(min, Math.floor(ri.flower.stockStems / ri.stems)) : 0), Number.MAX_SAFE_INTEGER);
}
