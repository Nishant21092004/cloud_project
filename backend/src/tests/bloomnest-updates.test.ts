import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { estimateDemoDelivery } from "../modules/catalog/delivery.js";
import { normalizeIndianPhone, phoneSchema } from "../lib/validate.js";
import { checkServiceability } from "../modules/catalog/service.js";
import { prisma } from "../lib/prisma.js";
import { ADDRESS, agent, checkoutFlow, closeDb, mkCustomer, resetDb, seedBase } from "./helpers.js";

beforeEach(async () => { await resetDb(); await seedBase(); });
afterAll(closeDb);

describe("India-wide demo delivery estimates", () => {
  it("gives different postal regions estimates but rejects invalid PINs", () => {
    expect(estimateDemoDelivery("395007")).toBe(7500);
    expect(estimateDemoDelivery("560001")).toBe(8500);
    expect(estimateDemoDelivery("999999")).toBeNull();
    expect(estimateDemoDelivery("000000")).toBeNull();
  });
  it("lets admin-configured PIN fee override demo estimate and honors disabled PINs", async () => {
    expect((await checkServiceability("110001")).deliveryFeePaise).toBe(4000);
    expect((await checkServiceability("395007")).demoCoverage).toBe(true);
    await prisma.serviceablePincode.create({ data: { pincode: "395007", city: "Surat", active: false, deliveryFeePaise: 9900 } });
    expect((await checkServiceability("395007")).serviceable).toBe(false);
  });
});

describe("checkout usability and safe demo online payment", () => {
  it("normalizes +91 / 0 prefixed Indian mobile numbers", () => {
    expect(normalizeIndianPhone("09876543210")).toBe("9876543210");
    expect(phoneSchema.parse("+91 98765 43210")).toBe("9876543210");
    expect(phoneSchema.safeParse("123").success).toBe(false);
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
    expect(res.body.order.deliveryFeePaise).toBe(7500);
    expect(res.body.order.payments).toHaveLength(0); // no actual gateway charge
    expect((await a.get("/api/orders")).body.orders).toHaveLength(1);
  });
});
