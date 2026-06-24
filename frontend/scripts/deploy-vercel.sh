#!/usr/bin/env bash
# Deploy PraxiumLaw CRA frontend to Vercel production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ "${SKIP_PRE_DEPLOY_BUILD:-}" != "1" ]; then
  echo "Pre-deploy build gate..."
  npm run build
fi

echo "Deploying praxiumlaw-front to Vercel production..."
vercel deploy --prod --yes --force

echo ""
echo "Production URLs (after domains wired):"
echo "  https://www.praxiumlaw.com"
echo "  https://www.praxahq.com"
echo "  https://www.praxiumsuite.com → redirects to praxiumlaw.com"
