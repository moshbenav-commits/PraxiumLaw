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

From workspace root: `npm run dev:praxiumlaw` (if added to root package.json)
