# AWS Deployment Record — jo actually kiya gaya (14 Nov 2026)

> Ye file sirf wohi cheezein record karti hai jo **actually hui hain** — guess ya
> future plans nahi. Poora guide: [../../docs/AWS_EC2_QUICKSTART.md](../../docs/AWS_EC2_QUICKSTART.md)

## Status: LIVE ✅ (14 Nov 2026 ko verify kiya)

- **Site:** http://13.232.7.113
- **Free DNS alias (koi purchase nahi):** http://13.232.7.113.sslip.io — `http://` ke
  saath kholo; instance ka IP badlega toh ye naam bhi badal jaayega
- **Smoke test:** 8/8 PASS (`scripts/smoke-test.sh`)
- **Seed:** 56 flowers / 6 bouquets / 50 plants / 125 PIN codes
- **Admin login:** `admin@bloomnest.in` / `BloomNest@2026` — verify ho chuka hai

## AWS account details

| Cheez | Value |
|---|---|
| Account | 082335234233 |
| IAM user | `nishant` (AdministratorAccess policy) |
| Access key | Console se banaya; CLI credentials PC pe (`~/.aws`) — **kabhi repo/zip me mat daalo** |
| Region | ap-south-1 (Mumbai) |
| Free tier | 12 months (account ~Oct 2026 se), 750 hrs/month t3.micro → 24×7 chalane pe ₹0 |

## EC2 instance

| Cheez | Value |
|---|---|
| Instance ID | `i-056c11e6363bffa81` |
| Type / OS | `t3.micro` (free tier) / Ubuntu 22.04 LTS |
| Public IP | 13.232.7.113 (stop/start pe **badal sakta hai**) |
| Key pair | `bloomnest-key` — private key sirf PC pe: `C:\Users\Nishant\Documents\bloomnest-aws\bloomnest-key.pem` |
| Security Group | Inbound sirf 22 (SSH, mera IP) + 80 + 443; **5432 kabhi khula nahi** |
| Storage | 8 GB EBS (db_data + uploads volumes yahan persist hain) |
| SSH | `ssh -i <pem-path> ubuntu@13.232.7.113` |

## Aaj ka kaam (chronological)

1. IAM user `nishant` + access key (console) → PC pe AWS CLI v1 configure kiya
2. EC2 `t3.micro` launch kiya CLI se (AMI: ubuntu-jammy-22.04, hardened SG)
3. `setup.sh` server pe bheja, `nohup` se chalaya → poora provisioning automatic
4. Docker build (2 GB swap bana, kyunki 1 GB RAM pe build atak jaata)
5. Seed + admin banaya; smoke test 8/8
6. **Bug fix:** plain HTTP pe browser `Secure` cookie reject karta tha → login silently
   tootta tha. `COOKIE_SECURE` env add kiya, server pe `COOKIE_SECURE=false` set kiya
7. GitHub `cloud_project` repo pe push + free sslip.io naam docs me record kiya

## Paise bachane ke rules (important!)

- **Stop ≠ Terminate.** Demo ke baad: EC2 → instance select → *Instance state → Stop*.
  Stop pe sirf disk ka chhota charge; Terminate pe sab delete.
- 1 instance chalu rakho, Elastic IP mat banao (unattached IP pe charge lagta hai)
- Free tier limit: 750 hrs/month — 1 instance 24×7 = ~720 hrs → ₹0

## Production upgrade path (future, abhi implemented nahi)

Managed RDS PostgreSQL, S3 + CloudFront images, Secrets Manager, ALB + Auto Scaling,
CloudWatch — detail [../../docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md) me.
