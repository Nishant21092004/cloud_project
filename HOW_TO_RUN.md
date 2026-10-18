# HOW TO RUN — BloomNest (Windows guide)

Everything runs in Docker. You never need Node or PostgreSQL installed on
Windows — only **Docker Desktop**.

---

## 0. One-time prerequisites

| Need | Check |
|---|---|
| Docker Desktop installed **and running** (whale icon in taskbar) | `docker --version` prints a version |
| Git Bash (comes with Git for Windows) — only needed for 2 helper scripts | right-click in the project folder → "Git Bash Here" exists |
| Port 80 free (IIS/Skype can grab it) | see Troubleshooting §8 if busy |

---

## 0.1 Naya folder, seedha GitHub se (recommended — no copying)

Aapko purane folder me files copy karne ki zaroorat nahi. Ek khaali folder me clone karo
aur ek script chala do — `.env`, secrets, build, migrations, seed sab khud ho jayenge:

```powershell
git clone --branch arena/7e25f80e-cloud-project https://github.com/Nishant21092004/cloud_project.git D:\bloomnest
cd D:\bloomnest
powershell -ExecutionPolicy Bypass -File .\START.ps1
```

`START.ps1` kya karta hai:
1. `.env` banaata hai (`.env.example` se) aur usme **random** `POSTGRES_PASSWORD` + `JWT_SECRET` daalta hai — GitHub par secret push nahi hota, isliye clone me `.env` hota hi nahi.
2. Port 80 busy ho (purana `D:\cc_project` stack chal raha ho) to apne aap `8080` (ya next free) le leta hai aur bataata hai.
3. Purane stack ke Docker volumes se takraav na ho isliye is folder ko apna `COMPOSE_PROJECT_NAME` de deta hai — **dono folders apna-alag database**, koi data delete nahi hota.
4. `docker compose build` + `up -d`, phir `/health/ready` ka wait (container "up" hai != API ready), phir `npm run seed`.
5. Ant me print: `flowers=146 plants=193 pot-variants=498 bouquets=24 serviceable-PINs=18` + kholne ka URL.

Repo private hai, to clone par GitHub login maangega (browser window / Git Credential Manager
ya Personal Access Token). Login ka jhanjhat nahi chahiye to browser me ZIP download karo:

```
https://github.com/Nishant21092004/cloud_project/archive/refs/heads/arena/7e25f80e-cloud-project.zip
```

ZIP extract karke jo folder milega usme `START.ps1` chalao — bas, kaam khatam.

Dusra din, code badalne ke baad: `powershell -ExecutionPolicy Bypass -File .\REBUILD.ps1 -Seed`.

## 1. First run — 4 commands

Open **PowerShell**:

```powershell
cd D:\cc_project

# 1. Build & start all three services (db, backend, web). First run takes ~3–5 min.
docker compose up --build -d

# 2. Wait until all three say "healthy" (re-run until healthy):
docker compose ps

# 3. Load the demo catalogue (146 flowers, 193 plants, 24 bouquets, serviceable
#    PIN codes, delivery slots, demo + admin users). Safe to re-run: the seed is
#    idempotent and never overwrites a price, stock count or photo you edited.
docker compose exec backend npm run seed

#    ...or let the helper do build + restart + seed + health-check + counts:
#    powershell -ExecutionPolicy Bypass -File .\REBUILD.ps1 -Seed

# 4. Open the store:
start http://localhost
```

Login accounts after seeding:

| Who | Where | Credentials |
|---|---|---|
| Admin | http://localhost/admin | `admin@bloomnest.test` / `Admin@1234` |
| Customer | "Register" in the navbar | any email + password (8+ chars, 1 letter + 1 number) |

---

## 2. Everyday commands

```powershell
docker compose ps          # status — all should say "healthy"
docker compose down        # stop (data is KEPT — orders & uploads survive)
docker compose up -d       # start again (no rebuild needed, fast)
docker compose logs -f backend   # watch API logs (Ctrl+C to exit)
docker compose restart backend   # restart one service
```

Full reset (⚠️ deletes database + uploaded images — back to blank):

```powershell
docker compose down -v
docker compose up --build -d
docker compose exec backend npm run seed
```

---

## 3. The 60-second demo path (for viva)

1. Browse **Flowers** → open any flower → note its price.
2. **Custom Bouquet** → add e.g. 5 × Red Rose + 3 × White Lily, pick wrapping +
   ribbon, type a greeting message → watch the **live preview + live price**.
   Point at the total: 5×₹30 + 3×₹80 + ₹50 + ₹20 = **₹460**.
3. Add to cart → **Checkout** → register/login → add address (PIN 110001 is
   serviceable) → pay via **Cash on Delivery** → place order.
   The backend *re-prices everything server-side* — even if the browser lied
   about totals, the charge would still be ₹460 (+₹40 delivery).
4. Login as **admin** → **Orders** → open the order → advance
   Confirmed → Preparing → Out for Delivery → Delivered.
5. Back as customer → **My Orders** → the order shows the full timeline and
   receipt.

---

## 4. Run the automated test suite (46 tests)

Uses a separate throwaway database — the real store keeps running untouched.

```powershell
cd D:\cc_project
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-test
docker compose -f docker-compose.test.yml down -v   # clean up afterwards
```

Expected last line: test summary with **46 passed**.

---

## 5. Smoke test & live e2e

Smoke test (8 checks) — needs **Git Bash**, run from the project folder:

```bash
bash scripts/smoke-test.sh              # default http://localhost:80
bash scripts/smoke-test.sh http://localhost:8080   # if you changed WEB_PORT
```

Live end-to-end (13 real HTTP steps: register → build bouquet → checkout →
admin delivers the order) — PowerShell, from the project folder:

```powershell
docker run --rm --network cc_project_internal -v "${PWD}\scripts:/s:ro" node:20-alpine node /s/e2e-live.mjs http://web:80
```

> Note: `cc_project_internal` is the Docker network named after this folder.
> If you moved/renamed the folder, check the real name with
> `docker network ls` and use that.

Expected: `ALL 13 E2E STEPS PASSED` plus the created order number.

---

## 6. Optional — enable real Razorpay (test mode)

1. Create a Razorpay account → Dashboard → **Settings → API Keys → Generate Test Keys**.
2. Put them in `.env` (project root):

   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
   RAZORPAY_WEBHOOK_SECRET=any_secret_you_choose
   ```

3. Recreate the backend so it picks up the new env:

   ```powershell
   docker compose up -d --force-recreate backend
   ```

4. Checkout now offers the **Pay Online (Razorpay)** option with real test
   payments. Without keys, the store simply shows COD only — by design.

---

## 7. Optional — create another admin account

Public registration can NEVER create an admin; this is the only way:

```powershell
docker compose exec backend npm run create-admin -- manager@store.test "Strong Pass@123" "Store Manager"
```

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| `port is already allocated` on port 80 | Something else owns port 80. Edit `.env` → `WEB_PORT=8080`, then `docker compose up -d`. Site moves to http://localhost:8080 |
| `error during connect: ... docker engine is running?` | Docker Desktop isn't running — start it and wait for the whale icon |
| Container stuck on `starting` | `docker compose ps` then `docker compose logs backend` — first boot can take a minute while migrations run |
| `docker compose exec backend npm run seed` fails with P1001 | DB not healthy yet — wait 30s, `docker compose ps`, retry |
| Want a completely fresh demo | §2 full reset (`down -v`) |
| Frontend shows old prices after admin edits | Hard refresh: Ctrl+Shift+R |

---

## 9. Where the data lives + backups

- Database → Docker volume `cc_project_db_data` (or `bloomnest_db_data` in the
  original folder) — survives `docker compose down`, dies only with `down -v`.
- Admin-uploaded images → volume `cc_project_uploads`, served at `/uploads/…`.
- Backup (DB dump + uploads tar, written to `D:\cc_project\backups\`):

  ```bash
  bash scripts/backup.sh
  ```

---

## 10. Deeper docs

- [README.md](README.md) — overview + Linux commands
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system, checkout & payment diagrams
- [docs/API.md](docs/API.md) — every endpoint
- [docs/TESTING.md](docs/TESTING.md) — what was tested and actual results
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — putting this on a real cloud VM (HTTPS, firewall, cron backups)
- [docs/HINGLISH_GUIDE.md](docs/HINGLISH_GUIDE.md) + [docs/VIVA_QA.md](docs/VIVA_QA.md) — viva preparation
