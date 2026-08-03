# Expansion Gap Report — wave-2 specs vs. the live app

What exists in the product today vs. what the five expansion systems ([EXPANSION_OVERVIEW](./EXPANSION_OVERVIEW.md)) require. Baseline: [SITE_WIRING_AUDIT](./pi-case-os/SITE_WIRING_AUDIT.md) (the PI-lens audit) — since that audit, the PI modules it listed as missing were built (phase pipeline, Needs List, insurance, meds ledger, demand builder + review queue, settlement, PD, taxonomy, templates, `/training`). This report covers the **new** systems.

Layers: **MKT** = marketing site · **APP** = firm-app UI · **API** = backend · **CORE** = shared platform build.

| # | Gap | Layer | System | Status |
|---|-----|-------|--------|--------|
| E1 | No practice-area pages on the site — marketing claims "PI, Family, Criminal, Bankruptcy, Immigration" but the expansion sells 9 injury verticals with real content behind them | MKT | Practice areas | Built in this branch, **deferred at merge (2026-08-02)** — public marketing stays PI-only until other firms sign up; `PracticeAreas.jsx`/`PracticeAreaDetail.jsx` and the `/practice-areas` routes are not merged (recoverable from `claude/praxium-expansion-systems`). See docs/PRAXIUMLAW_BIBLE.md 2026-08-02 entry. |
| E2 | No solution pages for Citation OS / Booking / Billing OS / VA automation | MKT | All | **Closed in this branch** (`/solutions/:slug`) — approved for merge regardless of practice-area scoping |
| E3 | Landing nav/footer don't surface the expansion; practice-area chips are dead (non-links) | MKT | All | Solutions nav/footer links **closed**; practice-area chips/links **deferred with E1** — landing page practice-area strip reverted to the pre-expansion decorative (non-linked) badges |
| E4 | VA-replacement ROI story absent from marketing (the platform's strongest sales math after stack-savings) | MKT | VA automation | **Closed in this branch** (automation solution page) |
| E5 | Practice-area **module engine** — matter templates/phases/checklists are PI-only (`pi_*` fields hard-coded on matter) | APP+API | Practice areas | **v1 shipped in this branch** (`backend/practice_modules.py` + `/settings/modules`: catalog, firm toggles, matter assignment, day-one task packs). Per-module *phase sets* still open — P2 |
| E6 | Citation matter type: no citation record, extraction queue, or ask-ladder UI | APP+API | Citation OS | **Backend shipped in this branch** (`backend/citations.py`: state machine, low-confidence/deadline exceptions, gated strategy + ask-ladder offers). Citations UI still open — P2b |
| E7 | Intake-mailbox classifier (detect tickets/bills/court mail in a monitored inbox) | CORE | Citation OS + Billing OS | Open — P1 (shared build) |
| E8 | Letter-persistence engine (outbound → expected-response timer → auto follow-up) | CORE | Citation OS + Billing OS | **v1 shipped in this branch** (`backend/persistence.py`: timers + sweep → follow-up/escalation tasks). Auto-send awaits mail adapters — P2 |
| E9 | Booking: `/calendar` is tasks+SOL only — no resources, blocks, waitlists, care plans, cross-org requests, no-show engine | APP+API | Booking | Open — P2 (PraxHQ side exists as spec only) |
| E10 | Billing: `billing.py` is an API stub with **no UI**; no case financial ledger, lien state machines, reduction engine, disbursement gates, trust recon | APP+API | Billing OS | **Backend shipped in this branch** (`backend/billing_os.py`: ledger + client-net, lien state machine, balance-verification loop, disbursement gate, summary). Reduction engine + trust recon + Billing UI still open — P2b |
| E11 | Attorney gates exist for PI demand only — reductions/disbursement/trust gates not enforced in code | API | Billing OS | **Registry shipped in this branch** (`backend/gates.py` + rbac permissions + decision records). Enforcement wiring lands with each consuming flow (Billing OS/Citation OS) — P2 |
| E12 | Role-based nav hiding absent (all sidebar items visible to every role) — required for VA-phase-out exception queues | APP | VA automation | Open — P2 |
| E13 | Exception-queue framework (confidence-gated automation → human queue) exists nowhere | CORE | All | **Shipped in this branch** — backend (`backend/exceptions_queue.py`) + UI (`frontend/src/pages/ExceptionsQueue.jsx`, `/exceptions` nav) |
| E14 | Jurisdiction Matrix is a doc template, not data — Citation OS and module deadline packs need it queryable | API | Citation OS + modules | Open — P2 |
| E15 | Court-approval workflow (minors/WC/wrongful-death) not built | APP+API | Modules | Open — P3 |
| E16 | Expert-witness management (med-mal/product) not built | APP+API | Modules | Open — P3 |
| E17 | Cohort/bulk operations for mass tort not built | CORE | Mass tort | Open — P3 |
| E18 | CourtConnect + VoxLine are stubs — Citation OS submission adapters and reminder ladders lean on them | API | Citation OS + Booking | Open — P2 |
| E19 | Marketing stats/testimonials predate the expansion (45 modules count, PI-only proof points) — refresh when expansion modules ship | MKT | All | Deferred (don't overclaim unshipped modules — see guardrail below) |
| E20 | Pricing page doesn't mention practice-area modules or expansion products | MKT | All | Partially closed (solution pages link pricing); tier-feature copy update deferred with E19 |

**Guardrail:** the marketing pages built in this branch describe expansion capabilities honestly — shipped app features as *product*, spec-stage systems as *"rolling out"/early-access* — no fabricated availability. When P1/P2 land, flip the labels.

**Dependency spine (unchanged from overview):** E7+E8+E13 are the shared core that unblocks both Citation OS and Billing OS; E5 unblocks every vertical module; E9's firm-side booking rides on the PraxHQ scheduling data model.
