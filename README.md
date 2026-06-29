# PraxiumLaw — Legal OS (Emergent build)

Emergent **FastAPI + React (CRA) + MongoDB** app. Full code lives on branch **`Main`** (not the empty default branch).

## Quick start (this machine)

```bash
cd PraxiumLaw
bash scripts/dev.sh
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API health | http://localhost:8000/api/health |

## First-time setup

```bash
git checkout Main
git pull origin Main

# Frontend
cd frontend && npm install --legacy-peer-deps
cp env.local.example .env

# Backend
cd ../backend
python3 -m venv .venv
grep -v '^emergentintegrations' requirements.txt | .venv/bin/pip install -r /dev/stdin
cp env.local.example .env
```

## Requirements

- **MongoDB** running locally (`MONGO_URL=mongodb://127.0.0.1:27017`, `DB_NAME=praxium_dev`)
- **AI features** (`emergentintegrations` + `EMERGENT_LLM_KEY`) — available in Emergent pods only; UI works without them except streaming chat

## Repo

https://github.com/moshbenav-commits/PraxiumLaw.git — work on **`Main`**.

## Backend API

Full route map: [`docs/BACKEND_API.md`](docs/BACKEND_API.md)

| Module | File |
|--------|------|
| Core CRUD + auth + AI | `backend/server.py` |
| Identity verification | `backend/identity_verification.py` |
| RBAC | `backend/rbac.py` |
| Audit log | `backend/audit.py` |
| Billing stubs | `backend/billing.py` |
| Workflows | `backend/workflows.py` |
| Marketplace tools | `backend/marketplace_tools.py` |
| Team invites | `backend/team_mgmt.py` |

**API version:** `0.2.0` · **Stack:** FastAPI + MongoDB (NestJS port is future — see workspace `practice-management-vertical.md`).

```bash
cd backend && .venv/bin/pytest tests/ -q
REACT_APP_BACKEND_URL=https://api.praxiumlaw.com .venv/bin/pytest tests/ -q  # prod smoke
```

## Production

| Domain | Role |
|--------|------|
| www.praxiumlaw.com | B2B firm OS |
| www.praxahq.com | B2C Praxa (`/praxa`) |
| www.praxiumsuite.com | Alias → praxiumlaw.com |
| api.praxiumlaw.com | FastAPI backend |

Deploy + DNS: workspace [`docs/PRAXIUM_DEPLOY.md`](../docs/PRAXIUM_DEPLOY.md) · pending [`docs/PRAXIUM_PENDING.md`](../docs/PRAXIUM_PENDING.md)

```bash
cd frontend && npm run deploy:prod
cd ../backend && bash scripts/deploy-vercel.sh
```

**Site password lock:** set `SITE_LOCK_PASSWORD` + `SITE_LOCK_SECRET` on Vercel `praxiumlaw-front`. Clear both to go fully public.

From workspace root: `npm run dev:praxiumlaw`
