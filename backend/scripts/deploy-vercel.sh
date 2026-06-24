#!/usr/bin/env bash
# Deploy PraxiumLaw FastAPI backend to Vercel production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Deploying praxiumlaw-back to Vercel production..."
vercel deploy --prod --yes --force

echo ""
echo "Verify: curl -s https://<deployment>/api/health"
