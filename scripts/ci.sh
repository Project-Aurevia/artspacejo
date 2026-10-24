#!/usr/bin/env bash
# Build + smoke test in one shot: builds the frontend, boots the server against a throwaway
# database on a spare port, runs scripts/e2e.mjs, then shuts it down.
#
#   bash scripts/ci.sh            # local run
#   SKIP_BUILD=1 bash scripts/ci.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3311}"
export PORT
export BASE="http://127.0.0.1:$PORT"
export DATA_DIR="${DATA_DIR:-$(mktemp -d)}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-ci-password-12345678}"
export NODE_ENV=production
# The production guard refuses short/placeholder passwords — this one is deliberately random-ish.
unset SITE_URL TRUST_PROXY

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "▶ vite build"
  npm run build
fi

echo "▶ starting server on $BASE (data: $DATA_DIR)"
node server/index.js & SERVER=$!
cleanup() { kill "$SERVER" 2>/dev/null || true; wait "$SERVER" 2>/dev/null || true; }
trap cleanup EXIT

for _ in $(seq 1 60); do
  if curl -fsS "$BASE/api/health" >/dev/null 2>&1; then break; fi
  sleep 0.5
done
if ! curl -fsS "$BASE/api/health" >/dev/null 2>&1; then
  echo "✖ server did not become healthy on $BASE" >&2
  exit 1
fi
echo "✔ health: $(curl -fsS "$BASE/api/health")"

node scripts/e2e.mjs
