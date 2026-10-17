# BloomNest — Poora Workflow Simple Hinglish Mein

Ye guide isliye hai ki aap project khud chala sako aur viva mein defend kar sako.

## 1. System ek line mein

Customer website pe flowers, bouquets aur plants dekhta hai. Wo khud ka bouquet bana sakta hai (builder), cart mein daal ke COD ya online pay karke order karta hai. Admin dashboard se order deliver tak jaata hai. Sab kuch Docker containers mein chalta hai.

## 2. Ek order ka poora safar (step by step)

1. **Browse** — React SPA Nginx se serve hota hai. `/api/...` calls Nginx se backend container ko jaati hain. Catalog data PostgreSQL se aata hai (Prisma ORM).
2. **Builder** — customer flowers + quantity chunta hai. Har change pe `/api/catalog/bouquet/preview` call hota hai — **server** price nikalta hai (stems × per-stem price + wrapping + ribbon + extras). Client sirf dikhaata hai.
3. **Cart** — cart database mein persistent hai (logged-in customer ka). Har load pe lines dobara price hoti hain — matlab admin ne price badla to cart ka total turant sahi ho jaata hai.
4. **Checkout** — address (PIN serviceability check + delivery fee), slot, 7 din ke andar ki date, payment method. Frontend pehle `GET /api/orders/quote` leta hai, phir order POST karta hai `Idempotency-Key` header ke saath.
5. **Price-confirm dance** — agar quote ke baad kuch badla (fee add hui, price change hua) to server `409 PRICE_CHANGED` naye quote ke saath bhejta hai. Frontend customer ko naya total dikhata hai, confirm karta hai, dobara POST. Phir `201` order + order number (jaise `BN-261016-GJ6KZ`) + receipt.
6. **Stock cut** — order banne wale transaction mein: flowers ke stems (loose + bouquet recipes + custom bouquet sab milkar), plant variants — sab conditional decrement. Race mein haarne wala ko 409.
7. **Payment** — COD ho to `COD_PENDING`; delivery pe admin status DELIVERED karte hi `COD_COLLECTED`. Online ho to `POST /razorpay/create` → checkout.js popup → `/verify` (signature + provider check) → `PAID`. Webhook bhi same kaam karta hai — dedup ke saath.
8. **Fulfilment** — admin: PLACED → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED (strict sequence, skip impossible). Customer ko timeline dikhta hai.
9. **Cancel** — PLACED/CONFIRMED/PREPARING tak hi. Stock exactly once restore. Paid order hua to `REFUND_REQUESTED` + note; REFUNDED sirf admin tab laga sakta hai jab wo Razorpay dashboard mein refund verify kar le — hum jhootha "refunded" kabhi nahi dikhate.

## 3. Important modules (kahan kya hai)

| Module | File | Kaam |
|---|---|---|
| Pricing engine | `backend/src/modules/catalog/pricing.ts` | Pure functions — saara paisa yahin banta hai. Koi DB nahi, isliye preview/cart/checkout teeno same maths use karte hain |
| Checkout transaction | `backend/src/modules/orders/service.ts` | Idempotency, price gate, race-safe stock cut, snapshots, expiry |
| Payments | `backend/src/modules/payments/` | create/verify/webhook — sab idempotent, HMAC verified |
| Auth | `backend/src/modules/auth/` + `src/middleware/auth.ts` | bcrypt password, httpOnly JWT cookie, role check har request pe |
| Admin | `backend/src/modules/admin/router.ts` | CRUD, uploads (magic-byte check), stats (real queries), strict status transitions |
| Cart | `backend/src/modules/cart/service.ts` | Server-priced lines, fingerprint, stock issues |
| Frontend pages | `frontend/src/pages/` | Builder `BuilderPage.tsx`, checkout `CheckoutPage.tsx`, order tracking `OrderPage.tsx`, admin `pages/admin/` |

## 4. Backend kaise boot hota hai (container ke andar)

`docker-entrypoint.sh`: (1) DB reachable hai? — retry loop; (2) `prisma migrate deploy` — migrations; (3) `node dist/server.js`. Health checks: `/health/live` (process) aur `/health/ready` (DB SELECT 1). Sweeper har 60s mein expired pending online-payment orders ko cancel karke stock wapas karta hai.

## 5. Security ke 6 pillars (viva favorite)

1. **Input validation** — har route pe Zod schema; phone `[6-9]\d{9}`, pincode 6 digits.
2. **Server-side pricing** — client total/price/status/stock/role kabhi trust nahi.
3. **Ownership isolation** — customer sirf apna cart/address/order dekh sakta; har query `userId` filter ke saath.
4. **Password/session** — bcrypt hash; httpOnly SameSite cookie; HTTPS pe `secure` flag; logout cookie clear.
5. **Uploads** — magic bytes se file type check (jpg/png/webp/gif), 5 MB limit, random filename, non-root user.
6. **Rate limiting** — login 30/15min, checkout 20/min, API 600/15min; errors JSON mein, stack trace leak nahi hota production mein.

## 6. Volumes & persistence (cloud concept demo)

```bash
docker compose down     # containers gaye, volumes bache
docker compose up -d    # wapas — pura data intact (order, users, images)
docker compose down -v  # ⚠️ volumes bhi delete — demo mein kabhi mat karna
```

Backup: `./scripts/backup.sh` → DB dump (gzip) + uploads tar. Restore commands DEPLOYMENT.md mein.

## 7. Demo ke liye do-liner

```bash
docker compose up --build -d && docker compose exec backend npm run seed
bash scripts/smoke-test.sh && docker run --rm --network bloomnest_internal -v "$PWD/scripts:/s:ro" node:20-alpine node /s/e2e-live.mjs http://web:80
```
