#!/usr/bin/env bash
# Copyright (c) 2024-2026 Expedia Solutions, LLC. All Rights Reserved.
#
# Deploy PraxiumLaw's backend to the shared Vultr host (colocated alongside
# expedia-parts-back — see the "PraxiumLaw" block in
# expedia-parts-back/deploy/vultr/Caddyfile, which fronts this container).
#
# WHY: PraxiumLaw is weaning off Vercel (Ricardo, 2026-08-31). Mongo stays on
# Atlas (mongodb+srv://) unchanged — this only moves the compute. Mirrors
# expedia-parts-back/deploy/vultr/deploy-ep-back.sh's proven pattern: rsync
# only git-tracked files (git ls-files — no local secrets ever leave this
# machine), snapshot the running image as a rollback point before building,
# rebuild on the host, recreate only this container, poll /api/health up to
# ~60s before declaring success, auto-rollback on failure.
#
# STAGED ROLLOUT, same as EP's own Wave 1: this deploys to
# api-vultr.praxiumlaw.com (staging hostname — needs an A record before Caddy
# can issue a cert). Do NOT point the Vercel-hosted frontend's
# REACT_APP_BACKEND_URL here until /api/health smokes clean on that hostname.
#
# Usage: bash deploy/vultr/deploy-praxiumlaw-back.sh [--skip-build] [--rollback]
set -euo pipefail

HOST="parts-back-vultr"
REMOTE_DIR="/home/deploy/praxiumlaw-back"
IMAGE="praxiumlaw-back:staging"
COMPOSE_FILE="deploy/vultr/docker-compose.praxiumlaw.yml"
SSH="ssh -o ConnectTimeout=20 $HOST"

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../backend" && pwd)"

if [[ "${1:-}" == "--rollback" ]]; then
  echo "==> Rolling back to the last snapshot tag on the host"
  $SSH "docker tag praxiumlaw-back:rollback $IMAGE && cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE up -d --force-recreate"
  sleep 3
  $SSH "curl -sf -o /dev/null -w 'rollback smoke: %{http_code}\n' http://127.0.0.1:8090/api/health || echo 'rollback smoke: FAILED — check manually'"
  exit 0
fi

echo "==> Verifying working tree matches a pushed commit (no unreviewed code reaches prod)"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "REFUSING: working tree is dirty. Commit or stash first." >&2
  exit 1
fi
CURRENT_SHA="$(git rev-parse HEAD)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$(git rev-parse "origin/$BRANCH" 2>/dev/null)" != "$CURRENT_SHA" ]]; then
  echo "REFUSING: HEAD ($CURRENT_SHA) isn't pushed to origin. Push first." >&2
  exit 1
fi
echo "    deploying $CURRENT_SHA (backend/ subtree)"

echo "==> Syncing git-tracked backend/ files only (git ls-files) — no local .env*, no untracked junk"
# Run from backend/ (see the cd above): git ls-files already returns paths
# relative to cwd, i.e. already backend/-relative with no prefix to strip.
git ls-files > /tmp/praxiumlaw-back-deploy-filelist.txt
rsync -az --files-from=/tmp/praxiumlaw-back-deploy-filelist.txt \
  ./ "$HOST:$REMOTE_DIR/"
# Deploy config isn't part of backend/ — sync it alongside so the compose
# file and Dockerfile referenced below are present on the host too.
rsync -az ../deploy/vultr/Dockerfile ../deploy/vultr/docker-compose.praxiumlaw.yml \
  "$HOST:$REMOTE_DIR/deploy-vultr/"
rm -f /tmp/praxiumlaw-back-deploy-filelist.txt

if [[ "${1:-}" != "--skip-build" ]]; then
  echo "==> Tagging the currently-running image as a rollback point"
  $SSH "docker tag $IMAGE praxiumlaw-back:rollback 2>/dev/null || echo 'no existing image to tag (first deploy?)'"

  echo "==> Building on the host (pip install + slim python:3.12; a few minutes)"
  $SSH "cd $REMOTE_DIR && docker build -f deploy-vultr/Dockerfile -t $IMAGE ."
fi

echo "==> Recreating praxiumlaw-back only (this box's other containers are separate compose projects)"
$SSH "cd $REMOTE_DIR && docker compose -f deploy-vultr/$(basename "$COMPOSE_FILE") up -d --force-recreate"

echo "==> Waiting for uvicorn to come up (poll, not a fixed sleep — see the Vultr"
echo "    deploy postmortem in ORGANIC_GROWTH_STRATEGY.md for why sleep alone lied once)"
HEALTH="000"
for _ in $(seq 1 20); do
  HEALTH=$($SSH "curl -sf -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:8090/api/health" 2>/dev/null || echo "000")
  [[ "$HEALTH" == "200" ]] && break
  sleep 3
done

echo "==> Smoke test"
if [[ "$HEALTH" != "200" ]]; then
  echo "SMOKE FAILED (http $HEALTH after ~60s). Rolling back automatically." >&2
  $SSH "docker tag praxiumlaw-back:rollback $IMAGE 2>/dev/null && cd $REMOTE_DIR && docker compose -f deploy-vultr/$(basename "$COMPOSE_FILE") up -d --force-recreate" || true
  exit 1
fi
echo "SMOKE PASS: /api/health -> 200"

echo "==> Deploy complete. Rollback with: bash deploy/vultr/deploy-praxiumlaw-back.sh --rollback"
echo "    Staging hostname (needs DNS A record + Caddy on the box): https://api-vultr.praxiumlaw.com/api/health"
