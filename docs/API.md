# BloomNest API Reference

Base URL: `/api` (same origin, served through Nginx).
Auth: **httpOnly cookie session** (`bn_session`, JWT). Send credentials with every request (`fetch(..., { credentials: "include" })`).
Errors are always JSON:

```json
{ "error": { "code": "PRICE_CHANGED", "message": "…", "details": { } } }
```

Common error codes: `VALIDATION_ERROR` (400) · `UNAUTHORIZED` (401) · `FORBIDDEN` (403) · `NOT_FOUND` (404) · `EMAIL_TAKEN`/`DUPLICATE` (409) · `RATE_LIMITED` (429).

---

## Auth — `/api/auth`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/register` | — | `{name, email, password, phone?}` → creates **CUSTOMER** always; 409 `EMAIL_TAKEN`; sets cookie |
| POST | `/login` | — (rate-limited 30/15 min) | `{email, password}` → user + cookie; uniform `INVALID_CREDENTIALS` (no account enumeration) |
| POST | `/logout` | — | clears cookie |
| GET | `/me` | session | current user or 401 |

Admins are created only via the server CLI: `docker compose exec backend npm run create-admin -- <email> <password> <name>`.

## Catalog — `/api/catalog` (public)

| Method | Path | Notes |
|---|---|---|
| GET | `/flowers?q&color&minPrice&maxPrice&inStock&sort` | per-stem flowers; `sort` ∈ newest, price_asc, price_desc, name. Response is `{flowers, meta:{total, returned, unavailable?}}` |
| GET | `/bouquets?…` · `/plants?…` | same shape: `{bouquets, meta}` / `{plants, meta}` |
| GET | `/search?q` | all three collections at once (top 12 each) + `meta` |
| GET | `/bouquets?…` | availability computed from recipe stems |
| GET | `/plants?…` | includes variants (pot × size) with per-variant price/stock |
| GET | `/products/:slug` | one product of any type |
| GET | `/options` | active wrappings, ribbons, extras (for the builder) |
| GET | `/delivery-slots` | active slots |
| GET | `/unavailable?q&category` | the **out-of-stock** answer for a term we do not stock: `{term, image, category, priceHintPaise?, similar[]}`. Never a 404 — a miss is a merchandising result, not an error |
| GET | `/delivery-coverage` | `{circles:[{name,states:[{name,capital,feePaise,etaDaysMin,etaDaysMax}],…}], configuredPincodes:[]}` — drives the `/delivery` page |
| GET | `/serviceability/:pincode` | `{serviceable, deliveryFeePaise, etaDaysMin, etaDaysMax, city, state, circle, reason?}`. Leading digit `0`/`9` or malformed → `{serviceable:false, reason:"NOT_SERVICEABLE"}`. An admin `ServiceablePincode` row always wins (`active:false` = deliberately off-limits) |
| POST | `/bouquet/preview` | `{flowers:[{flowerId,stems}], wrappingId?, ribbonId?, extraIds?, greetingMessage?}` → **server-priced** bill or `errors[]` |

Builder rules enforced server-side: 6–50 total stems, ≤24 per flower, ≤8 varieties, ≤200-char message, message requires a greeting card.

## Cart — `/api/cart` (session)

| Method | Path | Body |
|---|---|---|
| GET | `/` | — → priced cart + `fingerprint` + per-line `issues[]` |
| POST | `/items` | `{kind:"FLOWER", flowerId, stems}` · `{kind:"BOUQUET", bouquetId, qty}` · `{kind:"PLANT", variantId, qty}` · `{kind:"CUSTOM", config:{…}}` (validated + priced server-side) |
| PATCH | `/items/:id` | `{stems}` / `{qty}` / `{config}` (replaces the custom bouquet) |
| DELETE | `/items/:id` | — |
| DELETE | `/` | clear cart (including custom bouquets) |

## Orders — `/api/orders` (session)

| Method | Path | Notes |
|---|---|---|
| GET | `/quote` | fresh server quote: fingerprint, subtotal (delivery fee 0 — address not chosen yet) |
| POST | `/` | **checkout**. Headers: `Idempotency-Key: <random ≥8 chars>`. Body: `{addressId? | address{recipientName,phone,pincode,line1,line2?,city,state}, slotId, deliveryDate(YYYY-MM-DD, ≤7 days ahead), paymentMethod: COD\|DEMO_ONLINE\|RAZORPAY, confirmPricing:{fingerprint, subtotalPaise, deliveryFeePaise}}`. → `201 {order}` or `409 PRICE_CHANGED` with `details.quote` (re-POST with it to confirm) or `409 OUT_OF_STOCK` with `details.issues`. Replays return `200 {order, replayed:true}` |
| GET | `/` | own orders (summary) |
| GET | `/:orderNumber` | own order, full detail (items with snapshots, timeline, payments). **404 for anyone else's order** |
| POST | `/:orderNumber/cancel` | `{reason?}` — only while PLACED/CONFIRMED/PREPARING; restores stock exactly once; PAID → `REFUND_REQUESTED` + refundNote |
| GET/POST | `/api/addresses` | own address book; DELETE `/api/addresses/:id` |

## Payments — `/api/payments`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/config` | — | `{enabled, keyId, demoOnline:{enabled, simulated:true, note}, methods:["COD","DEMO_ONLINE","RAZORPAY"]}` — the storefront renders exactly these methods, so no option is ever hard-coded |
| POST | `/demo/record` | session | `{orderNumber, method}` — marks a `DEMO_ONLINE` order `DEMO_PAID`. Refused for real gateway orders; idempotent via a `provider:"demo"`, `status:"SIMULATED"` payment row (second call → `{replayed:true}`). **No money moves.** |
| POST | `/razorpay/create` | session | `{orderNumber}` → gateway order id; **idempotent** (reuses existing) |
| POST | `/razorpay/verify` | session | checkout.js callback `{orderNumber, razorpay_order_id, razorpay_payment_id, razorpay_signature}` — signature AND provider-capture verified; repeated calls → `{paid:true, already:true}`; after cancellation → 409 `PAYMENT_AFTER_CANCELLATION` (recorded LATE) |
| POST | `/razorpay/webhook` | HMAC header | raw-body signature `x-razorpay-signature`; handles `payment.captured`, `order.paid`, `payment.failed`; duplicate deliveries → `{duplicate:true}` |

`DEMO_ONLINE` is a classroom-only method: the order is created `PENDING_PAYMENT` → `DEMO_PAID` after `/demo/record`, is never counted as collected revenue, and cancels without a refund note because nothing was charged.

An order is marked **PAID only after a verified confirmation**. No code path displays a completed refund that wasn't verified (REFUNDED is admin-set, only after REFUND_REQUESTED, with a note).

## Admin — `/api/admin` (ADMIN role, enforced server-side)

| Method | Path | Notes |
|---|---|---|
| GET | `/stats` | orders today/total/delivered, pending payments, revenue collected (PAID+COD_COLLECTED, non-cancelled), orders by status, low stock |
| GET/POST | `/flowers` · PATCH `/flowers/:id` | create/edit/archive flowers (price in paise) |
| GET/POST | `/bouquets` · PATCH `/bouquets/:id` | includes `recipe:[{flowerId, stems}]` — replaced atomically |
| GET/POST | `/plants` · PATCH `/plants/:id` | plant + variants (create) |
| PATCH | `/plant-variants/:id` | price/stock/label/active per variant |
| GET/POST | `/options` · POST/PATCH `/options/:type/:id` | type ∈ wrapping, ribbon, extra |
| GET/POST | `/pincodes` · PATCH `/pincodes/:pincode` | serviceability + delivery fee |
| GET/POST | `/slots` · PATCH `/slots/:id` | delivery slots |
| GET | `/orders?status&paymentStatus&q` | filter/search (order number, name, phone, PIN) |
| GET | `/orders/:orderNumber` | full detail incl. customer |
| PATCH | `/orders/:orderNumber/status` | `{status}` — strict next-step only; DELIVERED auto-collects COD |
| POST | `/orders/:orderNumber/cancel` | `{reason}` (required) — restores stock once |
| PATCH | `/orders/:orderNumber/payment-status` | `{paymentStatus: COD_PENDING\|COD_COLLECTED\|REFUNDED, note?}` — REFUNDED only from REFUND_REQUESTED |
| POST | `/uploads` | raw image bytes (magic-byte sniffed, ≤5 MB) → `{url}` on the persistent uploads volume |

## Health

| Path | Notes |
|---|---|
| GET `/health/live` | process up (docker healthcheck) |
| GET `/health/ready` | also checks `SELECT 1` on PostgreSQL → 503 when the DB is down |
