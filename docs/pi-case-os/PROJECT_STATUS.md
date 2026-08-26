# PraxiumLaw PI Case OS — Where We Are & What To Do Next

**Updated:** 2026-08-25 (rewrite closing the 2026-08-01 stale flag)

> **Provenance:** this file's "not implemented yet" framing was flagged stale on
> 2026-08-01 and left unfixed for three weeks. This rewrite is grounded ONLY in
> evidence checked the same day it was written — `curl https://api.praxiumlaw.com/api/health`
> (live, run 2026-08-25) and a `find` over `backend/`/`frontend/` for the modules it
> lists. Anything below not backed by one of those two checks is marked **unverified**
> rather than assumed. This is a status correction, not a re-audit of the product.

---

## Short answer

| Question | Answer |
|----------|--------|
| Has everything been **added to PraxiumLaw**? | **Yes for knowledge / specs / templates**, and **the backend + UI are live**, not merely specified — see verification below. |
| Do we have a clear plan? | The MVP order below is what got built; treat it as a record, not a to-do list. |
| How do documents complete the backend? | They were the **blueprint and seed data**; the backend now implements them (verified live, see table). |
| Where are we? | **Phase 0 (corpus) and Phase 1 (MVP case OS backend/UI) are both substantially shipped.** What remains is functional verification (the checklist below) and Phase 2 items. |

PraxiumLaw today includes the **product definition + training corpus** under `docs/pi-case-os/` AND a live product: the FastAPI/React/Mongo shell plus **31 backend modules** (health check, 2026-08-25), 13 of them PI-specific (`pi_intake`, `pi_insurance`, `pi_meds`, `pi_documents`, `pi_phases`, `pi_demand`, `pi_settlement`, `pi_letters`, `pi_ai_intake`, `pi_property_damage`, `pi_comms`, `pi_audit`, `pi_subrogation`), plus a `disclosure` module. Matching frontend exists: `frontend/src/pages/IntakeForm.jsx`, `frontend/src/components/matter/MatterIntakeTab.jsx`, `MatterDemandTab.jsx`, `AiIntakeFillModal.jsx` (all confirmed present, not confirmed functional end-to-end — see "What is NOT independently verified" below).

---

## What is done (Phase 0 — foundation)

### Product definition (shippable docs)

| Artifact | Role |
|----------|------|
| `product-capabilities.md` | What the system must do (features, attorney gates, MVP order) |
| `system-spec.md` | End-to-end pre-lit process (intake → treat → demand → settle) |
| `IMPROVEMENTS.md` | Prioritized backlog (P0/P1/P2) from full corpus review |
| `gaps.md` | What’s still missing or attorney-only |
| `DISCLOSURE.md` | Firms must edit docs + counsel review language |
| `WHITE_LABEL.md` | Placeholders, no firm branding |
| `articles/` (22) | Knowledge base for staff / in-app help |
| `training-guides/` (8) | Position onboarding guides |
| `SITE_WIRING_AUDIT.md` | Live app vs PI spec inventory |

### Training corpus (internal — do not ship raw)

| Artifact | Role |
|----------|------|
| `sources/transcripts/` | 168 video modules (scrubbed text) |
| `sources/training-pi-text/` | 38 how-to scripts as text |
| `sources/docs/white-label-templates/` | **106 DOCX + 106 PDF** scrubbed templates |
| `intake-calls/` | 4 intake audio transcripts (in-office coaching) |
| `TRANSCRIPTION_STATUS.md` | What’s transcribed |

### White-label / legal posture

- Text scrubbed of historical firm names  
- Templates use `{{FIRM_NAME}}` / role language where scrubbed  
- Disclosure required before live use  

---

## What is now LIVE (verified 2026-08-25) vs. still open

| Layer | Status | Evidence |
|-------|--------|----------|
| Database (Mongo) | **Connected** | health check: `"mongo":true,"mongoConfigured":true,"mongoError":null` |
| API — case/insurance/meds/documents/phases/demand/settlement/letters/AI-intake/property-damage/comms/audit/subrogation | **Live** (13 `pi_*` modules) | health check module list + matching `backend/pi_*.py` source files |
| Auth / RBAC / multi-tenant | **Live** | `auth`, `rbac`, `team`, `portal` in module list |
| Disclosure gate | **Live** | `disclosure` module in health check |
| UI — intake, matter tabs, demand, AI-fill | **Present** | `frontend/src/pages/IntakeForm.jsx`, `frontend/src/components/matter/{MatterIntakeTab,MatterDemandTab,AiIntakeFillModal}.jsx` |
| Template engine (`{{PLACEHOLDERS}}` → firm profile) | **Unverified** — `pi_docgen.py`/`pi_letters.py` exist in source but merge behavior not exercised in this pass | — |
| Knowledge base in-app (the 22 `articles/`) | **Unverified** — `training` module is live; whether the articles themselves are wired into it was not checked here | — |
| Litigation / transfer-to-lit (Phase 2) | **Not covered by this pass** — see Phase 2 below | — |

**"Unverified" means exactly that** — not confirmed absent, not confirmed present as a working feature. A source file existing is not the same as a flow working end-to-end; the next real check is running the success-criteria checklist below against the live app, not reading more source.

```text
┌─────────────────────────────────────────────────────────┐
│  DONE: Spec + corpus (docs/pi-case-os/)                  │
│  capabilities · system-spec · articles · templates      │
└───────────────────────────┬─────────────────────────────┘
                            │ implements
                            ▼
┌─────────────────────────────────────────────────────────┐
│  LIVE (backend + UI present, verified 2026-08-25):       │
│  cases · tasks · meds · insurance · docs · settlement    │
│  firm onboarding · disclosure gate · attorney roles      │
│  UNVERIFIED end-to-end: template merge, in-app KB wiring │
└─────────────────────────────────────────────────────────┘
```

---

## How documents map to the backend

**Kept as a reference map — the "becomes" column now describes live modules, not a plan.** Each right-hand item corresponds to a `pi_*` module or frontend component confirmed present above; this table was not re-verified line-by-line and a row's presence in the module list does not certify every listed sub-behavior (e.g. `pi_subrogation` being live does not by itself confirm "Medicare path" specifically works).

| Spec / corpus piece | Becomes in the product |
|---------------------|-------------------------|
| Case phases (intake → treating → demand → settlement) | `cases.phase` + phase transitions |
| Needs List, intake questionnaire fields | Intake forms + required-field validation |
| Meds tab / COR / Medical LOR | Providers, balances, records requests, COR flags |
| Document taxonomy + redaction | Document types, redaction checklist before export |
| 3P/1P, LOR, liability, limits | Insurance entities + claim workflows |
| Treatment compliance / MRI gates | Tasks + alerts (no-show, gap, MRI due) |
| Demand demand worksheet order | Demand package builder |
| Settlement scenarios / reductions | Offers + calculator + reduction letters |
| Subrogation rules | Health-plan liens + Medicare path |
| Attorney gates | RBAC: staff prepare, attorney approve |
| White-label templates (106) | Template library + firm profile merge |
| Articles (22) | In-app help / knowledge base |
| litigation audit / transfer-to-lit | Phase 2 (litigation module) |

---

## Clear plan — what we do now

### Phase 1 — MVP case OS — **backend/UI substantially shipped (see table above); treat this list as a build record, verify against it rather than re-plan from it**

Original MVP order from `product-capabilities.md`, kept for traceability:

1. **Firm onboarding** — profile, jurisdictions, fee defaults, disclosure acknowledgment  
2. **Case + parties + phases + roles + SOL**  
3. **Needs List + intake packet checklist**  
4. **Insurance (3P/1P) + LOR + liability + limits**  
5. **Meds ledger + treatment compliance alerts + MRI/gap**  
6. **Document taxonomy + redaction + Medical LOR + COR**  
7. **Demand builder + attorney approval gate**  
8. **Offers + settlement scenarios + reductions** (disbursement reconcile)  
9. **Subrogation (Medicare-critical path)**  
10. **Disbursement / trust checklist**  

**Where to build:** **PraxiumLaw only** — implement PI case OS modules in `backend/` + `frontend/`. No separate Axiom repos.

### Phase 2 — After MVP

- litigation audit checklist + transfer-to-lit letters (`IMPROVEMENTS.md` P1)  
- In-app knowledge base from `articles/`  
- Full template merge UI (all 106 types)  
- Spanish status letters, bilingual intake  
- Optional: Google Drive knowledge export if still needed  

### Explicitly out of scope for now

- Cold phone **lead** greeting scripts (intake audio is in-office roleplay, not “sorry to hear” lead calls)  
- Shipping `sources/` to customers  
- Using templates without counsel review  

---

## Success criteria for "PraxiumLaw PI module is real"

**Still the right test — none of these boxes were checked as part of this rewrite, deliberately.** Confirming a module is live in the health check is not the same as confirming the flow works for a real user; this rewrite corrected a stale "not built" claim using code/API evidence, it did not run these flows.

- [ ] A firm can sign up, accept disclosure, set `{{FIRM_*}}` profile
- [ ] Staff can open a case, run intake Needs List, track treatment and meds
- [ ] System enforces attorney gates on demand / reductions / disbursement
- [ ] Templates export with firm placeholders filled
- [ ] Articles available as in-app help

Until those are checked **by exercising the live app**, call PraxiumLaw's PI module **built, not confirmed working end-to-end** — a real distinction from this doc's old "specified and seeded, not shipped," which undersold what's actually running.

---

## One-line status

**The training → white-label blueprint is done, AND the backend/UI it describes are live** (13 `pi_*` modules + disclosure gate, confirmed via health check 2026-08-25; matching frontend present). What's open is the success-criteria checklist above — real functional verification — not more building from spec.
