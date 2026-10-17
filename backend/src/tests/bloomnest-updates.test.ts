import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { estimateDemoDelivery, estimateIndiaDelivery, listDeliveryCircles } from "../modules/catalog/pincode-data.js";
import { normalizeIndianPhone, phoneSchema } from "../lib/validate.js";
import { checkServiceability } from "../modules/catalog/service.js";
import { prisma } from "../lib/prisma.js";
import { ADDRESS, agent, checkoutFlow, closeDb, mkCustomer, resetDb, seedBase } from "./helpers.js";

beforeEach(async () => { await resetDb(); await seedBase(); });
afterAll(closeDb);

describe("India-wide delivery coverage", () => {
  it("resolves a named sorting district from the first three PIN digits", () => {
    const surat = estimateIndiaDelivery("395007");
    expect(surat).not.toBeNull();
    expect(surat?.city).toBe("Surat");
    expect(surat?.state).toBe("Gujarat");
    expect(surat?.hub).toBe(true); // dispatch hub → cheaper and same/next-day
    expect(surat?.feePaise).toBe(4500); // ₹65 circle − ₹20 hub
    expect(surat?.etaDaysMin).toBe(1);
  });

  it("still prices a district it has no city row for (circle + 10)", () => {
    const shimla = estimateIndiaDelivery("577001"); // Shivamogga region, unmapped prefix
    expect(shimla?.feePaise).toBe(8500); // ₹75 circle + ₹10 no-city
    expect(shimla?.city).toContain("577xx");
  });

  it("adds days and a surcharge for hilly and island lanes", () => {
    const portBlair = estimateIndiaDelivery("744101");
    expect(portBlair?.remote).toBe(true);
    expect(portBlair?.feePaise).toBe(11500); // ₹85 + ₹0 city + ₹30 remote
    expect(portBlair?.etaDaysMax).toBeGreaterThan(6);
  });

  it("rejects unusable PINs instead of guessing", () => {
    expect(estimateDemoDelivery("999999")).toBeNull(); // Army / APO mail
    expect(estimateDemoDelivery("000000")).toBeNull();
    expect(estimateDemoDelivery("11001")).toBeNull();   // not six digits
    expect(estimateDemoDelivery("39a007")).toBeNull();
  });

  it("documents every circle 1–8 for the public coverage page", () => {
    const circles = listDeliveryCircles();
    expect(circles).toHaveLength(8);
    expect(circles.map((c) => c.firstDigit).join("")).toBe("12345678");
    expect(circles.find((c) => c.firstDigit === "3")?.cities.some((x) => x.city.includes("Surat"))).toBe(true);
  });

  it("lets an admin-configured PIN row win, including a disabled zone", async () => {
    expect((await checkServiceability("110001")).deliveryFeePaise).toBe(4000); // seedBase row
    const demo = await checkServiceability("395007");
    expect(demo.demoCoverage).toBe(true);
    expect(demo.serviceable).toBe(true);
    expect(demo.city).toBe("Surat");

    await prisma.serviceablePincode.create({ data: { pincode: "395007", city: "Surat", active: false, deliveryFeePaise: 9900 } });
    const off = await checkServiceability("395007");
    expect(off.serviceable).toBe(false);
    expect(off.disabledByAdmin).toBe(true);
  });
});

describe("search never dead-ends", () => {
  it("reports an unlisted variety as out of stock with research, not 'no results'", async () => {
    const res = await agent((await mkCustomer()).cookie).get("/api/catalog/flowers?q=Blue%20Moon%20Unicorn%20Lily");
    expect(res.status).toBe(200);
    expect(res.body.flowers).toHaveLength(0);
    expect(res.body.meta.unavailable.term).toBe("Blue Moon Unicorn Lily");
    // "lily" is a word we do stock → the UI gets something to offer
    expect(res.body.meta.unavailable.similar.some((row: { name: string }) => /lily/i.test(row.name))).toBe(true);
  });

  it("points at the other department when the item exists there", async () => {
    const res = await agent((await mkCustomer()).cookie).get("/api/catalog/flowers?q=money%20plant");
    expect(res.body.flowers).toHaveLength(0);
    expect(res.body.meta.unavailable.foundIn).toBe("plants");
    expect(res.body.meta.unavailable.foundInName).toContain("Money Plant");
  });
});

describe("checkout usability and safe demo online payment", () => {
  it("normalizes +91 / 0 prefixed Indian mobile numbers", () => {
    expect(normalizeIndianPhone("09876543210")).toBe("9876543210");
    expect(phoneSchema.parse("+91 98765 43210")).toBe("9876543210");
    expect(phoneSchema.safeParse("123").success).toBe(false);
  });

  it("reports the simulated gateway as always-available and never as real money", async () => {
    const res = await agent((await mkCustomer()).cookie).get("/api/payments/config");
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(false);            // no Razorpay keys in tests
    expect(res.body.demoOnline.enabled).toBe(true);  // prepaid path always demonstrable
    expect(res.body.demoOnline.simulated).toBe(true);
  });

  it("places a Pan-India demo order exactly once, without marking actual money collected", async () => {
    const { cookie } = await mkCustomer();
    const a = agent(cookie);
    const variant = await prisma.plantVariant.findFirstOrThrow();
    expect((await a.post("/api/cart/items").send({ kind: "PLANT", variantId: variant.id, qty: 1 })).status).toBe(201);
    const { res } = await checkoutFlow(a, {
      paymentMethod: "DEMO_ONLINE", idemKey: "new_demo_online_123",
      address: { ...ADDRESS, pincode: "395007", phone: "09876543210", city: "Surat", state: "Gujarat" },
    });
    expect(res.status).toBe(201);
    expect(res.body.order.paymentMethod).toBe("DEMO_ONLINE");
    expect(res.body.order.paymentStatus).toBe("DEMO_PAID");
    expect(res.body.order.phone).toBe("9876543210");
    expect(res.body.order.deliveryFeePaise).toBe(4500); // Surat hub lane
    expect(res.body.order.payments).toHaveLength(0); // no actual gateway charge
    expect((await a.get("/api/orders")).body.orders).toHaveLength(1);
  });

  it("records the simulated method as a demo payment row, never as collected revenue", async () => {
    const { cookie } = await mkCustomer();
    const a = agent(cookie);
    const variant = await prisma.plantVariant.findFirstOrThrow();
    await a.post("/api/cart/items").send({ kind: "PLANT", variantId: variant.id, qty: 1 });
    const { res } = await checkoutFlow(a, { paymentMethod: "DEMO_ONLINE", idemKey: "demo_record_key_1" });
    const orderNumber = res.body.order.orderNumber as string;

    const first = await a.post("/api/payments/demo/record").send({ orderNumber, method: "upi" });
    expect(first.status).toBe(201);
    const replay = await a.post("/api/payments/demo/record").send({ orderNumber, method: "upi" });
    expect(replay.body.replayed).toBe(true);

    const order = (await a.get(`/api/orders/${orderNumber}`)).body.order;
    expect(order.payments).toHaveLength(1);
    expect(order.payments[0].provider).toBe("demo");
    expect(order.payments[0].status).toBe("SIMULATED");
    expect(order.paymentStatus).toBe("DEMO_PAID");

    // DEMO_PAID must never be mistaken for verified money by the revenue query
    const collected = await prisma.order.count({ where: { paymentStatus: { in: ["PAID", "COD_COLLECTED"] } } });
    expect(collected).toBe(0);
  });

  it("refuses to record a demo payment on a Cash-on-Delivery order", async () => {
    const { cookie } = await mkCustomer();
    const a = agent(cookie);
    const variant = await prisma.plantVariant.findFirstOrThrow();
    await a.post("/api/cart/items").send({ kind: "PLANT", variantId: variant.id, qty: 1 });
    const { res } = await checkoutFlow(a, { paymentMethod: "COD", idemKey: "cod_order_key_1" });
    const bad = await a.post("/api/payments/demo/record").send({ orderNumber: res.body.order.orderNumber, method: "upi" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("NOT_DEMO_ORDER");
  });

  it("rejects a checkout to a PIN outside the coverage model", async () => {
    const { cookie } = await mkCustomer();
    const a = agent(cookie);
    const variant = await prisma.plantVariant.findFirstOrThrow();
    await a.post("/api/cart/items").send({ kind: "PLANT", variantId: variant.id, qty: 1 });
    const { res } = await checkoutFlow(a, {
      paymentMethod: "COD", idemKey: "cod_order_key_2",
      address: { ...ADDRESS, pincode: "999999" },
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("NOT_SERVICEABLE");
  });

  it("accepts the fallback slot when a database has no delivery slots configured", async () => {
    await prisma.deliverySlot.deleteMany();
    const slots = await agent((await mkCustomer()).cookie).get("/api/catalog/delivery-slots");
    expect(slots.body.slots).toEqual([{ id: "default", label: "Any time (9 AM – 8 PM)" }]);
  });
});
