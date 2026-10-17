# BloomNest — Flowers, Custom Bouquets & Plants 🌸

A full-stack online flower & plant store for Indian customers, built as a cloud-computing course project.
Custom bouquet builder, per-stem flower inventory, plant variants, COD + optional Razorpay (test mode),
React storefront + admin dashboard, all running on Docker.

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Nginx (serves + reverse-proxies) |
| Backend | Node.js 20, Express, TypeScript, Zod validation, JWT (httpOnly cookie) |
| Database | PostgreSQL 16 + Prisma ORM (SQL migrations + seed) |
| Payments | Cash on Delivery (always works) + Razorpay Test Mode (optional) |
| Deployment | Docker + Docker Compose, single Linux VM |

**Demo accounts** (created by the seed script):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@bloomnest.test` | `Admin@1234` |
| Customer | `demo@bloomnest.test` | `Demo@1234` |

---


## BloomNest catalogue & checkout update (17 Oct 2026)

- **152 demo products** after running `npm run seed`: **80 flowers + 60 plants + 12 bouquets**. Demo prices and stock are illustrative, not a promise of real inventory. Seeding is idempotent and keeps manually edited prices/stock and custom photos.
- Product cards show a real-photo **reference gallery (four images)** on hover; details show four selectable thumbnails. Photo URLs are provided by [LoremFlickr](https://loremflickr.com/) using plant/flower keywords; the user must have internet access. These are illustrative third-party photographs, **not guaranteed to depict the exact listed cultivar**. Bundled SVG fallback images remain available when the service fails. For a real shop, use licensed, species-accurate assets hosted on your own CDN.
- Search for an item not in the current catalogue: **Out of stock** with a representative photo rather than a dead-end. Price/stock filter mismatches keep normal no-results messaging.
- Enter a 10-digit mobile or `0`/`+91` prefix. A disabled Place Order button now explains the missing information. Orders use original transactional stock, pricing, and idempotency protections.
- India-wide **demo delivery estimates** for PINs starting 1–8. Explicit admin PIN entries override them, including disabled delivery zones. This is a classroom simulation **not a courier serviceability claim**; do not promise genuine fulfilment without a live carrier or India Post validation.
- Checkout provides COD, **Demo online (simulated UPI/card/netbanking, no money charged)**, and Razorpay integration when you configure Razorpay **test keys**. Demo payments have separate `DEMO_PAID` status and are never counted as verified money. Real live payment requires merchant onboarding, keys, verification and operational setup.

**To replace GitHub ShopSense with this project**, first test BloomNest locally; then run `./SYNC_TO_GITHUB.ps1` in PowerShell from `D:\cc_project` and type `REPLACE` after reviewing the warning. This force-with-lease replaces the **main branch contents**, not the repo name. Do not confuse a local ZIP with a completed remote update.

**After updating an existing Docker checkout** (keep existing `.env` and volumes):

```powershell
docker compose up -d --build
docker compose exec backend npm run seed
docker compose ps
```

The new Prisma migration is applied automatically on backend startup. **Do not run `docker compose down -v`** unless you intend to delete the old database.

This update was syntax checked but NOT fully integration-tested here because Docker and npm packages are unavailable in this workspace. Run `docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-test` on your machine before evaluation.

## 1. Quick start

Prerequisite: only **Docker** (Docker Desktop on Windows / Docker Engine on Linux). Node.js is not needed on the host.

### Windows PowerShell

```powershell
# 1. Get the code (or clone your repo)
cd path\to\bloomnest

# 2. Create your environment file
Copy-Item .env.example .env
notepad .env          # change POSTGRES_PASSWORD and JWT_SECRET for anything non-local

# 3. Build & start everything (db + api + web)
docker compose up --build -d

# 4. First boot only — load demonstration data
docker compose exec backend npm run seed

# 5. Open the store
start http://localhost
```

### Linux (Ubuntu VM / WSL)

```bash
cd path/to/bloomnest
cp .env.example .env
nano .env                       # change POSTGRES_PASSWORD and JWT_SECRET
docker compose up --build -d
docker compose exec backend npm run seed   # first boot only
xdg-open http://localhost       # or just browse to the VM IP
```

The backend container applies **database migrations automatically** on every start (`prisma migrate deploy` in `docker-entrypoint.sh`), so `docker compose up` is always enough after the first seed.

### If port 80 is busy

```powershell
# PowerShell: edit .env → WEB_PORT=8080, then
docker compose up -d
```

### Stop / wipe

```bash
docker compose down        # stop (data kept in volumes)
docker compose down -v     # stop AND delete database + uploads (careful!)
```

---

## 2. What's inside

```
bloomnest/
├─ docker-compose.yml         # db + backend + web (production-style stack)
├─ docker-compose.test.yml    # ephemeral Postgres + full test suite
├─ docker-compose.dev.yml     # only a dev Postgres for `npm run dev` workflows
├─ .env.example               # every config value, documented
├─ backend/                   # Express + TypeScript API
│  ├─ prisma/                 # schema.prisma, migrations/, seed.ts
│  ├─ src/
│  │  ├─ modules/
│  │  │  ├─ auth/             # register/login/logout (+ admin CLI script)
│  │  │  ├─ catalog/          # flowers/bouquets/plants + PRICING ENGINE
│  │  │  ├─ cart/             # persistent cart, server-priced every load
│  │  │  ├─ orders/           # checkout transaction, cancellation, expiry
│  │  │  ├─ payments/         # Razorpay create/verify/webhook (idempotent)
│  │  │  └─ admin/            # stats, CRUD, uploads, fulfilment
│  │  ├─ middleware/          # auth, rate limits, logger, error handler
│  │  └─ lib/                 # jwt, validation, images, ids, errors
│  ├─ Dockerfile              # multi-stage: builder → slim runtime
│  └─ docker-entrypoint.sh    # wait for db → migrate deploy → start api
├─ frontend/                  # React + Vite + Tailwind SPA
│  ├─ src/pages/              # home, catalogs, builder, cart, checkout, orders, admin/*
│  ├─ nginx.conf              # SPA fallback + /api and /uploads proxy
│  └─ Dockerfile              # node build → nginx:alpine serve
├─ scripts/
│  ├─ generate-images.mjs     # generates all product SVG artwork (no external assets)
│  ├─ smoke-test.sh           # 8 public checks against the running stack
│  └─ e2e-live.mjs            # 13-step customer→admin walkthrough over HTTP
└─ docs/                      # architecture, API, deployment, viva, demo script…
```

Full documentation index:

- [HOW_TO_RUN.md](HOW_TO_RUN.md) — Windows quick-start: run, demo, test, troubleshoot
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system + database diagrams, request flows
- [docs/API.md](docs/API.md) — every endpoint with auth rules and error codes
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — one-VM cloud deployment: HTTPS, firewall, backups, costs, limits
- [docs/CLOUD_MAPPING.md](docs/CLOUD_MAPPING.md) — feature → cloud-concept mapping table
- [docs/TESTING.md](docs/TESTING.md) — what was tested, actual results, what is blocked
- [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) — 5-minute evaluation walkthrough
- [docs/VIVA_QA.md](docs/VIVA_QA.md) — 10 likely viva questions with simple Hinglish answers
- [docs/HINGLISH_GUIDE.md](docs/HINGLISH_GUIDE.md) — poora workflow simple Hinglish mein
- [docs/IMAGES.md](docs/IMAGES.md) — image sources & licensing

---

## 3. Security model (the short version)

- **Money is integer paise**, computed only by the server's pricing engine — client totals are never trusted.
- Stock is deducted with **conditional updates inside a transaction** — two buyers of the last stem: exactly one wins.
- `Idempotency-Key` checkout retries return the **same order**, never duplicate charges or stock deductions.
- Orders store **price/composition snapshots** — later catalogue edits never rewrite history.
- Cancellation restores stock **exactly once** (status-transition guard).
- Passwords bcrypt-hashed; sessions are **httpOnly SameSite cookies**; role re-checked against the DB per request.
- Public registration can **never** create an admin — use the CLI:

```bash
docker compose exec backend npm run create-admin -- admin@yoursite.in "StrongPass@123" "Your Name"
```

- Image uploads: magic-byte sniffing (not headers), 5 MB cap, randomly generated filenames, non-root runtime user.
- Login/checkout rate-limited; errors are JSON without stack traces; secrets never enter the frontend bundle.

---

## 4. Razorpay (optional, test mode)

The store is fully functional with **Cash on Delivery** without any credentials.
To enable online payments:

1. Create a free test account at <https://dashboard.razorpay.com>.
2. Settings → API Keys → generate **Test Mode** keys.
3. Put them in `.env`:

```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxx        # from the webhook settings page
```

4. `docker compose up -d` (recreates backend). `/api/payments/config` now reports `{"enabled":true,…}`.
5. Add a webhook endpoint `https://your-domain/api/payments/razorpay/webhook` in the Razorpay dashboard.

Without credentials the frontend disables the online option and shows "online payment unavailable" — nothing breaks.

---

## 5. Verification shortcuts

```bash
bash scripts/smoke-test.sh                    # 8 checks through nginx
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-test   # 46 automated tests
docker run --rm --network bloomnest_internal -v "$PWD/scripts:/s:ro" node:20-alpine node /s/e2e-live.mjs http://web:80   # 13-step live workflow
```

See [docs/TESTING.md](docs/TESTING.md) for recorded results.
