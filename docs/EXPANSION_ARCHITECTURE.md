# Expansion Architecture — five systems on the existing platform

How the wave-2 systems ([EXPANSION_OVERVIEW](./EXPANSION_OVERVIEW.md)) land in the actual codebase (`frontend/` CRA + Radix, `backend/` FastAPI + Mongo). Gaps this closes: [EXPANSION_GAP_REPORT](./EXPANSION_GAP_REPORT.md).

## Layer 0 — Marketing site (built in this branch)

| Route | Page | Source of content |
|-------|------|-------------------|
| `/practice-areas` | Vertical index grid | [`practice-areas/`](./practice-areas/README.md) module specs |
| `/practice-areas/:slug` | Per-vertical detail (9) | Same, one entry per module |
| `/solutions/:slug` | Citation OS · Booking · Billing OS · Automation (4) | [`citation-os/`](./citation-os/README.md), [`praxhq/BOOKING_SYSTEM_SPEC`](./praxhq/BOOKING_SYSTEM_SPEC.md), [`billing-os/`](./billing-os/README.md), [`automation/VA_AUTOMATION_PLAN`](./automation/VA_AUTOMATION_PLAN.md) |

Implementation: data-driven — all copy in `frontend/src/data/expansion.js`; two template pages (`PracticeAreaDetail.jsx`, `SolutionDetail.jsx`) + index (`PracticeAreas.jsx`); shared `MarketingShell` header/footer; landing nav + chips + a solutions section wired to these routes. Honesty rule: spec-stage systems are labeled "rolling out"; shipped features are stated as product.

## Layer 1 — Shared core builds (P1; unblock everything)

| Build | Serves | Design |
|-------|--------|--------|
| **Module engine** | All verticals | `practice_area_modules` collection: per-module phase set, intake question pack, task templates, document pack refs, deadline-pack categories. Matter gets `module_id`; the generic `pi_*` matter fields generalize to `module_data`. PI becomes module #1 (migration: `pi_phase` → module phases). Firms toggle modules in Settings. |
| **Intake-mailbox classifier** | Citation OS, Billing OS | `mailbox_watch` worker: IMAP/webhook ingest → classify (citation / bill / EOB / court-mail / lien-notice / other) → OCR/extract with per-field confidence → `extraction_queue` (below threshold) or auto-create record. Backend `mailroom.py`; UI: Inbox gets a "Mailroom" tab. |
| **Letter-persistence engine** | Citation OS, Billing OS, records chasing | `outbound_items` collection: every generated letter/filing stores `expected_response_by` + `followup_template_id`; scheduler emits follow-ups on silence, escalates to task after N rounds. Backend `persistence.py`, rides existing workflows engine. |
| **Exception-queue framework** | All automation | Generic `exceptions` collection + one queue UI component (filter by kind); every automated flow writes here instead of failing silently. This is also the VA-phase-out instrument (queue volume = residual human work). |
| **Attorney-gate enforcement** | Billing OS, modules | Generalize the demand review-queue pattern: `gates.py` — declarative gate defs (action, required role, matter state); reductions, disbursement, trust movements, citation strategy/asks become gated actions. RBAC roles exist; add role-based nav visibility. |
| **Jurisdiction data service** | Citation OS, deadline packs | `jurisdictions` collection seeded from the Jurisdiction Matrix template; per-court rows (response methods, dispositions, deadline categories); admin UI later, seed via CSV import (exists). |

## Layer 2 — System builds (P2)

**Citation OS** — `citations` collection (state machine from [PIPELINE_SPEC](./citation-os/PIPELINE_SPEC.md)); matter type via module engine; UI: Citations kanban (`/citations`), matter tabs (Citation · Filings · Negotiation offer log); ask-ladder config per jurisdiction; submission adapters start print-and-mail (mail API) + manual-filing tasks, e-file adapters per jurisdiction later; CourtConnect graduates from stub for docket re-checks.

**Billing OS** — `ledger_entries` (append-only, per matter) + `liens` (state machine, terminal `release_received`) + `verifications`; Billing UI at `/billing` (department view: exception queue, verification chase board, reduction pipeline) + matter Financials tab replacing the read-only bills list; disbursement builder generates from ledger (gated); trust recon worker against bank-feed CSV import first, Plaid-class feed later.

**Booking (firm side)** — extend `/calendar` with resources + event types from the [scheduling module](./praxhq/SCHEDULING_MODULE.md) data model; `booking_requests` for cross-org flow; reminder ladder via VoxLine/TextLine when those graduate from stubs (SMS provider first — smallest lift). PraxHQ provider side is its own app (existing PraxHQ specs); the firm app only needs the request/confirm API contract now.

**VA automation instrumentation** — no new product surface: dashboards over `exceptions` + task/latency metrics per role ([VA plan](./automation/VA_AUTOMATION_PLAN.md) stage 1); role-scoped nav so exception queues are the only surface a transitional role sees.

## Layer 3 — Later (P3)

Court-approval workflow (minors/WC/wrongful death) · expert-witness management (med-mal/product) · cohort ops + campaign manager (mass tort) · e-file adapters per jurisdiction · FHIR interop for Booking.

## Data-model summary (new Mongo collections)

`practice_area_modules` · `mailbox_items` · `extraction_queue` · `outbound_items` · `exceptions` · `jurisdictions` · `citations` · `ledger_entries` · `liens` · `verifications` · `booking_requests` (+ scheduling entities when Booking P2 lands). All per-firm (existing multi-tenant isolation), all audit-logged (existing `audit.py`).

## Sequence

```
P0  Marketing layer (this branch)
P1  Module engine → gates → mailroom + persistence + exceptions → jurisdiction service
P2  Billing OS ledger/liens → Citation OS → Booking firm-side → VA instrumentation
P3  Court approval → experts → cohorts → e-file/FHIR
```

Rationale: P1 is shared plumbing every system needs (build once — [tool-homing](./pi-case-os/README.md#product-rules) discipline); Billing OS leads P2 because it monetizes existing PI tenants immediately and feeds the VA ROI story; Citation OS follows on the same mailroom/persistence rails it shares with Billing.
