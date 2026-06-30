# Praxium Suite — Backend API

**Stack:** FastAPI · MongoDB (Motor) · JWT · Vercel serverless (`api/index.py` + Mangum)

**Base URL (prod):** `https://api.praxiumlaw.com/api`  
**Health:** `GET /api/health` → `{ "ok": true, "programPhase": 20, "version": "0.3.0", ... }`

---

## Auth

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/auth/signup` | — | Creates firm + admin user |
| POST | `/auth/login` | — | Returns JWT |
| GET | `/auth/me` | Bearer | User + firm |

JWT: `Authorization: Bearer <token>` · 30-day HS256 · `JWT_SECRET` env.

---

## Core domain (firm-scoped)

| Area | Paths |
|------|-------|
| **Matters** | `POST/GET /matters` · `GET/PUT/DELETE /matters/{id}` |
| **Contacts** | `POST/GET /contacts` · `GET/PUT/DELETE /contacts/{id}` · `?kind=` · `?search=` |
| **Tasks** | `POST/GET /tasks` · `PUT/DELETE /tasks/{id}` |
| **Notes** | `POST/GET /notes` · `?matter_id=` |
| **Documents** | `POST /documents` (multipart) · `GET /documents` · `GET /documents/{id}/download` · `DELETE /documents/{id}` |
| **Activities** | `GET /activities` |
| **Filings** | `POST/GET /filings` |
| **Providers / treatments** | `POST/GET /providers` · `POST/GET /treatments` |
| **MedConnect** | `POST /medconnect/magic-link` JSON `{ matter_id, expires_days?, send_email? }` |
| **NativeSign** | `POST /matters/{id}/sign-requests` · `GET /sign-requests` · `POST /sign-requests/{id}/resend` · public `GET/POST /sign/{token}` |
| **Dashboard** | `GET /dashboard` |
| **Search** | `GET /search?q=` |
| **Team** | `GET /team` |

---

## Intake & leads (LawMatch)

| Method | Path | Auth |
|--------|------|------|
| POST | `/intake` | Public |
| GET | `/leads` | Bearer |
| POST | `/leads/{id}/claim` | Bearer |
| POST | `/leads/{id}/convert` | Bearer |

---

## AI (requires `EMERGENT_LLM_KEY`)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/ai/chat` | Streaming CoCounsel |
| GET | `/ai/sessions/{session_id}` | Message history |
| POST | `/praxa/ai-coach` | Praxa consumer coach |

---

## Praxa (B2C)

| Method | Path |
|--------|------|
| POST | `/praxa/signup` |
| POST/GET | `/praxa/journal` |

---

## Identity verification

| Method | Path | Auth |
|--------|------|------|
| POST | `/identity-verification/demo/session` | Public (non-prod or `PRAXIUM_IDV_DEMO_ENABLED=true`) |
| POST | `/identity-verification/sessions` | Bearer (staff creates client link) |
| GET | `/identity-verification/admin/queue` | Bearer |
| POST | `/identity-verification/admin/{id}/approve` | Bearer |
| POST | `/identity-verification/admin/{id}/reject` | Bearer |
| GET | `/identity-verification/{token}/bootstrap` | Public (token in URL) |
| POST | `/identity-verification/{token}/selfie` | Public |
| POST | `/identity-verification/{token}/id-document` | Public |
| POST | `/identity-verification/{token}/submit` | Public |

---

## SaaS modules (v0.2)

### RBAC

Roles: `admin` · `partner` · `attorney` · `paralegal` · `staff` · `billing`  
Permission guards on sensitive routes — see `backend/rbac.py`.

### Team

| Method | Path | Role |
|--------|------|------|
| POST | `/team/invite` | admin/partner |
| GET | `/team/invites` | admin/partner |
| DELETE | `/team/invites/{id}` | admin/partner |
| POST | `/team/accept-invite` | Public (token) |
| PATCH | `/team/{member_id}` | admin/partner |

### Billing (stubs)

| Method | Path |
|--------|------|
| GET | `/billing/plans` |
| GET | `/billing/subscription` |
| POST | `/billing/upgrade-inquiry` |
| PATCH | `/billing/subscription` |

### Workflows

| Method | Path |
|--------|------|
| GET | `/workflows` |
| PATCH | `/workflows/{id}` |

Triggers: `matter.created` → auto paralegal tasks · `document.uploaded` (optional).

### Marketplace tools

| Method | Path |
|--------|------|
| GET | `/marketplace/tools` |
| POST | `/marketplace/tools/{id}/enable` |
| POST | `/marketplace/custom-tool-requests` |
| GET | `/marketplace/custom-tool-requests` |

Policy: `docs/CUSTOM_TOOLS_MARKETPLACE_POLICY.md`

### Audit

| Method | Path | Notes |
|--------|------|-------|
| GET | `/audit` | Last 50 events (default) · `?limit=` · `?action=` · `?resource_type=` |
| GET | `/audit/verify` | Hash-chain integrity for current firm |

**v1 logged actions:** `auth.login.success` · `auth.login.failed` · `matter.viewed` · `document.exported` (+ billing/team/workflow/marketplace from v0.2).

**UI:** `/settings/audit` (admin/partner). Spec: workspace `brand/praxium-law/AUDIT_LOG_V1.md`.

### Firm settings

| Method | Path |
|--------|------|
| PATCH | `/firm/settings` |

### CSV import (phase 15)

| Method | Path | Role |
|--------|------|------|
| POST | `/import/contacts` | admin/partner/attorney/paralegal/staff · CSV: `name,email,phone,kind` |
| POST | `/import/matters` | same · CSV: `title,status,practice_area,client_email,case_number` |

### Outgoing webhooks (phases 16–17)

| Method | Path | Role |
|--------|------|------|
| GET | `/webhooks/events` | Supported event catalog |
| GET/POST/PATCH/DELETE | `/webhooks/endpoints` | admin/partner |
| GET | `/webhooks/deliveries` | Delivery log |
| POST | `/webhooks/deliveries/{id}/retry` | Replay failed delivery |

Events: `matter.created` · `matter.status_changed` · `document.uploaded` · `signature.completed`  
Payloads signed with `X-Praxium-Signature: sha256=<hmac>`.

### Integration API keys (phase 18)

| Method | Path |
|--------|------|
| GET | `/integrations/api-keys` |
| POST | `/integrations/api-keys` |
| DELETE | `/integrations/api-keys/{id}` |

### Analytics (phase 19)

| Method | Path |
|--------|------|
| GET | `/analytics/summary` | Firm KPIs + webhook/portal/sign counts |

### Health (phase 20)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | `programPhase: 20` · `modules[]` · Mongo ping |
| GET | `/` | API version `0.3.0` |

Phase map: workspace `docs/fleet/PRAXIUM_PHASES.md` · smoke: `npm run praxium:smoke`

---

## Mongo collections

`users` · `firms` · `matters` · `contacts` · `tasks` · `notes` · `documents` · `activities` · `leads` · `providers` · `treatments` · `filings` · `chat_messages` · `ai_messages` · `praxa_users` · `praxa_journal` · `partner_inquiries` · `magic_links` · `identity_verification_sessions` · `audit_events` · `team_invites` · `workflows` · `firm_tools` · `custom_tool_requests` · `billing_inquiries` · `webhook_endpoints` · `webhook_events` · `webhook_deliveries` · `api_keys`

Indexes ensured on startup — `backend/db_indexes.py`.

---

## Env vars

See `backend/env.local.example` and `backend/env.production.example`.

| Variable | Required |
|----------|----------|
| `MONGO_URL` | Yes |
| `DB_NAME` | Yes |
| `JWT_SECRET` | Yes (rotate prod) |
| `CORS_ORIGINS` | Prod |
| `EMERGENT_LLM_KEY` | AI features |
| `PRAXIUM_FRONTEND_URL` | IDV verify links |
| `PRAXIUM_IDV_DEMO_ENABLED` | Optional |
| `PRAXIUM_IDV_TOKEN_SECRET` | Optional (defaults JWT_SECRET) |
| `PRAXIUM_IDV_TOKEN_TTL_HOURS` | Optional (default 168) |
| `RESEND_API_KEY` | Portal invites, upload links, NativeSign email (optional — dev uses `PRAXIUM_PORTAL_DEV_RETURN_LINK`) |
| `PRAXIUM_EMAIL_FROM` | Resend from address (default `onboarding@resend.dev`) |
| `PRAXIUM_PORTAL_DEV_RETURN_LINK` | Dev only — return magic URLs in JSON |
| `PRAXIUM_SIGN_LINK_TTL_DAYS` | NativeSign link expiry (default 14) |

### NativeSign email

On create/resend, backend emails the signer via Resend (`send_esign_invite_email`). Audit: `esign.invite_sent` · `esign.request_created`.

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/matters/{id}/sign-requests` | Bearer | Emails signer · dev returns `dev_sign_url` when `PRAXIUM_PORTAL_DEV_RETURN_LINK=true` |
| POST | `/sign-requests/{id}/resend` | Bearer | Resend pending invite |
| GET | `/portal/matters/{id}/sign-requests` | Portal JWT | Pending envelopes for logged-in client email |

Setup: `brand/praxium-law/NATIVE_SIGN_EMAIL.md`

---

## Tests

```bash
cd backend
.venv/bin/pytest tests/ -q
# Against prod API:
REACT_APP_BACKEND_URL=https://api.praxiumlaw.com .venv/bin/pytest tests/ -q
```

---

## Module layout

| File | Role |
|------|------|
| `server.py` | Core routes + app wiring |
| `identity_verification.py` | IDV flow |
| `rbac.py` | Roles & permissions |
| `audit.py` | Audit log |
| `billing.py` | Subscription stubs |
| `workflows.py` | Automations |
| `marketplace_tools.py` | Tools catalog |
| `team_mgmt.py` | Invites & roles |
| `email_util.py` | Resend transactional email |
| `portal.py` | Client portal + magic upload |
| `esign.py` | NativeSign v1 |
| `outgoing_webhooks.py` | Webhooks CRUD + emit |
| `csv_import.py` | Bulk CSV import |
| `api_keys.py` | Integration API keys |
| `api/index.py` | Vercel Mangum handler |

**Long-term:** NestJS + Next port per `docs/prompts/playbooks/expedia/practice-management-vertical.md` — FastAPI is current production SSOT.
