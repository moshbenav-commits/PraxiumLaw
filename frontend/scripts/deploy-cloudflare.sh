#!/usr/bin/env bash
# Deploy the PraxiumLaw frontend to Cloudflare Pages (project praxiumlaw-front).
#
# Replaces scripts/deploy-vercel.sh. praxiumlaw.com + www were DNS-flipped onto
# this Pages project on 2026-08-31, but deploy:prod still published to Vercel —
# so the live site and the deploy lane pointed at different hosts.
#
# Two traps this script exists to avoid:
#
#  1. --branch=main is MANDATORY. This repo's git branch is "Main" (capital M)
#     while the Pages production branch is "main". Without the explicit flag
#     wrangler infers the branch, lands a PREVIEW deployment, and the custom
#     domain then serves "404 Deployment Not Found" from a deploy that reported
#     success.
#
#  2. CLOUDFLARE_API_TOKEN is unset before wrangler runs. Wrangler PREFERS an
#     env token over its OAuth session, so a stale vault token does not merely
#     fail to help — it disables a working login and every deploy dies with
#     "Invalid API Token". The vault token is currently rejected by Cloudflare;
#     the OAuth session (pages:write) is what actually works.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT="${PAGES_PROJECT:-praxiumlaw-front}"
BRANCH="${PAGES_BRANCH:-main}"

if [ "${SKIP_PRE_DEPLOY_BUILD:-}" != "1" ]; then
  echo "Pre-deploy build gate..."
  npm run build
fi

if [ ! -f build/index.html ]; then
  echo "ERROR: build/index.html missing — refusing to deploy an empty directory." >&2
  exit 1
fi

echo "Deploying ${PROJECT} to Cloudflare Pages (branch ${BRANCH})..."
env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_API_KEY -u CLOUDFLARE_EMAIL \
  npx --yes wrangler@4 pages deploy build \
    --project-name="${PROJECT}" \
    --branch="${BRANCH}"

echo ""
if [ "${BRANCH}" = "main" ]; then
  echo "Production URLs:"
  echo "  https://www.praxiumlaw.com"
  echo "  https://praxiumlaw.com"
  echo "  https://praxahq.com        → /praxa  (once attached to this project)"
  echo "  https://praxiumsuite.com   → praxiumlaw.com (once attached)"
else
  echo "Preview deployment only (branch ${BRANCH}) — custom domains unchanged."
fi
