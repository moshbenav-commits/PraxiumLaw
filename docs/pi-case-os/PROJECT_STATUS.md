# PraxiumLaw PI Case OS — Where We Are & What To Do Next

**Updated:** 2026-07-04

---

## Short answer

| Question | Answer |
|----------|--------|
| Has everything been **added to PraxiumLaw**? | **Yes for knowledge / specs / templates.** **No for a running product backend.** |
| Do we have a clear plan? | **Yes** — below. Specs define the backend; code is not built yet. |
| How do documents complete the backend? | They are the **blueprint and seed data**, not the app itself. |
| Where are we? | **Phase 0 complete** (research + white-label corpus). **Phase 1 not started** (implement case OS). |

PraxiumLaw today includes a **product definition + training corpus** under `docs/pi-case-os/`. The **Legal OS shell** (FastAPI + React + Mongo) exists; **PI case OS modules** (cases, meds, demand, settlement) are **not implemented yet** — specs define what to build next.

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

## What is **not** done (the actual product)

| Layer | Status |
|-------|--------|
| Database schema (cases, parties, meds, insurance, phases) | **Not built** |
| API (cases, tasks, documents, templates) | **Not built** |
| Auth / multi-tenant firms | **Not built** |
| UI (case file, intake, demand, settlement) | **Not built** |
| Template engine (`{{PLACEHOLDERS}}` → firm profile) | **Not built** |
| Knowledge base in-app (articles) | **Not built** (markdown only) |
| Wire PI case OS modules inside PraxiumLaw | **Not started** |

**Documents complete the backend by defining it** — phases, fields, workflows, gates, template types, audit checklists. They do **not** replace implementing those as code.

```text
┌─────────────────────────────────────────────────────────┐
│  DONE: Spec + corpus (docs/pi-case-os/)                  │
│  capabilities · system-spec · articles · templates      │
└───────────────────────────┬─────────────────────────────┘
                            │ implements
                            ▼
┌─────────────────────────────────────────────────────────┐
│  NOT DONE: Product backend + frontend                   │
│  cases · tasks · meds · insurance · docs · settlement   │
│  firm onboarding · disclosure gate · attorney roles     │
└─────────────────────────────────────────────────────────┘
```

---

## How documents map to the backend

| Spec / corpus piece | Becomes in the product |
|---------------------|-------------------------|
| Case phases (intake → treating → demand → settlement) | `cases.phase` + phase transitions |
| Needs List, intake questionnaire fields | Intake forms + required-field validation |
| Meds tab / COR / Medical LOR | Providers, balances, records requests, COR flags |
| Document taxonomy + redaction | Document types, redaction checklist before export |
| 3P/1P, LOR, liability, limits | Insurance entities + claim workflows |
| Treatment compliance / MRI gates | Tasks + alerts (no-show, gap, MRI due) |
| Demand yellow-sheet order | Demand package builder |
| Settlement scenarios / reductions | Offers + calculator + reduction letters |
| Subrogation rules | Health-plan liens + Medicare path |
| Attorney gates | RBAC: staff prepare, attorney approve |
| White-label templates (106) | Template library + firm profile merge |
| Articles (22) | In-app help / knowledge base |
| Lit audit / transfer-to-lit | Phase 2 (litigation module) |

---

## Clear plan — what we do now

### Phase 1 — MVP case OS (build this next)

Implement from `product-capabilities.md` MVP order:

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

- Lit audit checklist + transfer-to-lit letters (`IMPROVEMENTS.md` P1)  
- In-app knowledge base from `articles/`  
- Full template merge UI (all 106 types)  
- Spanish status letters, bilingual intake  
- Optional: Google Drive knowledge export if still needed  

### Explicitly out of scope for now

- Cold phone **lead** greeting scripts (intake audio is in-office roleplay, not “sorry to hear” lead calls)  
- Shipping `sources/` to customers  
- Using templates without counsel review  

---

## Success criteria for “PraxiumLaw PI module is real”

- [ ] A firm can sign up, accept disclosure, set `{{FIRM_*}}` profile  
- [ ] Staff can open a case, run intake Needs List, track treatment and meds  
- [ ] System enforces attorney gates on demand / reductions / disbursement  
- [ ] Templates export with firm placeholders filled  
- [ ] Articles available as in-app help  

Until those are checked, PraxiumLaw is **specified and seeded**, not **shipped**.

---

## One-line status

**We finished the training → white-label product blueprint.** Next work is **implementing the case management backend and UI** from `product-capabilities.md`, not more document collection.
