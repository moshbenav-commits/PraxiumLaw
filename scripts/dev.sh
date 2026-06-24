#!/usr/bin/env bash
# PraxiumLaw local dev — FastAPI backend + CRA frontend
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

if [[ ! -f "$BACKEND/.env" ]]; then
  cp "$BACKEND/env.local.example" "$BACKEND/.env"
  echo "Created backend/.env from env.local.example"
fi
if [[ ! -f "$FRONTEND/.env" ]]; then
  cp "$FRONTEND/env.local.example" "$FRONTEND/.env"
  echo "Created frontend/.env from env.local.example"
fi

if [[ ! -d "$FRONTEND/node_modules" ]]; then
  echo "Installing frontend dependencies…"
  (cd "$FRONTEND" && npm install --legacy-peer-deps)
fi

if [[ ! -d "$BACKEND/.venv" ]]; then
  echo "Creating backend venv…"
  python3 -m venv "$BACKEND/.venv"
  grep -v '^emergentintegrations' "$BACKEND/requirements.txt" | "$BACKEND/.venv/bin/pip" install -r /dev/stdin
fi

echo ""
echo "PraxiumLaw dev"
echo "  Backend:  http://localhost:8000/api/health"
echo "  Frontend: http://localhost:3000"
echo ""
echo "Requires MongoDB at mongodb://127.0.0.1:27017 (DB: praxium_dev)"
echo "AI chat needs emergentintegrations + EMERGENT_LLM_KEY (Emergent pod only)"
echo ""

cleanup() {
  trap - EXIT INT TERM
  kill 0 2>/dev/null || true
}
trap cleanup EXIT INT TERM

(cd "$BACKEND" && .venv/bin/uvicorn server:app --reload --host 0.0.0.0 --port 8000) &
(cd "$FRONTEND" && npm start) &
wait
