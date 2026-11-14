# Testing Report — what ran, what passed, what is blocked

Environment: Windows 11 + Docker Desktop (containers `node:20-alpine`, `postgres:16-alpine`, `nginx:1.27-alpine`).
Date: 2026-10-16.

## 1. Automated test suite — 49 tests, 7 files, ALL PASSING

Run with:

```bash
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-test
```

Runs against an **ephemeral tmpfs PostgreSQL** — real database, real HTTP (supertest), no mocks except the Razorpay SDK client (signatures themselves are really HMAC-verified; see below). Final run:

```
 Test Files  7 passed (7)
      Tests  49 passed (49)
```

### auth.test.ts — registration, login, authorization (7 tests) ✅
- register sets httpOnly cookie, role always CUSTOMER (even when payload tries `role: "ADMIN"`)
- duplicate email → 409; login ok; wrong password & unknown email return the **same** error (no enumeration)
- admin endpoints: 401 anonymous, 403 customer, 200 admin; carts/orders require auth

### pricing.test.ts — the pricing engine, pure unit tests (8 tests) ✅
- the spec example: 5×₹30 + 3×₹80 + ₹50 wrap + ₹20 ribbon = **₹460** (46000 paise)
- duplicate flowers merge; min/max stems; per-flower cap; inactive items rejected
- greeting message requires a card; message length cap; integer-paise arithmetic

### signatures.test.ts — real HMAC verification (5 tests) ✅
- checkout signature accepts correct `order|payment` HMAC; rejects wrong-secret forgeries and swapped fields
- webhook signature accepts exact raw-body HMAC; rejects tampered bodies

### checkout.test.ts — orders & concurrency (7 tests) ✅
- plant + custom bouquet in ONE order: ₹299 + (5×30 + 3×80 + 50 + 20) + ₹40 delivery; snapshots stored; stems deducted exactly (100→95, 60→57, variant 10→9); cart emptied
- builder rules rejected server-side (min stems → INVALID_BOUQUET)
- **manipulated totals**: admin changes rose price after quote → replaying old totals → 409 PRICE_CHANGED; confirming fresh quote succeeds at the NEW price; forged `subtotalPaise: 1` rejected
- unserviceable PIN → 409 NOT_SERVICEABLE
- **concurrent last-item race**: 4 simultaneous checkouts for stock 1 → exactly 1 × 201, 3 × 409, stock 0, one order
- **idempotency**: same Idempotency-Key replay → same order (`replayed: true`), stock deducted once

### payments.test.ts — gateway flows, Razorpay SDK mocked (12 tests) ✅
- `/razorpay/create` idempotent (one gateway order reused, one payment row); stranger's order → 404
- verify: invalid signature → 400 INVALID_SIGNATURE; provider says not captured → 400 PAYMENT_NOT_CONFIRMED; verified → PAID once, repeated callback → `already:true` with NO duplicate events
- late payment after cancellation → 409 PAYMENT_AFTER_CANCELLATION, payment LATE, order stays CANCELLED, stock untouched
- webhook: bad signature rejected; captured → PAID; **duplicate delivery → deduped** (single event); payment.failed recorded without marking order paid; late webhook never revives the cancelled order
- expiry sweeper: TTL passed → order CANCELLED, stock restored exactly once (sweep twice = no double restore), payment EXPIRED

### lifecycle.test.ts — cancellation, isolation, admin workflow (7 tests) ✅
- **customer isolation**: intruder gets 404 on GET/cancel/pay of someone else's order; address isolation
- cancellation restores stock exactly once; double-cancel → 409; custom-bouquet stems restored **from the snapshot** even after the flower was renamed & repriced; old order keeps original name/price
- full customer→admin workflow: skip-step rejected (INVALID_TRANSITION); PLACED→CONFIRMED→PREPARING→OUT_FOR_DELIVERY→DELIVERED; COD auto-collected at the door; customer sees the full timeline; delivered orders cannot be cancelled (customer or admin)
- admin cancel restores stock; COD cannot be marked REFUNDED; stats computed from real records (cancelled order adds ₹0 revenue)
- admin filters: by status, by phone/PIN search

### recommendations.test.ts — rule-based "You may also like" (3 tests) ✅
- flowers: same species family first — in-stock `rose-pink` ranks above out-of-stock `rose-white` despite less stock; most-stocked flowers fill the remaining slots; self always excluded; card `gallery` = same-family images
- bouquets: self excluded; in-stock + closest price first
- plants: same care-light first, then others; unknown slug → 404

## 2. Live stack verification (docker compose up --build) ✅

| Check | Result |
|---|---|
| `docker compose build` — db + backend + web images | ✅ built |
| Stack boots; backend applies migrations on start | ✅ healthy |
| `npm run seed` in container: 56 flowers, 50 plants, 6 bouquets, 125 serviceable PIN codes | ✅ |
| `scripts/smoke-test.sh` (8 public checks through Nginx) | ✅ 8/8 PASS |
| `scripts/e2e-live.mjs` — 19-step HTTP walkthrough: register → build bouquet → PRICE_CHANGED dance → COD order → admin timeline to DELIVERED → COD_COLLECTED → sandbox online payment → honest refund request → stranger denied | ✅ 19/19 PASS (orders `BN-261114-HE6F3`, `BN-261114-S8HER`) |
| `GET /api/catalog/products/rose-red/related` — same-family roses first, each with a same-family gallery | ✅ verified (rose-pink → white/yellow/peach) |
| **Persistence across container recreation**: `docker compose down` + `up -d` (volumes kept) → order, catalogue and revenue stats intact | ✅ verified (same order number still DELIVERED; revenue ₹360 from real records) |

## 3. Blocked / not verifiable locally — honest list

| Item | Why | What IS covered instead |
|---|---|---|
| Real Razorpay payment end-to-end (real checkout.js popup, real capture, real webhook delivery) | Needs real Razorpay **test API keys** — none were configured for this run | Full flow tested with the SDK mocked: signature verification is REAL HMAC (signatures.test.ts), all transitions idempotent. Paste test keys into `.env`, add the webhook URL, and the same code path goes live |
| Refund execution | Real refunds happen in the Razorpay dashboard; the API honestly refuses to mark REFUNDED unless an admin confirms after verifying (tested) | REFUND_REQUESTED state + refundNote + admin-only REFUNDED gate |
| Public HTTPS URL | No cloud VM was provisioned for this submission | Exact VM + HTTPS + firewall + backup steps in DEPLOYMENT.md; all images build and run locally |
| Multi-instance behavior (Redis limiter, LB) | Out of scope for single-VM | Documented as future work in DEPLOYMENT.md §7 |

## 4. Known non-issues

- Prisma prints a deprecation warning about `package.json#prisma` (Prisma 7 config change) — harmless on Prisma 6.
- `npm audit` may report dev-tool advisories (Vite/Vitest) — they do not ship in the production images (multi-stage build excludes devDependencies).
