#!/usr/bin/env node
/**
 * Live end-to-end walkthrough: customer builds a custom bouquet, checks out
 * with COD, and the admin drives the order to DELIVERED — all over HTTP.
 *
 *   node scripts/e2e-live.mjs [base-url]      # default http://web:80 (inside compose)
 *   from the host: node scripts/e2e-live.mjs http://localhost:80
 */
const base = process.argv[2] ?? "http://web:80";
const jar = {}; // one cookie jar per actor

async function call(actor, method, path, body, extraHeaders = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(jar[actor] ? { Cookie: jar[actor] } : {}),
      ...extraHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) jar[actor] = setCookie.split(";")[0];
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = data?.error ?? {};
    return { status: res.status, code: err.code, message: err.message, details: err.details };
  }
  return { status: res.status, ...data };
}

const step = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) process.exitCode = 1;
};

const email = `e2e_${Date.now()}@test.local`;

/* 1 ── customer registration (always CUSTOMER) */
const reg = await call("customer", "POST", "/api/auth/register", { name: "E2E Customer", email, password: "E2ePass@123" });
step("register customer", reg.status === 201 && reg.user?.role === "CUSTOMER", email);

/* 2 ── browse catalogue + builder options */
const flowers = await call("customer", "GET", "/api/catalog/flowers");
const options = await call("customer", "GET", "/api/catalog/options");
const [f1, f2] = flowers.flowers.slice(0, 2);
const wrap = options.wrappings[0];
const ribbon = options.ribbons[0];
step("catalogue available", Boolean(f1 && f2 && wrap && ribbon), `${flowers.flowers.length} flowers`);

/* 3 ── build a custom bouquet: 5 of flower1 + 3 of flower2 + wrap + ribbon */
const add = await call("customer", "POST", "/api/cart/items", {
  kind: "CUSTOM",
  config: { flowers: [{ flowerId: f1.id, stems: 5 }, { flowerId: f2.id, stems: 3 }], wrappingId: wrap.id, ribbonId: ribbon.id },
});
step("custom bouquet added to cart", add.status === 201);

const expectedStemsPaise = 5 * f1.pricePerStemPaise + 3 * f2.pricePerStemPaise + wrap.chargePaise + ribbon.chargePaise;

/* 4 ── checkout: quote → PRICE_CHANGED carries the delivery fee → confirm → 201 */
const quote = await call("customer", "GET", "/api/orders/quote");
step("quote subtotal matches stem math", quote.quote?.subtotalPaise === expectedStemsPaise, `₹${expectedStemsPaise / 100}`);

const slots = await call("customer", "GET", "/api/catalog/delivery-slots");
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const address = { recipientName: "E2E Recipient", phone: "9876543210", pincode: "110001", line1: "1 Test Lane", city: "New Delhi", state: "Delhi" };

const idem = `e2e_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const first = await call("customer", "POST", "/api/orders", {
  address, slotId: slots.slots[0].id, deliveryDate: tomorrow, paymentMethod: "COD",
  confirmPricing: quote.quote,
}, { "Idempotency-Key": idem });
step("first POST returns PRICE_CHANGED with real fee", first.status === 409 && first.code === "PRICE_CHANGED", `fee ₹${(first.details?.quote?.deliveryFeePaise ?? 0) / 100}`);
if (first.status !== 409) console.log("      first POST response:", JSON.stringify(first).slice(0, 400));

const order = await call("customer", "POST", "/api/orders", {
  address, slotId: slots.slots[0].id, deliveryDate: tomorrow, paymentMethod: "COD",
  confirmPricing: first.details.quote,
}, { "Idempotency-Key": idem });
step("order created", order.status === 201, order.order?.orderNumber);

/* 5 ── admin walks the order to DELIVERED (COD collected at the door) */
const adminLogin = await call("admin", "POST", "/api/auth/login", { email: "admin@bloomnest.test", password: "Admin@1234" });
step("admin login", adminLogin.status === 200 && adminLogin.user?.role === "ADMIN");

for (const next of ["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"]) {
  const r = await call("admin", "PATCH", `/api/admin/orders/${order.order.orderNumber}/status`, { status: next });
  step(`admin → ${next}`, r.status === 200 && r.order?.status === next);
}

/* 6 ── customer sees the finished order */
const done = await call("customer", "GET", `/api/orders/${order.order.orderNumber}`);
step(
  "customer sees DELIVERED + COD_COLLECTED + timeline",
  done.order?.status === "DELIVERED" && done.order?.paymentStatus === "COD_COLLECTED" && done.order.events.length >= 5,
);

/* 7 ── customer isolation: another account cannot read this order */
await call("stranger", "POST", "/api/auth/register", { name: "Stranger", email: `s_${email}`, password: "E2ePass@123" });
const peek = await call("stranger", "GET", `/api/orders/${order.order.orderNumber}`);
step("stranger denied access to the order", peek.status === 404);

console.log(`\nORDER_NUMBER=${order.order?.orderNumber ?? "NONE"}`);
