# PraxiumLaw — Site Wiring Audit (PI Case OS lens)

**Updated:** 2026-07-04  
**Repo:** `PraxiumLaw/` (branch `Main`) · API **v0.3.0** · program phase **20**

This document compares **what the live app wires today** vs **what the PI training spec requires** (`product-capabilities.md`, `system-spec.md`).

---

## Executive summary

| Layer | Status |
|-------|--------|
| **Legal OS shell** | **Built** — auth, matters, contacts, tasks, documents, portal, e-sign, leads, workflows, audit, AI chat |
| **PI Case OS modules** | **Not built** — Needs List, insurance, demand, settlement, templates, in-app training |
| **Training corpus** | **Docs only** — `docs/pi-case-os/` (guides, articles, transcripts) — **no `/help` routes** |

---

## Frontend routes (wired)

### Public / marketing — **Built**

| Route | Component | Notes |
|-------|-----------|-------|
| `/` | Landing | Marketing + product mocks |
| `/pricing` | Pricing | |
| `/login`, `/signup` | Auth | Signup creates firm + admin user |
| `/intake/:firmSlug?` | IntakeForm | Public lead form → `POST /intake` |
| `/terms`, `/privacy`, `/accessibility` | Legal pages | Site Forge Phase 20 |
| `/upload/:token` | UploadToken | Magic-link client upload |
| `/sign/:token` | SignToken | NativeSign public signing |
| `/verify-identity/*` | IDV flow | Demo + token verify |

### Client portal — **Built**

| Route | Purpose |
|-------|---------|
| `/portal/login`, `/portal/verify` | Magic-link auth |
| `/portal` | Shared matters list |
| `/portal/matters/:id` | Client matter view |
| `/portal/messages` | Client ↔ firm messaging |

### Firm OS (authenticated `Shell`) — **Built**

| Route | Purpose | PI relevance |
|-------|---------|--------------|
| `/dashboard` | KPIs + first-matter onboarding card | Minimal onboarding only |
| `/matters`, `/matters/new`, `/matters/:id` | Matter CRUD + 8 tabs | Generic PM — not PI phases |
| `/contacts`, `/contacts/new`, `/contacts/:id` | Contact CRM | Client/adjuster storage |
| `/tasks` | Firm-wide tasks | Workflow auto-tasks on matter create |
| `/calendar` | Tasks + SOL dates | SOL calendar exists |
| `/documents` | Firm doc list | Upload per matter |
| `/inbox` | Leads + chat + portal msgs | Lead claim/convert |
| `/medconnect` | Provider directory | **Partial** — no per-matter email |
| `/courtconnect` | Docket UI | **Stub** — sample data only |
| `/voxline` | Phone/SMS | **Stub** — no backend |
| `/esign` | NativeSign staff console | Retainer/signatures |
| `/chat` | Team `#general` | |
| `/marketplace` | LawMatch leads | Not tools catalog |
| `/reports` | Pipeline chart | NL query “Phase 2” |
| `/settings` | Firm info | No disclosure gate |
| `/settings/team` | Invites + roles | 6 RBAC roles |
| `/settings/workflows` | Toggle automations | 2 default workflows |
| `/settings/audit` | Audit log | Admin/partner |
| `/settings/identity-review` | IDV queue | |

### **Missing routes** (PI modules — training hub wired)

- `/help` alias — use **`/training`** (wired: guides, articles, UX gaps)
- PI insurance, demand builder, settlement, Needs List — **none**
- Template library UI — **none**

---

## Matter detail tabs (wired)

`MatterDetail.jsx`: Overview · Tasks · Documents · Notes · Medical · Filings · Client msgs · Team chat

| Tab | API wired | PI gap |
|-----|-----------|--------|
| Overview | Yes | No Needs List, no 3P/1P panel |
| Tasks | Yes | No PI phase task templates |
| Documents | Yes | No taxonomy/redaction gate |
| Notes | Yes | |
| Medical | Read-only treatments | No add-from-UI; no Meds ledger/COR |
| Filings | List only | CourtConnect stub |
| Client msgs | Portal integration | |
| Team chat | Yes | |

**Matter statuses today:** `intake`, `active`, `discovery`, `negotiation`, `litigation`, `settlement`, `closed` — not PI pipeline names.

---

## Backend modules (wired)

| Module | File | Frontend UI |
|--------|------|-------------|
| Auth + firms | `server.py` | Login/signup |
| Matters, contacts, tasks, notes | `server.py` | Full CRUD |
| Documents (base64 Mongo) | `server.py` | Upload/download |
| Providers + treatments | `server.py` | MedConnect + Medical tab (partial) |
| Filings | `server.py` | Read-only in matter |
| Intake/leads | `server.py` | `/intake`, `/inbox` |
| AI CoCounsel | `server.py` | Matter-aware chat |
| RBAC | `rbac.py` | Team settings only |
| Workflows | `workflows.py` | `/settings/workflows` |
| Audit | `audit.py` | `/settings/audit` |
| Portal | `portal.py` | Portal routes |
| NativeSign | `esign.py` | `/esign`, `/sign/:token` |
| IDV | `identity_verification.py` | Verify + admin queue |
| Billing | `billing.py` | **API stub** — no UI |
| CSV import | `csv_import.py` | **API only** |
| Webhooks | `outgoing_webhooks.py` | **API only** |
| API keys | `api_keys.py` | **API only** |
| Marketplace tools | `marketplace_tools.py` | **API only** |
| Analytics | `server.py` | **No page** |

**Default workflows (seeded per firm):**

1. `intake-paralegal-tasks` — on `matter.created`: conflicts check, retainer, med auth tasks  
2. `document-complaint-notify` — on pleadings upload (disabled by default)

---

## RBAC roles (wired in backend)

| Role | Typical PI mapping |
|------|-------------------|
| `admin` | Firm owner / office manager |
| `partner` | Managing partner |
| `attorney` | Supervising attorney |
| `paralegal` | Paralegal + senior case manager |
| `staff` | Case manager, intake, clerical, VA |
| `billing` | Accounting / disbursements |

**PI attorney gates** (demand send, reductions, disbursement) — **not enforced in code**.

**Nav:** All sidebar items visible to every role — no role-based menu hiding.

---

## Training & onboarding content

| Asset | Location | In-app? |
|-------|----------|---------|
| Position training guides | `docs/pi-case-os/training-guides/` | **Yes** — `/training` |
| Knowledge articles (24) | `docs/pi-case-os/articles/` | **Yes** — `/training` |
| UX gap report | `training-ux-gaps.json` | **Yes** — `/training` gaps tab |
| Video transcripts (168) | `docs/pi-case-os/sources/transcripts/` | **No** |
| White-label templates (106) | `docs/pi-case-os/sources/docs/white-label-templates/` | **Browse + download** — `/settings/templates` (merge UX-020 partial) |
| Intake packet checklist | `intake-packet-checklist.json` | **Yes** — print + PDF |
| Needs List on matter | `pi_intake` on matter doc | **Yes** — Matter → **Intake** tab |
| 3P/1P insurance panel | `pi_insurance` on matter doc | **Yes** — Matter → **Insurance** tab |
| Meds ledger | `med_ledger` collection | **Yes** — Matter → **Medical** tab |
| PI phase pipeline | `matters.pi_phase` | **Yes** — Pipeline tab + `/matters` PI kanban |
| Demand builder + attorney gate | `matters.pi_demand` | **Yes** — Demand tab + `/pi/demand/review-queue` |
| Settlement calculator | `matters.pi_settlement` | **Yes** — Settlement tab |
| Property damage (PD) | `matters.pi_property_damage` | **Yes** — PD tab |
| Document taxonomy | `documents.taxonomy` | **Yes** — Matter → **Documents** tab |
| First-firm card | `Dashboard.jsx` | **Yes** — create matter/contact only |

---

## PI Case OS — built vs missing

### ✅ Usable today for PI firms (generic)

- Firm signup, multi-tenant isolation  
- Matters + contacts + tasks + notes + documents  
- Public intake → leads → convert to matter  
- Client portal + magic upload + e-sign  
- Provider directory + treatment API (basic)  
- SOL on calendar, team chat, AI chat  
- Audit log, team invites, 2 automations  

### ⚠️ Stub / partial

- CourtConnect, VoxLine (UI only)  
- MedConnect inbound email (mocked)  
- Reports NL query  
- Billing, marketplace tools, webhooks, CSV import (backend only)  
- Treatment add UI in matter Medical tab  

### ❌ Missing (PI spec — Phase 1 MVP)

From `product-capabilities.md` MVP order:

1. Firm onboarding + **disclosure acknowledgment** + `{{FIRM_*}}` profile  
2. PI **phase engine** + case audit views  
3. **Needs List** / intake packet checklist  
4. **Insurance** (3P/1P), LOR, limits, liability  
5. **Meds ledger**, treatment alerts, MRI/gap  
6. **Document taxonomy** + redaction checklist  
7. **Demand builder** + attorney approval gate  
8. **Settlement** scenarios, reductions, disbursement  
9. **Subrogation** (Medicare path)  
10. **Template library** + placeholder merge  
11. **In-app training** / help from guides + articles  

---

## Recommended wiring order (product)

1. ~~**`/training`**~~ — **Done** — guides, articles, UX gaps tab (role-filtered guides)
2. **Matter PI tab** — Needs List + insurance panel (schema in `system-spec.md`)  
3. **Phase engine** — map training phases to matter status + task templates
4. **Attorney gates** — extend RBAC on demand/reduction/disbursement actions
5. **Template engine** — white-label DOCX merge from firm profile  

**SSOT for features:** [`product-capabilities.md`](./product-capabilities.md) · [`PROJECT_STATUS.md`](./PROJECT_STATUS.md)
