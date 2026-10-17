# Cloud Deployment Guide — single Linux VM

This is the exact procedure to put BloomNest on a Docker-capable cloud VM
(EC2 / Lightsail / DigitalOcean / Azure VM — any Ubuntu 22.04+ works).
Costs are real, not free tiers: a 1 vCPU / 1 GB VM is roughly **US $5–6/month**
(Lightsail) or ₹350–500/month; add ~$0.10–0.15/month for a small disk snapshot
and standard data transfer is negligible at class-project traffic.

## 1. Provision & harden the VM

```bash
# Ubuntu 22.04+ on any provider; then as the login user:
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 git ufw
sudo usermod -aG docker $USER && newgrp docker

# firewall: only SSH + HTTP + HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

In your cloud console, also allow inbound 22/80/443 in the **security group /
firewall rules** — the OS firewall (ufw) is the second layer.

> Postgres and the API are **never** exposed — only Nginx's port 80/443 is public.
> (Do NOT `ufw allow 5432`.)

## 2. Get the code + configure

```bash
git clone <your-repo-url> bloomnest && cd bloomnest
cp .env.example .env
nano .env
```

Set at minimum:

```
POSTGRES_PASSWORD=<long random>
JWT_SECRET=<64+ random chars>          # openssl rand -hex 32
NODE_ENV=production
WEB_PORT=80
RAZORPAY_KEY_ID=...                    # optional, test mode
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

## 3. Start, migrate, seed, verify

```bash
docker compose up --build -d           # builds images, starts db → api → web
docker compose logs -f backend         # watch: migrations applied, API listening
docker compose exec backend npm run seed     # FIRST BOOT ONLY
curl -fs http://localhost/health/ready 2>/dev/null \
  || docker compose exec backend wget -qO- http://127.0.0.1:4000/health/ready
bash scripts/smoke-test.sh              # 8/8 PASS expected
```

Create your real admin account:

```bash
docker compose exec backend npm run create-admin -- admin@yourdomain.in "StrongPass@123" "Your Name"
```

Restart policy is `unless-stopped` — after a VM reboot Docker brings everything back.

## 4. HTTPS (domain + Let's Encrypt)

The stack itself listens on port 80; the cleanest option is a small host-level
reverse proxy for TLS termination:

```bash
sudo apt install -y certbot nginx
sudo certbot --nginx -d yourdomain.in          # follow prompts, auto-redirect to HTTPS
```

Point the default nginx site at the compose web service (`proxy_pass http://127.0.0.1:80;`)
with `client_max_body_size 6m;`. Certbot renews automatically via systemd timer.
(Alternative: run `traefik` or `caddy` as an extra compose service, or put the
domain behind Cloudflare.) For a college demo without a domain, HTTP on the VM
IP works fine — say so honestly in the evaluation.

## 5. Persistent disk & backups

Named volumes keep state: `bloomnest_db_data` (database) and `bloomnestuploads`
(images). They survive `docker compose down`, reboots and image rebuilds.

**Backup (database + uploads in one go):**

```bash
chmod +x scripts/backup.sh && ./scripts/backup.sh /var/backups/bloomnest
# → bloomnest-YYYYmmdd-HHMMSS.sql.gz + uploads-YYYYmmdd-HHMMSS.tar.gz
```

**Restore:**

```bash
gunzip -c /var/backups/bloomnest/bloomnest-20260101-120000.sql.gz \
  | docker compose exec -T db psql -U bloomnest -d bloomnest
docker cp /var/backups/bloomnest/uploads-20260101-120000.tar.gz bloomnest-backend-1:/tmp/
docker compose exec backend sh -c "tar xzf /tmp/uploads-*.tar.gz -C /"
```

Automate with cron (daily 3:30 AM):

```bash
crontab -e
# 30 3 * * * /home/<user>/bloomnest/scripts/backup.sh /var/backups/bloomnest
```

Copy backups OFF the VM (object storage / another machine) — a backup on the
same disk is not a backup.

## 6. Updating the app

```bash
git pull
docker compose up --build -d          # rebuilds changed images; volumes untouched
                                      # entrypoint applies new migrations automatically
```

## 7. Limitations of a single-VM deployment (say these in the viva!)

1. **Single point of failure** — VM down = store down. → Run 2+ backend replicas behind a load balancer; use a managed load balancer/health probes.
2. **Manual scaling** — vertical only (bigger VM). → Container orchestration (ECS / Kubernetes / Swarm) for horizontal scale.
3. **In-memory rate limiting & sweeper** — per-instance state. → Redis-backed limiter; move the sweeper to a single scheduled worker.
4. **Local disk volumes** — tied to one VM. → Managed PostgreSQL (RDS/Cloud SQL) with automated backups & failover; object storage (S3-equivalent) for images + CDN.
5. **Manual deployments** — SSH + git pull. → CI/CD pipeline building images in a registry and rolling them out (the repo is already structured for it: lockfiles, multi-stage builds, health checks, migrations-on-start).
6. **Self-managed TLS** — handled at one proxy. → Managed certificate/ingress solutions at scale.

## 8. Implemented vs future cloud features (be precise in the report)

| Implemented & verified | Future improvement |
|---|---|
| Containerization (Docker), multi-stage builds, private network | Orchestration / auto-scaling (k8s, ECS) |
| Named volumes for DB + uploads (persistence across recreation — tested) | Managed database (RDS), object storage + CDN |
| Env-based configuration, secrets out of source control | Secret manager (AWS SM / Vault) |
| Health checks (liveness + readiness), restart policies | Centralized logging/metrics (Prometheus + Grafana, ALB probes) |
| Reverse proxy, single public port, host firewall rules | WAF, DDoS protection, global load balancing |
| Migrations on boot, idempotent seed, backup/restore scripts | Automated off-site backups with retention policy |
| Rate limiting, HTTPS-ready architecture (certbot steps documented) | Auto-renewing managed TLS at the LB |
| Razorpay webhook integration point (public HTTPS URL) | Queue-based async workers for emails/notifications |
