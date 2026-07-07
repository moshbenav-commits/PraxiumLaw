# Praxium Law — Audit log v1

**Playbook:** `saas-audit-log` (Emergent portable bundle)  
**Stack:** FastAPI + MongoDB `audit_events` (not Nest — Nest port deferred)  
**Shipped:** 2026-06-29 · Sprint order #2

---

## Scope (v1)

| Layer | Path | Notes |
|-------|------|-------|
| **Write service** | `PraxiumLaw/backend/audit.py` | `log_audit()` · per-firm hash chain · `verify_chain()` |
| **Read API** | `GET /api/audit` · `GET /api/audit/verify` | admin/partner · `audit.read` permission |
| **Key actions** | `server.py` | `auth.login.success` · `auth.login.failed` · `matter.viewed` · `document.exported` |
| **Indexes** | `backend/db_indexes.py` | `(firm_id, created_at)` · `(firm_id, action, created_at)` |
| **Admin UI** | `/settings/audit` | Read-only table — last 50 events |
| **Settings link** | `/settings` → “View audit log” | RBAC-gated in API |

---

## Event schema (Mongo)

```json
{
  "id": "uuid",
  "firm_id": "firm_…",
  "ts": "2026-06-29T12:00:00+00:00",
  "created_at": "…",
  "actor": { "kind": "user", "id": "…", "name": "…", "email": "…" },
  "subject": { "kind": "matter", "id": "…" },
  "action": "matter.viewed",
  "outcome": "success",
  "ip": "203.0.113.42",
  "user_agent": "Mozilla/5.0 …",
  "meta": {},
  "prev_hash": "sha256:…",
  "hash": "sha256:…"
}
```

Legacy flat fields (`actor_id`, `actor_name`, `resource_type`, `resource_id`, `detail`) remain for backward compatibility with v0.2 module emitters (billing, team, workflows, marketplace).

---

## Hash chain

- Genesis: `sha256:GENESIS`
- One chain per `firm_id`
- Nightly verify (future cron): `GET /api/audit/verify` → `{ ok, verified, broken[] }`
- List API strips `prev_hash` / `hash` from customer-facing response

---

## v1 action catalogue

| Action | Trigger |
|--------|---------|
| `auth.login.success` | `POST /auth/login` |
| `auth.login.failed` | `POST /auth/login` (bad password or unknown email) |
| `matter.viewed` | `GET /matters/{id}` |
| `document.exported` | `GET /documents/{id}/download` |
| *(existing v0.2)* | firm settings, document delete, billing, team, workflows, marketplace |

---

## RBAC

| Permission | Roles |
|------------|-------|
| `audit.read` | admin, partner |

---

## Local dev

```bash
cd PraxiumLaw && bash scripts/dev.sh
# Login → open matter → download doc → Settings → Audit log
```

Sample event shape (reference only — **SSOT is Mongo in prod**):

`brand/praxium-law/audit-events.sample.json`

---

## Not in v1

- S3 WORM hourly export
- SIEM webhook stream (`saas-outgoing-webhooks`)
- Step-up auth before audit view
- NestJS migration / Postgres `audit_events` table

---

## Related

- `docs/prompts/portable-bundle/portable/playbooks/saas-audit-log.md`
- `docs/pending/PLAYBOOK_BUILD_RECOMMENDATIONS.md` (rank #2)
- `PraxiumLaw/docs/BACKEND_API.md` § Audit
- `docs/PRAXIUM_PENDING.md`
