# BloomNest Architecture

## 1. System overview

```mermaid
flowchart LR
    subgraph Client
        B["Browser (React SPA)"]
    end
    subgraph "Docker host (single Linux VM)"
        subgraph "bloomnest_internal network (private)"
            N["web — nginx:1.27-alpine\nserves SPA + reverse proxy\nonly PUBLIC port (:80)"]
            A["backend — node:20-alpine\nExpress + Prisma\nport 4000 (internal)"]
            D[("db — postgres:16-alpine\nport 5432 (internal)\nvolume: db_data")]
            U[("uploads volume\nadmin product images")]
        end
    end
    R["Razorpay (optional, test mode)"]
    B -->|"HTTP :80"| N
    N -->|"static files"| B
    N -->|"/api/* , /uploads/*"| A
    A -->|"SQL (Prisma)"| D
    A --- U
    A -.->|"orders.create / payments.fetch\nHMAC-verified callbacks"| R
    R -.->|"webhook (raw-body HMAC)"| A
```

Key points:

- **Only nginx is published.** The database and API live on the private `bloomnest_internal` bridge network and cannot be reached from outside the VM.
- The SPA calls **same-origin relative paths** (`/api/...`), so no CORS complexity and no keys in the bundle.
- State lives in **two named volumes**: `db_data` (PostgreSQL) and `uploads` (uploaded images) — both survive container recreation.

## 2. Backend module layout

```
src/
├─ config/env.ts        zod-validated environment (boot fails fast on bad config)
├─ lib/                 prisma client, JWT, validation schemas, image sniffing,
│                       order-number + fingerprint generators, AppError helpers
├─ middleware/          requireAuth / requireAdmin, rate limits, request logger,
│                       central JSON error handler (no stack leaks)
└─ modules/
   ├─ auth/             register (always CUSTOMER), login, logout, me
   ├─ catalog/          public reads + THE PRICING ENGINE (pure functions)
   ├─ cart/             persistent cart; every load is re-priced server-side
   ├─ orders/           checkout transaction, quotes, cancel, expiry sweeper
   ├─ payments/         Razorpay create/verify/webhook — all idempotent
   └─ admin/            stats, catalogue CRUD, uploads, fulfilment, refunds
```

The pricing engine (`modules/catalog/pricing.ts`) is **pure** — no database — so the live builder preview, the cart, and checkout all call the exact same function and can never disagree about a total.

## 3. The checkout transaction (the heart)

```mermaid
sequenceDiagram
    participant C as Customer (browser)
    participant O as orders/service
    participant DB as PostgreSQL

    C->>O: POST /api/orders (Idempotency-Key, address, slot, confirmPricing)
    O->>DB: replay? (IdempotencyKey.orderId) → return SAME order
    O->>DB: resolve address → PIN serviceable? fee? slot valid? date ≤ 7 days?
    O->>DB: load cart, re-price EVERY line from live catalogue data
    O->>O: stock issues? → 409 OUT_OF_STOCK
    O->>O: fingerprint/total mismatch? → 409 PRICE_CHANGED (+ fresh quote)
    O->>DB: claim Idempotency-Key (unique) — races get CHECKOUT_IN_PROGRESS
    O->>DB: TRANSACTION:
    Note right of DB: aggregate stems needed (loose + recipes + customs)<br/>conditional UPDATE … WHERE stock >= need (count!=1 → rollback)<br/>create Order + snapshot OrderItems + Payment row<br/>empty cart
    O->>DB: link IdempotencyKey.orderId
    O-->>C: 201 { order }
```

Guarantees:

1. **No overselling** — `UPDATE … SET stock = stock − n WHERE stock >= n` inside the transaction; the loser of the race gets 409 and a rollback.
2. **No duplicate orders** — the idempotency key is claimed before the transaction and linked to the order after; retries replay.
3. **No stale totals** — a cart fingerprint (SHA-256 over lines + server prices) must match; otherwise the client must confirm the fresh quote.
4. **History is immutable** — order lines store their own price + composition snapshots.

## 4. Payment state machine

```mermaid
stateDiagram-v2
    [*] --> PENDING : COD order / Razorpay order placed
    PENDING --> PAID : /verify (sig + provider fetch) or webhook, guarded UPDATE
    PENDING --> FAILED : payment.failed webhook
    PENDING --> EXPIRED : sweeper (TTL 30 min) → order CANCELLED, stock restored
    PENDING --> CANCELLED : order cancelled while unpaid
    PAID --> REFUND_REQUESTED : cancellation of a PAID order (refundNote)
    REFUND_REQUESTED --> REFUNDED : admin, only after verifying in Razorpay dashboard
    COD_PENDING --> COD_COLLECTED : automatic at DELIVERED (or admin correction)
```

- Payment status is a **separate column** from fulfilment status — they move independently.
- A late payment after cancellation is recorded as `LATE` + `PAYMENT_LATE` event; the order is **never revived**.
- Repeated verified callbacks/webhooks are absorbed by guarded transitions (`UPDATE … WHERE paymentStatus='PENDING'`) and the `WebhookEvent` dedup table.

## 5. Fulfilment timeline (strict sequence)

`PLACED → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED`

The admin API enforces the exact next status (`INVALID_TRANSITION` otherwise). `DELIVERED` on a COD order automatically sets `COD_COLLECTED`. `CANCELLED` is reachable only from the first three stages and restores stock exactly once.

## 6. Database model (main relationships)

```mermaid
erDiagram
    USER ||--o{ ADDRESS : has
    USER ||--|| CART : has
    CART ||--o{ CART_ITEM : contains
    CART_ITEM }o--|| FLOWER : "kind=FLOWER"
    CART_ITEM }o--|| BOUQUET : "kind=BOUQUET"
    CART_ITEM }o--|| PLANT_VARIANT : "kind=PLANT"
    CART_ITEM ||--o| CUSTOM_BOUQUET : "kind=CUSTOM"
    CUSTOM_BOUQUET ||--o{ CUSTOM_BOUQUET_FLOWER : ""
    CUSTOM_BOUQUET ||--o{ CUSTOM_BOUQUET_EXTRA : ""
    FLOWER ||--o{ BOUQUET_ITEM : "used in"
    BOUQUET ||--o{ BOUQUET_ITEM : "recipe"
    PLANT ||--o{ PLANT_VARIANT : "pot × size"
    USER ||--o{ ORDER : places
    ORDER ||--o{ ORDER_ITEM : ""
    ORDER ||--o{ ORDER_EVENT : timeline
    ORDER ||--o{ PAYMENT : ""
    ORDER ||--o{ IDEMPOTENCY_KEY : claims
    PAYMENT ||--o{ WEBHOOK_EVENT : dedups

    USER { string role "CUSTOMER|ADMIN" }
    FLOWER { int stockStems  int pricePerStemPaise }
    PLANT_VARIANT { int stock  int pricePaise  string potType  string size }
    ORDER { string orderNumber  int totalPaise  enum status  enum paymentStatus  datetime expiresAt  bool stockRestored }
    ORDER_ITEM { json customSnapshot "price+composition snapshot" }
```

22 tables total. Notable choices:

- **Stock lives at the leaf**: `Flower.stockStems` (per stem) and `PlantVariant.stock` (per pot/size). Bouquets own no stock — they consume recipe stems, so availability is always computed.
- `CustomBouquet` is a real entity (1:1 with a cart item) so the builder can be edited later.
- `OrderItem.customSnapshot` (JSON) freezes exactly what the customer configured and what it cost.
- `WebhookEvent.eventId` unique + `IdempotencyKey(userId,key)` unique + `Payment.rzpPaymentId` unique give idempotency at three layers.

## 7. Frontend structure

- `src/api/client.ts` — one fetch wrapper (credentials: include, typed, `ApiError` with server codes).
- Contexts: `AuthContext` (session), `ToastContext` (feedback).
- Pages: Home, Catalog (flowers/bouquets/plants share one filterable page), Product, **Builder** (live 2D SVG preview + server-priced bill), Cart, Checkout, Login/Register, Orders, Order detail (timeline + cancel + pay-now), Admin (dashboard/products/orders/settings).
- Loading, empty, error and success states everywhere; mobile-first Tailwind layout.

## 8. Deliberate simplifications (single-VM)

- Sessions are stateless JWTs in a cookie — no session store needed; logout clears the cookie (documented trade-off).
- Rate limiting is in-memory — correct for one backend instance; Redis would be the next step.
- The expiry sweeper runs inside the backend (60 s interval) — on multiple instances you'd move it to one worker/cron.
