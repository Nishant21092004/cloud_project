# AWS EC2 Quick-Start — BloomNest ko cloud pe chalana (step-by-step)

> **Status (VERIFIED ✅ — 14 Nov 2026):** ye deployment **actually complete hua hai**.
> BloomNest AWS EC2 (`t3.micro`, Ubuntu 22.04, **ap-south-1 / Mumbai**) pe live hai:
> **http://13.232.7.113** — smoke test **8/8 PASS**, seed complete
> (56 flowers / 6 bouquets / 50 plants / 125 PIN codes), admin login verified.
> Free DNS alias (no purchase): **http://13.232.7.113.sslip.io** — same site,
> works on any device; breaks only if the instance IP changes (stop/start).
> Admin: `admin@bloomnest.in` / `BloomNest@2026`.
> Neeche ka guide wahi procedure hai jo follow kiya gaya (reproducible record).

## 0. Pehle kya chahiye

1. AWS account — [aws.amazon.com](https://aws.amazon.com) pe sign up.
   Naye accounts ko **12 months Free Tier** milta hai: `t2.micro`/`t3.micro`
   (1 vCPU, 1 GB RAM) ke 750 hours/month free. BloomNest is size pe chal jaata
   hai (local Docker Desktop pe bhi yahi scale hai).
2. Debit/credit card AWS verification ke liye (₹2 refundable charge).
3. Ye poora project folder + GitHub repo `cloud_project` (already synced hai).

## 1. EC2 instance launch (AWS Console — browser me)

1. Console kholo: <https://console.aws.amazon.com> → apne account se login.
2. Upar search box me **EC2** likho → **EC2 Dashboard** kholo.
3. **Launch Instance** button:
   - **Name:** `bloomnest`
   - **AMI:** *Ubuntu* → **Ubuntu Server 22.04 LTS (HVM), SSD Volume Type**
     — "Free tier eligible" tag wala.
   - **Instance type:** `t2.micro` ya `t3.micro` (Free tier eligible).
   - **Key pair:** "Create new key pair" → naam `bloomnest-key`, type RSA,
     format `.pem` → **Download**. ⚠️ Ye file sirf ek baar milti hai —
     `Downloads\bloomnest-key.pem` sambhal ke rakho (yahi aapka password hai).
   - **Network settings → Edit:**
     - Auto-assign public IP: **Enable**
     - **Add security group rule** (inbound):
       | Type | Port | Source |
       |---|---|---|
       | SSH | 22 | My IP (dropdown se) |
       | HTTP | 80 | Anywhere-IPv4 (0.0.0.0/0) |
       | HTTPS | 443 | Anywhere-IPv4 (0.0.0.0/0) |
     - ⚠️ **5432 (Postgres) kabhi mat kholo** — database public nahi hota.
4. **Storage:** default 8 GB free tier me kaafi (project ~500 MB images ke saath).
5. **Launch Instance** → 1–2 min me *Instance state: Running*.

**Public IP note karo:** Instance summary page pe **Public IPv4 address**
(e.g. `13.234.56.78`) — yehi aapki website ka address hai jab tak instance
chalu hai. Instance **stop/start** karne pe IP badal sakta hai; permanent IP
chahiye to **Elastic IP** (free tier me 1 IP free, par *unattached* IP pe
charge lagta hai — instance ke saath hi attach rakho).

## 2. VM pe login + Docker install

Windows PowerShell (Git Bash bhi chalega):

```powershell
# key permissions (Git Bash / WSL me):
icacls "$env:USERPROFILE\Downloads\bloomnest-key.pem" /inheritance:r /grant:r "$env:USERNAME:R"

ssh -i "$env:USERPROFILE\Downloads\bloomnest-key.pem" ubuntu@<PUBLIC_IP>
```

SSH ke andar (ye steps [DEPLOYMENT.md](DEPLOYMENT.md) section 1 se same hain):

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER
exit    # dobara SSH karo taaki docker group lag jaaye
```

Dobara: `ssh -i ... ubuntu@<PUBLIC_IP>`, phir `docker --version` aur
`docker compose version` check karo.

## 3. Code + .env + start

```bash
git clone https://github.com/Nishant21092004/cloud_project.git bloomnest
cd bloomnest
cp .env.example .env
nano .env        # POSTGRES_PASSWORD aur JWT_SECRET badlo (openssl rand -hex 32):
                 #   aur COOKIE_SECURE=false rakhna — plain-HTTP IP pe Secure
                 #   cookie browsers reject kar dete, login silently toot jaata hai.
docker compose up --build -d
docker compose logs -f backend          # "migrations applied" dikhe to Ctrl+C
docker compose exec backend npm run seed    # SIRF first boot pe
docker compose exec backend npm run create-admin -- admin@bloomnest.in "StrongPass@123" "Admin"
bash scripts/smoke-test.sh              # 8/8 PASS expected
```

## 4. Kholke dikhao 🎉

Browser me sirf likho: `http://<PUBLIC_IP>` — BloomNest live hai.
(Demo ke liye HTTP kaafi hai; domain + HTTPS ke liye [DEPLOYMENT.md](DEPLOYMENT.md) section 4.)

## 5. Band karna = paisa bachana

- **Stop instance** (EC2 → instance select → Instance state → Stop):
  compute charges band; EBS disk (~$0.10/GB/month ≈ ₹9/GB) lagta rehta hai.
- **Terminate** = sab delete. Terminate se pehle Elastic IP release karo,
  warna unattached IP ka charge lagta hai.

## 6. AWS services ka mapping (report/viva me bolne ke liye)

| Humne kya use kiya (free tier) | Production me upgrade |
|---|---|
| **EC2** (t2/t3.micro) — compute, Docker containers | Auto Scaling Group + ALB |
| **EBS** — 8 GB disk volumes (DB + uploads) | RDS managed PostgreSQL |
| **Security Groups** — firewall (22/80/443 only) | WAF, private subnets |
| **Elastic IP** (optional) — static public IP | Route 53 + CloudFront |
| Local `.env` secrets | **Secrets Manager** / SSM Parameter Store |
| Console + SSH deploy | CI/CD pipeline, S3 images + CloudFront CDN |
| — | **CloudWatch** logs/alarms, SNS notifications |

Poora detail: [CLOUD_MAPPING.md](CLOUD_MAPPING.md).

## Troubleshooting

- **SSH timeout** → security group me port 22 "My IP" pe hai? Aapka IP badla?
- **Site nahi khulti** → `docker compose ps` (teeno healthy?), `docker compose logs web`
- **"Cannot connect to the Docker daemon"** → `newgrp docker` ya re-SSH
- **RAM full** → `docker compose` se pehle swap banao:
  `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`
