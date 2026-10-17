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

- **363 catalogue listings** after running the seed: **146 flowers (38 species families) + 193 houseplants (10 groups, 498 pot variants) + 24 bouquet recipes**, with Hindi names in the description so `गेंदा`, `गुलाब`, `money plant` etc. all search. Seeding is idempotent: re-running it never overwrites a price, a stock count or a photo you edited in the admin panel.
- **Real photographs, not illustrations.** Every card asks [Wikimedia Commons](https://commons.wikimedia.org) for pictures of that exact species (search built from the binomial name + colour, e.g. `Tagetes erecta marigold orange`) and shows whichever frames come back, with the photographer + licence credited under the photo. Your own `/uploads/…` image in the admin panel always wins; if the browser has no internet the card draws per-product artwork in the flower's own colour, so nothing ever appears broken. See [docs/IMAGES.md](docs/IMAGES.md).
- **Hover a card → 3–4 more photographs of the same flower** slide out on the side and auto-advance; the product page has the same set as a lightbox gallery. A "N photos" chip appears only when real photographs actually loaded.
- **Search never dead-ends.** A term we do not stock shows an **Out of stock** result — with representative photos, the price it would carry, an alert-me link, and "closest in stock" alternatives. The same treatment applies to a product page for a sold-out flower, which also shows in-stock relatives.
- **Checkout is not COD-only any more.** Payment methods come from the API: Cash on Delivery, **Demo online payment** (simulated UPI/card/netbanking — no money moves, order ends as `DEMO_PAID`), and **Razorpay** whenever `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are set. A disabled *Place order* button now lists every reason it is disabled right under the button.
- **Delivery is all-India, not Delhi-only.** `GET /api/catalog/delivery-coverage` returns every circle; PIN codes beginning 1–8 are serviceable with an ETA + fee (metro hubs cheaper, north-east/remote costlier, ₹39 floor), `0…`/`9…` (defence / postal) are refused, and the admin panel's explicit PIN rows always override. The table behind it is `backend/src/modules/catalog/pincode-data.ts`; `/delivery` lists every circle and state. **This is a classroom simulation, not a courier contract** — no real fulfilment is promised.
- 10-digit mobile numbers, `0`/`+91` prefixes and stray spaces are normalised. Orders keep transactional stock, pricing and idempotency protections.

### Applying these changes to a running checkout

```powershell
# Windows, from D:\cc_project
powershell -ExecutionPolicy Bypass -File .\REBUILD.ps1 -Seed      # build + restart + seed
powershell -ExecutionPolicy Bypass -File .\REBUILD.ps1 -SeedOnly  # just re-run the seed
```

```bash
# Linux / the cloud VM, from the repo root
./scripts/rebuild.sh          # build + restart + seed + print catalogue counts
./scripts/rebuild.sh --full   # --no-cache, use this when Docker refuses to pick up changes
```

Manual equivalent, in this exact order:

```powershell
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose exec backend npm run seed
```

Then hard-refresh the browser (`Ctrl+Shift+R`). Do **not** run `docker compose down -v` unless you want the database gone; the new Prisma migration is applied on backend startup and `docker-entrypoint.sh` auto-seeds an empty catalogue.

**To replace the GitHub `cloud_project` contents with this project**, first test locally, then run `./SYNC_TO_GITHUB.ps1` from `D:\cc_project` and type `REPLACE`. It force-with-lease replaces the **main branch contents**, not the repository name.

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
