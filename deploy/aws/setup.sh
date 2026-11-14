#!/bin/bash
# BloomNest one-shot server setup — idempotent-ish, logs everything.
set -ux
cd /home/ubuntu
{
echo "=== apt ==="
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2 git curl
sudo systemctl enable --now docker

echo "=== swap (1 GB RAM safety) ==="
if ! swapon --show | grep -q swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi
free -m

echo "=== clone ==="
rm -rf bloomnest
git clone --depth 1 https://github.com/Nishant21092004/cloud_project.git bloomnest
cd bloomnest

echo "=== .env ==="
DBPASS=$(openssl rand -hex 16)
JWT=$(openssl rand -hex 32)
cat > .env <<EOF
POSTGRES_USER=bloomnest
POSTGRES_PASSWORD=$DBPASS
POSTGRES_DB=bloomnest
DATABASE_URL=postgresql://bloomnest:$DBPASS@db:5432/bloomnest
NODE_ENV=production
PORT=4000
JWT_SECRET=$JWT
ORDER_PAYMENT_TTL_MINUTES=30
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
WEB_PORT=80
PAYMENTS_MODE=auto
EOF

echo "=== build & up (slow on 1 GB — be patient) ==="
sudo docker compose up --build -d

echo "=== wait for backend ready ==="
READY=0
for i in $(seq 1 90); do
  if sudo docker compose exec -T backend wget -qO- http://127.0.0.1:4000/health/ready >/dev/null 2>&1; then READY=1; break; fi
  sleep 10
done
echo "READY=$READY"
if [ "$READY" != "1" ]; then
  sudo docker compose logs backend | tail -50
  echo SETUP_FAILED
  exit 1
fi

echo "=== seed + admin ==="
sudo docker compose exec -T backend npm run seed
sudo docker compose exec -T backend npm run create-admin -- admin@bloomnest.in "BloomNest@2026" "Nishant Admin"

echo "=== status ==="
sudo docker compose ps
echo SETUP_DONE
} 2>&1 | tee -a /home/ubuntu/setup.log
