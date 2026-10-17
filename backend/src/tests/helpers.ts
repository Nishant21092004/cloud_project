/**
 * Shared test helpers — clean database, deterministic catalogue, and
 * session cookies minted directly (HTTP register/login is itself tested
 * in auth.test.ts; other suites skip it to stay under the rate limit).
 */
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { SESSION_COOKIE, signSession } from "../lib/jwt.js";

export const app = createApp();

export function agent(cookie: string) {
  return {
    get: (url: string) => request(app).get(url).set("Cookie", cookie),
    post: (url: string) => request(app).post(url).set("Cookie", cookie),
    patch: (url: string) => request(app).patch(url).set("Cookie", cookie),
    delete: (url: string) => request(app).delete(url).set("Cookie", cookie),
  };
}

/** Wipe every table (FK-safe order) so each suite starts from zero. */
export async function resetDb() {
  await prisma.webhookEvent.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.orderEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.customBouquetFlower.deleteMany();
  await prisma.customBouquetExtra.deleteMany();
  await prisma.customBouquet.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  await prisma.bouquetItem.deleteMany();
  await prisma.bouquet.deleteMany();
  await prisma.plantVariant.deleteMany();
  await prisma.plant.deleteMany();
  await prisma.flower.deleteMany();
  await prisma.wrappingOption.deleteMany();
  await prisma.ribbonOption.deleteMany();
  await prisma.extraOption.deleteMany();
  await prisma.serviceablePincode.deleteMany();
  await prisma.deliverySlot.deleteMany();
}

export async function seedBase() {
  const [rose, lily] = await Promise.all([
    prisma.flower.create({
      data: { slug: "red-rose", name: "Red Rose", description: "Classic red rose, sold per stem.", colorHex: "#c0392b", imageUrl: "/images/flowers/red-rose.svg", pricePerStemPaise: 3000, stockStems: 100, lowStockThreshold: 20 },
    }),
    prisma.flower.create({
      data: { slug: "white-lily", name: "White Lily", description: "Fragrant white lily, sold per stem.", colorHex: "#f5f0e6", imageUrl: "/images/flowers/white-lily.svg", pricePerStemPaise: 8000, stockStems: 60, lowStockThreshold: 15 },
    }),
  ]);
  const [wrap, ribbon, card] = await Promise.all([
    prisma.wrappingOption.create({ data: { name: "Kraft Wrap", chargePaise: 5000, active: true } }),
    prisma.ribbonOption.create({ data: { name: "Satin Ribbon", chargePaise: 2000, active: true } }),
    prisma.extraOption.create({ data: { name: "Greeting Card", chargePaise: 3000, kind: "CARD", active: true } }),
  ]);
  const pincode = await prisma.serviceablePincode.create({ data: { pincode: "110001", city: "New Delhi", deliveryFeePaise: 4000, active: true } });
  const slot = await prisma.deliverySlot.create({ data: { label: "Morning 9–12", sortOrder: 1, active: true } });
  const plant = await prisma.plant.create({
    data: {
      slug: "money-plant", name: "Money Plant", description: "Easy indoor creeper, perfect for beginners.",
      imageUrl: "/images/plants/money-plant.svg", careWatering: "Every 5–7 days", careLight: "Indirect light", active: true,
      variants: { create: [{ potType: "Nursery", size: "M", label: "Nursery pot · Medium", pricePaise: 29900, stock: 10, active: true }] },
    },
    include: { variants: true },
  });
  return { rose, lily, wrap, ribbon, card, pincode, slot, plant, variant: plant.variants[0] };
}

let userSeq = 0;

export async function mkCustomer(name = "Test Customer", role: "CUSTOMER" | "ADMIN" = "CUSTOMER") {
  userSeq += 1;
  const user = await prisma.user.create({
    data: { name, email: `user${userSeq}@test.local`, passwordHash: "test-only-not-used", role },
  });
  return { user, cookie: `${SESSION_COOKIE}=${signSession({ sub: user.id, role: user.role })}` };
}

/** Tomorrow as YYYY-MM-DD — inside the 7-day delivery window. */
export function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export interface Priced {
  fingerprint: string;
  subtotalPaise: number;
  deliveryFeePaise: number;
}

/**
 * The real checkout dance: the first POST returns 409 PRICE_CHANGED with a
 * fresh server-computed quote (cart fingerprint + delivery fee for the
 * address); the client confirms it and the same POST succeeds.
 */
export async function checkoutFlow(
  a: ReturnType<typeof agent>,
  opts: { paymentMethod?: "COD" | "RAZORPAY" | "DEMO_ONLINE"; idemKey?: string; address?: typeof ADDRESS } = {},
) {
  const q = await a.get("/api/orders/quote");
  const slot = await prisma.deliverySlot.findFirstOrThrow();
  const send = (quote: Priced) =>
    a
      .post("/api/orders")
      .set("Idempotency-Key", opts.idemKey ?? `key_${Math.random().toString(36).slice(2)}`)
      .send({
        address: opts.address ?? ADDRESS,
        slotId: slot.id,
        deliveryDate: tomorrow(),
        paymentMethod: opts.paymentMethod ?? "COD",
        confirmPricing: quote,
      });
  const firstQuote = q.body.quote as Priced;
  const first = await send(firstQuote);
  if (first.status === 409 && first.body.error?.code === "PRICE_CHANGED") {
    const pricedQuote = first.body.error.details.quote as Priced;
    return { res: await send(pricedQuote), firstQuote, pricedQuote };
  }
  return { res: first, firstQuote, pricedQuote: firstQuote };
}

export const ADDRESS = {
  recipientName: "Test Recipient",
  phone: "9876543210",
  pincode: "110001",
  line1: "12 Rose Lane, Connaught Place",
  city: "New Delhi",
  state: "Delhi",
};

export async function closeDb() {
  await prisma.$disconnect();
}
