#!/usr/bin/env bash
# BloomNest smoke test — run AFTER `docker compose up --build` and
# `docker compose exec backend npm run seed` (first boot only).
#   bash scripts/smoke-test.sh [base-url]     # default http://localhost:${WEB_PORT:-80}
set -uo pipefail

BASE="${1:-http://localhost:${WEB_PORT:-80}}"
PASS=0
FAIL=0

check() { # <label> <command...>
  local label="$1"; shift
  if "$@" >/tmp/smoke_out 2>&1; then
    echo "PASS  $label"; PASS=$((PASS+1))
  else
    echo "FAIL  $label"; sed 's/^/      /' /tmp/smoke_out | head -5; FAIL=$((FAIL+1))
  fi
}

expect_contains() { # <label> <url> <substring>
  local label="$1" url="$2" want="$3"
  local body
  body="$(curl -fsS --max-time 10 "$url" 2>&1)" || { echo "FAIL  $label (request failed)"; FAIL=$((FAIL+1)); return; }
  if printf '%s' "$body" | grep -q "$want"; then
    echo "PASS  $label"; PASS=$((PASS+1))
  else
    echo "FAIL  $label — '$want' not in response"; printf '%s' "$body" | head -c 200; echo; FAIL=$((FAIL+1))
  fi
}

echo "── BloomNest smoke test against $BASE ──"

# 1. SPA shell served by nginx
expect_contains "homepage HTML served"        "$BASE/" '<div id="root">'
# 2. SPA fallback for client-side routes
expect_contains "SPA fallback (/orders)"      "$BASE/orders" '<div id="root">'
# 3. API proxied through nginx
expect_contains "catalog API through nginx"   "$BASE/api/catalog/flowers" 'pricePerStemPaise'
expect_contains "bouquets API"                "$BASE/api/catalog/bouquets" '"name"'
expect_contains "plants API"                  "$BASE/api/catalog/plants" 'careWatering'
expect_contains "serviceability (110001)"     "$BASE/api/catalog/serviceability/110001" '"serviceable":true'
expect_contains "payment config (COD mode)"   "$BASE/api/payments/config" '"enabled"'
# 4. backend readiness — direct inside the private network
if docker compose exec -T backend wget -qO- http://127.0.0.1:4000/health/ready 2>/dev/null | grep -q '"db":"up"'; then
  echo "PASS  backend /health/ready (db up)"; PASS=$((PASS+1))
else
  echo "FAIL  backend /health/ready"; FAIL=$((FAIL+1))
fi

echo "── $PASS passed, $FAIL failed ──"
[ "$FAIL" -eq 0 ]
