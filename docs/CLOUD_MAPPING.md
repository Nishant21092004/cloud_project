# Feature → Cloud Computing Concept Mapping

Use this table in the report/viva to connect every implemented feature to the
cloud concept it demonstrates. "Verified" = actually executed on this machine
during testing (see TESTING.md).

| # | Implemented feature (verified) | Cloud computing concept | Where to see it |
|---|---|---|---|
| 1 | Everything runs as Docker containers (`docker compose up --build`) | **Containerization** — packaging app + deps into portable images | `backend/Dockerfile`, `frontend/Dockerfile` |
| 2 | Backend image has a heavy builder stage and a slim runtime stage | **Image layering / multi-stage builds** — smaller, safer production images | `backend/Dockerfile` |
| 3 | `db`, `backend`, `web` talk on a private bridge network; only Nginx publishes port 80 | **Private networking & least-privilege exposure** | `docker-compose.yml` |
| 4 | `db_data` and `uploads` named volumes; orders survive `down` + `up` (verified) | **Persistent storage decoupled from compute** | `docker-compose.yml` volumes |
| 5 | Containers restart automatically (`unless-stopped`), DB has readiness gate, backend waits for DB then migrates | **Self-healing / orchestration basics** — health checks, restart policies, dependency ordering | compose healthchecks, `docker-entrypoint.sh` |
| 6 | `/health/live` (liveness) and `/health/ready` (readiness, checks DB) | **Health probes** used by orchestrators & load balancers | `backend/src/app.ts` |
| 7 | All config via env vars from `.env`; secrets never in code or frontend bundle | **12-factor app — configuration in environment** | `.env.example`, `src/config/env.ts` |
| 8 | Nginx serves the SPA and reverse-proxies `/api`, `/uploads` | **Reverse proxy / web tier separation**, TLS termination point | `frontend/nginx.conf` |
| 9 | `prisma migrate deploy` runs on container start; seed is a separate explicit command | **Schema migration as deployment step; infra-as-code** | `docker-entrypoint.sh` |
| 10 | Images built from a registry-free local context; lockfiles committed for reproducible builds | **Immutable, reproducible artifacts** (CI/CD-ready) | `package-lock.json`, `.dockerignore` |
| 11 | Rate limiting, input validation, bcrypt, httpOnly cookies, role checks | **Cloud security best practices** (zero-trust inputs, least privilege) | `src/middleware/*` |
| 12 | Single-VM design with documented upgrade paths (managed DB, object storage, multiple instances) | **Scalability & elasticity planning** | `docs/DEPLOYMENT.md` §7 |
| 13 | Backup/restore scripts for DB + uploads; docs push backups off-VM | **Backup & disaster recovery** | `scripts/backup.sh` |
| 14 | In-memory limiter documented as single-instance limitation → Redis next step | **Stateless vs stateful services; horizontal scale readiness** | `src/middleware/ratelimit.ts` |
| 15 | Optional third-party integration (Razorpay) via outbound HTTPS + signed webhooks | **SaaS/API integration, signed callbacks** | `src/modules/payments/` |
| 16 | Public URL exists only if you deploy to a VM — hosting a real VM was out of scope locally | **IaaS deployment model** — you provision the VM, we ship the image | — |

**Deployment model used:** IaaS-style — a plain Linux VM running Docker, everything self-managed.
**Future models to mention:** PaaS (e.g. managed container apps), SaaS components (managed DB, managed payments — already used: Razorpay *is* Payments-as-a-Service), and FaaS options for async workers.
