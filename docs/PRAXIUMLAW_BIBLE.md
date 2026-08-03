# PRAXIUMLAW / PRAXHQ BIBLE

**Version:** v1 · **Date:** 2026-07-11 · **Current level:** L1 (substantially complete) → entering L2
**Owner repo:** `PraxiumLaw` (branch `Main` — the empty default branch is not used)
**Related docs:** [`BIBLE_TEMPLATE.md`](../../expedia-solutions/docs/BIBLE_TEMPLATE.md) · [`MASTER_BIBLE.md`](../../expedia-solutions/docs/MASTER_BIBLE.md) (registers this bible under engine **E3**) · `memory/ROADMAP.md` (module-level detail, aspirational) · `docs/pi-case-os/PROJECT_STATUS.md` (now partly stale — see §2) · `docs/pi-case-os/product-capabilities.md`, `system-spec.md`, `gaps.md`, `IMPROVEMENTS.md`, `WIRING_GAP_ROLLUP.md`, `WHITE_LABEL.md`, `DISCLOSURE.md`, `CUSTOM_TOOLS_MARKETPLACE_POLICY.md` · `docs/BACKEND_API.md`

**Naming note:** Everywhere in the current codebase, docs, domains, and `README.md` this product is called **PraxiumLaw** / **Praxium Suite** / **Praxa** (consumer app). **"PraxHQ" does not appear anywhere in the repo** (`grep -ri praxhq` across the working tree returns zero hits) — it is the working name used in fleet planning conversations for the white-label operations layer (SOPs + Citation OS + practice-area modules + Billing OS). As of **2026-08-02** both `claude/praxium-pi-sop-praxhq` (PR #1, merged 2026-07-28 as `888e967`) and `claude/praxium-expansion-systems` (PR #2, merged 2026-08-02 as `ae111b8`, **scoped to personal-injury only** — see §2) are merged into `Main`. This bible uses **PraxiumLaw** for the shipped app and **PraxHQ** for the white-label-OS vision/brand layer; §5 Phase 1b/1c is where the name gets reconciled into the code.

---

## 1. NORTH STAR

At L5, **PraxHQ is the operating system personal-injury law firms run their entire practice on** — case management, medical/insurance/subrogation tracking, document generation and e-sign, trust accounting, telephony, and an AI layer that is auditable rather than a black box — sold as a white-label, per-firm SaaS platform, then extended practice-area by practice-area (family, criminal, bankruptcy, immigration, estate) into a general law-firm OS. Firms pay because it replaces 7–8 point tools (Filevine, RingCentral, DocuSign, Mailchimp, ChartSwap, Slack, Zoom, Calendly, LeanLaw) at roughly 30% of the combined cost with features none of them ship individually (glass-box AI, native voice cloning, a two-sided consumer funnel in Praxa that feeds leads back to subscribing firms). We win because the product is built **from the actual operational transcripts of a working PI practice** (168 video modules + 38 scripts + 106 white-labeled templates), not guessed at from the outside — and because migration cost, the incumbent's biggest retention lever, is paid for and reversed (free white-glove migration + 90-day money-back + reverse-migration insurance).

---

## 2. CURRENT STATE (honest, as of 2026-07-11; updated 2026-08-02 — see notes below)

**2026-08-02 update, in brief:** PR #2 (`claude/praxium-expansion-systems`) is merged into `Main`. Gap #1 below (two unmerged branches) is closed — both PR #1 and PR #2 are in. Citation OS and Billing OS backends + app UI are live; the practice-area **module engine** (`backend/practice_modules.py`) is merged but every firm defaults to personal-injury-only (`DEFAULT_ENABLED = ("personal-injury",)`, PI can't be disabled, every other module requires an authenticated firm-admin toggle) — the public marketing pages for the other 8 injury verticals (`/practice-areas`, `/practice-areas/:slug`) were **not** merged and stay off until another firm signs up (full content recoverable from the source branch). Gap #2 (no reproducible test env / no CI) is partially closed: `backend/tests/conftest.py` now makes `pytest` collectible and runnable for any file/subset (previously only worked as a full-suite run, by the accident of file-collection order); `.github/workflows/ci.yml` now runs backend pytest + frontend vite build on every push/PR to `Main` — first run is **red**, but on pre-existing test flakiness/gaps unrelated to this merge (see the 2026-08-02 changelog entry for the honest breakdown). Full stabilization of that suite is still open work, not done in this pass.

### What exists and runs

- **General Legal OS shell** (FastAPI + React CRA + MongoDB, `backend/server.py` 1,501 lines + 28 supporting backend modules): auth/JWT, RBAC (admin/partner/attorney/paralegal/staff/billing), multi-tenant firm scoping, matters w/ Kanban, contacts, documents, tasks, calendar, notes, activity timeline, CaseChat, NativeSign e-signature, Report Studio, DocGen scaffolding, Intake Hub w/ AI lead scoring, CoCounsel AI sidebar (Claude streaming, per-matter context), ⌘K command palette, identity verification (`identity_verification.py`), audit log, outgoing webhooks, CSV import, marketplace-tool registry, team invites, integration API-key vault. Deployed to production domains (`www.praxiumlaw.com`, `api.praxiumlaw.com`, `www.praxahq.com`, `www.praxiumsuite.com`) via `npm run deploy:prod`. API version `0.3.0`, "program phase 20" per `/api/health`.
- **PI Case OS backend — genuinely built, not just specced.** `docs/pi-case-os/PROJECT_STATUS.md` (dated 2026-07-04) says "product code is not built yet" — **this is now stale.** Verified in this session: 14 dedicated `pi_*.py` backend modules exist (`pi_intake.py`, `pi_phases.py`, `pi_insurance.py`, `pi_meds.py`, `pi_documents.py`, `pi_demand.py`, `pi_settlement.py`, `pi_subrogation.py`, `pi_property_damage.py`, `pi_expenses.py`, `pi_client_comms.py`, `pi_ai_intake.py`, `pi_audit_dashboard.py`, `pi_letters.py` — the last alone is 1,550 lines), plus `esign.py`, `docusign_bridge.py`, `document_pdf.py`, `pdf_util.py`. Matching frontend: `MatterDetail.jsx` wires 13 dedicated matter-tab components (`MatterInsuranceTab`, `MatterDemandTab`, `MatterSettlementTab`, `MatterPropertyDamageTab`, `MatterSubrogationTab`, `MatterExpensesTab`, `MatterMedicalTab`, `MatterIntakeTab`, `MatterPhaseTab`, `MatterCommsTab`, `MatterDocumentsTab`, `MatterLettersCard`, `AiIntakeFillModal`). Git log confirms recent PI shipping: DocGen letters (demand/MedPay/drop/reduction/disbursement), LOR + lien-balance-verification letters, e-sign of generated PDF letters via NativeSign, AI intake fill — all landed 2026-07-08 → 2026-07-09.
- **UPDATED 2026-08-02 — test suite now collects and runs reliably; still not green.** `backend/tests/conftest.py` sets the `MONGO_URL`/`DB_NAME`/`JWT_SECRET`/... env defaults and monkeypatches `AsyncIOMotorClient` → `mongomock_motor.AsyncMongoMockClient` before any test module imports `server` — previously that bootstrap only happened as a side effect of `test_intake_attribution.py` importing first in a full-suite alphabetical run, so `pytest tests/test_pi_phases.py` (or any partial selection) failed collection outright with `KeyError: 'MONGO_URL'`. Confirmed fixed: isolated files now collect and run standalone, no real Mongo required. 27 test files, 172 tests collected. Not green: ~13 failures + ~50 errors, pre-existing (not introduced by this fix or by PR #2) — see gap #2 for the breakdown.
- **Knowledge/spec corpus:** `docs/pi-case-os/` — `product-capabilities.md`, `system-spec.md`, `gaps.md`, `IMPROVEMENTS.md` (P0/P1/P2 backlog), `WIRING_GAP_ROLLUP.md` (139 Filevine training videos labeled → 732 tracked functions, ranked by Praxium tab: intake 113, medical 98, documents 78, pipeline 75, insurance 74, settlement 73, comms 63, notes 31, demand 30, subrogation 30, plus smaller admin/reports buckets), `DISCLOSURE.md`, `WHITE_LABEL.md`, `SOURCES.md`, `SITE_WIRING_AUDIT.md`, `UI_UX_GAPS.md`, `CUSTOM_TOOLS_MARKETPLACE_POLICY.md` (draft, attorney review pending).
- **24 numbered knowledge articles** live in `docs/pi-case-os/articles/` on `Main` today (`01-intake-needs-list.md` … `24-medical-documents-reference.md`), plus 8 role-based `training-guides/`. **Not 54** — per fleet memory, a 54-article buildout plus PraxHQ product/legal docs exist on the unmerged `claude/praxium-pi-sop-praxhq` branch (PR #1); this session did not check out that branch (git-command restriction on this task), so the extra ~30 articles are **not independently verified** here, only carried forward from prior-session context.
- **UPDATED 2026-08-02 — Wave-2 systems are now merged into `Main`, PI-scoped.** `claude/praxium-expansion-systems` (PR #2) merged as `ae111b8`. Live: Citation OS (`backend/citations.py` + `/citations` UI), Billing OS (`backend/billing_os.py`, `reductions.py`, `trust_recon.py` + `/billing` UI), the shared core it rides on (`exceptions_queue.py`, `gates.py`, `persistence.py`, `module_phase_engine.py`, `module_phases.py`, `mail_adapters.py`, `mail_provider.py`, `webhook_security.py`, `/exceptions` `/mailbox` `/trust` UI + nav), and `/solutions` marketing pages for all four (Citation OS, Booking, Billing OS, VA automation). The practice-area **module engine** (`backend/practice_modules.py`, `/settings/modules` admin toggle) is also merged, but every firm defaults to personal-injury-only — the 8 non-PI verticals' content packs exist in the backend catalog (inert, admin-gated, off by default) but their **public marketing pages were deliberately not merged** (`PracticeAreas.jsx`/`PracticeAreaDetail.jsx`, the `/practice-areas` routes, and the Landing-page links to them) — Ricardo's call: PI-only in front of the world until another firm signs up. Booking (PraxHQ side) remains spec-only (`docs/praxhq/BOOKING_SYSTEM_SPEC.md`) — no app UI. VA phase-out is a plan doc, not automation code, per `docs/automation/VA_AUTOMATION_PLAN.md`.
- **In-app knowledge base from the 24 articles is not built** — `PROJECT_STATUS.md` still correctly flags this: articles are markdown files, not surfaced in the product UI yet.
- **Template engine** (`{{FIRM_NAME}}`-style merge into the 106 white-label DOCX/PDF templates under `sources/docs/white-label-templates/`) is **not built** as a general merge UI; individual letter types have been hard-coded into `pi_letters.py` module by module (demand, MedPay, drop, reduction, disbursement, LOR, lien-balance-verification), which is faster to ship per-letter but is not yet the "all 106 types" template pack index called for in `product-capabilities.md` §14b.
- **`backend/billing.py`** (the platform's own subscription billing — Starter/Growth/Enterprise plans, `UpgradeInquiry` model) **remains a manual stub** — no live Stripe charge flow, no metered marketplace lead billing. This is distinct from the firm-facing **Billing OS** (case financial ledger, lien state machine, reduction negotiation, disbursement gate, trust reconciliation), which **is now built** as of the 2026-08-02 PR #2 merge (`backend/billing_os.py` + `reductions.py` + `trust_recon.py` + `/billing` `/trust` UI) — see the update note above. Real Stripe/IOLTA integration for either system is still open.
- **No confirmed external paying or pilot firm found in the repo.** No customer-facing case studies, onboarding logs, or a second real firm's disclosure-acknowledgment record were located. The product currently operates as an internal build target, not yet an operating business relationship with an outside firm.

### Gaps this bible tracks going forward (see §5 for phasing)

1. ~~Two unmerged branches (PR #1, PR #2) carrying real product + legal content that is not in `Main`~~ — **CLOSED 2026-08-02.** Both merged (`888e967`, `ae111b8`); PR #2's multi-practice-area marketing surface deliberately deferred, not the merge itself — see the update note above.
2. ~~Test-run environment is not reproducible without manual `.env`/Mongo setup — no CI observed running `pytest` automatically~~ — **PARTIALLY CLOSED 2026-08-02.** `backend/tests/conftest.py` + `.github/workflows/ci.yml` now exist; `pytest` runs (against in-memory mongomock, no real Mongo needed) for any file/subset, and CI runs it on every push/PR. **Still open:** the suite itself is not green — ~13 pre-existing failures + ~50 errors, mostly (a) `test_praxium_api.py`/`test_praxium_extensions.py` integration tests that expect a live server on localhost (CI doesn't start one) and (b) shared-mongomock-state/order-dependent flakiness across several `test_pi_*`/`test_partner_vault.py` tests (same test re-run twice on an unmodified checkout produces different pass counts). Confirmed via a baseline-worktree comparison that this predates PR #2 — not a regression from this merge. Stabilizing that suite is separate follow-up work.
3. `PROJECT_STATUS.md` is stale (dated 2026-07-04, describes "Phase 1 not started" when 14 PI backend modules already exist) — a P1 doc bug per the fleet's own maintenance rule ("a bible/doc that contradicts reality is a P1 doc bug").
4. In-app knowledge base, general template-merge UI, and lit-audit/transfer-to-litigation module remain markdown/spec-only.
5. No external firm has gone through the disclosure + onboarding flow — the actual L1→L2 threshold.
6. "PraxHQ" branding does not exist in code, domains, or ToS yet.

---

## 3. COMPLEXITY LADDER (L1–L5 for PraxiumLaw / PraxHQ)

- **L1 — Works.** The Firm OS core loop *and* the PI Case OS modules (intake → phases → insurance/LOR → meds/treatment tracking → document taxonomy → demand/DocGen → settlement/reductions → subrogation → disbursement, with e-sign) run end-to-end for one firm (us) on one matter, locally or on the deployed pods. **Status: substantially achieved** — the modules exist and are wired into the UI; the remaining L1 debt is making the test suite provably green and reconciling the two unmerged branches into one coherent `Main`.
- **L2 — Operable.** A real external PI firm (not us) signs up, acknowledges `DISCLOSURE.md`, sets a `{{FIRM_*}}` profile, and runs live matters through intake → demand → settlement in production, with error handling, a support path (someone besides Ricardo can unblock a stuck user), live billing (Stripe, not the inquiry stub), and HIPAA-ready handling of medical records. **Status: not yet reached** — infra (domains, deploy pipeline, RBAC) exists but no external firm relationship is evidenced in the repo.
- **L3 — Product.** Self-serve signup with no white-glove setup call, multi-tenant billing fully automated (subscription tiers + Marketplace per-lead billing), monitoring/alerting and a stated SLA, Citation OS and the first practice-area modules beyond PI live, sellable to a new firm without Ricardo on the call.
- **L4 — Scaled.** A growth engine attached (Case Result Wall SEO, review engine, partner/referral network, Settlement Comparables DB network effect), team-operable support/success (not Ricardo-dependent), meaningful ARR (see §4/§6 targets), Doctor Portal + Vendor Portal live as two-sided network moats.
- **L5 — Franchise/Platform.** PraxHQ sold per-firm nationwide as a white-label operating system; public API + webhooks + a plugin marketplace where third parties build on Praxium; white-label resale to other software companies; multi-practice-area category leadership (PI + family + criminal + bankruptcy + immigration + estate, etc.) — the L5 vision this bible was commissioned to encode.

---

## 4. FIVE-YEAR PLAN

| Year | Window | Target level | Revenue target (labeled: **target**) | Headline milestones |
|---|---|---|---|---|
| **Y1** | 2026-07 → 2027-06 | L1 closed clean → L2 reached | First-dollar to low-5-figures ARR (**target**; 1–3 paying/pilot design-partner firms) | Merge PR #1 + PR #2 into `Main`; reconcile PraxHQ naming; test suite provably green in CI; first external firm through disclosure + live matter; Stripe live billing replacing the inquiry stub |
| **Y2** | 2027-07 → 2028-06 | L2 solid, L3 entry | $150K–$400K ARR (**target**) | 10–20 firms live; self-serve onboarding; Citation OS shipped with attorney-review gate; trust accounting (IOLTA) real; Switch Concierge (Filevine/Clio/MyCase import) live; Marketplace tier (LawMatch) live in at least 2 states with solicitation-compliance sign-off |
| **Y3** | 2028-07 → 2029-06 | L3 solid | $500K–$1.2M ARR (**target**) | Fleet master-plan anchor: "first franchise/white-label pilots (PraxHQ per-firm)"; 8 practice-area modules templated; Billing OS (time/invoice, distinct from platform subscription billing) live; VA phase-out playbook executed with ≥1 design-partner firm; monitoring/SLA live |
| **Y4** | 2029-07 → 2030-06 | L4 | $1.5M–$3M ARR (**target**) | Partner Hub + Doctor Portal + Vendor Portal live; Settlement Comparables DB reaches network-effect scale; Case Result Wall / content engine live; team-operable (Ricardo out of support loop) |
| **Y5** | 2030-07 → 2031-06 | L5 | $3M–$8M ARR (**target**) | Public API + plugin marketplace; white-label resale to other software companies; category leadership across ≥3 practice areas — the north-star state |

These are **PraxHQ's own bottom-up targets**, deliberately more conservative than `memory/ROADMAP.md`'s own math ("$6.3M ARR Year 1," "$100M+ ARR Year 3") — that document's projections assume 100–2,000 firms already on the platform with zero evidence of current external adoption; they are recorded there as the aspirational upside case, not this bible's committed number. This bible's targets reconcile against the fleet's own Y2 ≥$2M ARR *fleet-wide* (not per-project) target in `MASTER_BIBLE.md` §2.

---

## 5. PHASE PLAN

### Phase 0 — Foundation (DONE, historical)

**Goal:** Extract a shippable, white-label PI operations blueprint from real training corpus without fabricating anything. **Target level:** pre-L1. **Exit criteria:** met (2026-07-04).

- **0a.** Corpus intake, transcription, anonymization (168 video modules, 38 scripts, 106 templates, 4 intake-call transcripts). Tier **T1/T2**. Done.
- **0b.** Product definition docs (`product-capabilities.md`, `system-spec.md`, `gaps.md`, `IMPROVEMENTS.md`, `WHITE_LABEL.md`, `DISCLOSURE.md`). Tier **T2/T3**. Done.
- **0c.** 24 knowledge articles + 8 training guides. Tier **T2**. Done.

### Phase 1 — PI Case OS MVP close-out (IN PROGRESS — this is "now")

**Goal:** Turn the substantially-built backend/frontend into one coherent, provably-working, merged codebase and get the first real external firm through it. **Target level:** close L1, reach L2. **Exit criteria:** `Main` contains everything from PR #1 + PR #2, CI runs the 19-file test suite green, one external firm has acknowledged disclosure and run a live matter.

- **1a. Verify and green the existing test suite.** Fix the environment reproducibility gap (`MONGO_URL` / `.env` / `PYTHONPATH` not documented as a one-command dev bootstrap for test running specifically, vs. app running which `scripts/dev.sh` already covers). Add a CI job that runs `pytest tests/ -q` on every push to `Main`. Tier **T1** (scripting, config) escalate to **T2** if module-level bugs surface. Depends on: none. Size: 1 agent-day.
- **1b. Merge PR #1 (`claude/praxium-pi-sop-praxhq`).** Reconcile the 54-article set against the 24 articles already on `Main` (dedupe/renumber), bring in PraxHQ product/legal docs, resolve conflicts. Tier **T2** (merge, content reconciliation); **T-R** required before publishing any new disclosure/ToS/legal-facing language from that branch (attorney review gate per `DISCLOSURE.md`). Depends on: 1a not required but recommended first. Size: 2–3 agent-days.
- **1c. Merge PR #2 (`claude/praxium-expansion-systems`, stacked on PR #1).** Bring in Citation OS design, 8 practice-area module specs, Booking-vs-WellSky comparison spec, Billing OS spec, VA phase-out plan. Tier **T2** for straightforward merges; **T3** specifically for Citation OS (anti-hallucination citation-checking design is a hard integration problem — see Phase 3e); **T-R** for the VA phase-out plan (it is a staffing/operations decision affecting real people, not just code). Depends on: 1b merged first (stacked branch). Size: 2–3 agent-days plus a T-R review session.
- **1d. Fix `PROJECT_STATUS.md` staleness.** Rewrite it to reflect the actual state found in this bible's §2, or fold it into this bible and leave a pointer. Tier **T1**. Depends on: 1a–1c landing (so the rewrite is accurate, not another snapshot that goes stale in a week). Size: <1 agent-day.
- **1e. Close top P0 items from `IMPROVEMENTS.md`** not yet built: document-taxonomy classifier UI, redaction checklist enforcement before carrier send, Certificate-of-Records (COR) tracking, general white-label template-pack index in-app (currently only per-letter hardcoding exists). Tier **T2**; document-taxonomy tagging itself is mechanical enough to delegate at **T1** once the classifier contract is written. Depends on: 1a. Size: 3–5 agent-days total across sub-items.
- **1f. First external design-partner firm pilot.** Find or confirm a real PI firm (not Ricardo) willing to run at least one live matter through disclosure acknowledgment → intake → demand. This is the actual L1→L2 threshold — **T-R gate** (external relationship, cannot be delegated to any agent tier). Depends on: 1a–1e landed and demoable. Size: ongoing, target close by end of Y1.

### Phase 2 — Operable (L2)

**Goal:** A small number of real firms run their practice on PraxiumLaw with billing, support, and compliance hardening in place. **Target level:** L2. **Exit criteria:** 3–5 paying/pilot firms live and referenceable, Stripe billing live, trust accounting real, HIPAA-ready posture documented.

- **2a. Stripe live billing** replacing the `UpgradeInquiry` stub in `billing.py`; subscription tier gating enforced in RBAC. Tier **T2**. Depends on: 1f (need a real customer to bill). Size: 3–5 agent-days.
- **2b. Trust Accounting (IOLTA) — three-way reconciliation, audit-ready reports.** Tier **T3** (money-correctness-critical: a bug here is a bar-complaint risk, not just a product bug); **T-R** sign-off from a licensed attorney/accountant before any real trust dollars move through it. Depends on: 2a. Size: 1–2 agent-weeks.
- **2c. Switch Concierge** — Filevine/Clio/MyCase/Smokeball CSV import wizard + Mirror Mode (parallel sync during transition), lowering the switching-cost barrier that is Filevine's main retention lever. Tier **T2/T3**. Depends on: 1f. Size: 1–2 agent-weeks.
- **2d. Support path** — helpdesk/ticketing, onboarding runbook, documented SLA (even informal at this stage). Tier **T2**. Depends on: 1f. Size: 2–3 agent-days.
- **2e. External comms activation** — TextLine (Twilio/Telnyx SMS w/ TCPA opt-in tracking), MailEngine (SendGrid/Resend, CAN-SPAM auto-injected), eFax, CourtConnect live (real CourtListener API). Tier **T2**; **T-R** for any new carrier/vendor contract. Depends on: 2a (billing needs to exist before adding metered vendor costs). Size: 2–3 agent-weeks across sub-modules.
- **2f. HIPAA-ready hardening pass** — BAAs with subprocessors, audit logs, encryption at rest/in transit, documented for MedConnect's medical-record handling. Tier **T3**; **T-R** compliance sign-off before claiming HIPAA-ready anywhere in marketing. Depends on: 2b, 2c in progress. Size: 1–2 agent-weeks.
- **2g. Exit metric:** 3–5 paying/pilot firms live, at least one willing to be a public reference. **T-R** (relationship-dependent, not schedulable by tier).

### Phase 3 — Product (L3)

**Goal:** Sellable without Ricardo in the room. **Target level:** L3. **Exit criteria:** self-serve signup live, Marketplace lead-delivery live and compliant, Citation OS shipped with an attorney-review gate, first practice-area expansion beyond PI live.

- **3a. Self-serve signup + onboarding wizard** (no manual setup call required). Tier **T2**. Depends on: Phase 2 support path proven manually first (2d). Size: 1–2 agent-weeks.
- **3b. Multi-tenant isolation audit** — confirm per-firm data boundaries hold under real multi-firm load, not just multi-tenant *code*. Tier **T3**. Depends on: 2g (need ≥2 real firms to audit against). Size: 3–5 agent-days.
- **3c. Monitoring/alerting** — uptime, error rates, AI token-cost dashboards (currently no cron/monitoring observed in the repo — a gap, not just a future feature). Tier **T0/T2** (scripts + dashboard wiring). Depends on: none, can start any time. Size: 3–5 agent-days.
- **3d. Marketplace tier live** — LawMatch lead delivery, per-lead billing ($50 slip-and-fall / $150 standard PI / $500 catastrophic / $1,000 mass-tort per `ROADMAP.md`'s locked pricing). Tier **T2/T3**; **T-R** mandatory per-state solicitation-compliance sign-off (FL/NY 30-day blackout, NJ lead-gen rules, TX barratry, CA SB 94) before enabling in any state — this is a hard rule in `ROADMAP.md` §Compliance, carried forward here. Depends on: 3a, 2a. Size: 2–4 agent-weeks, state-by-state.
- **3e. Citation OS** — AI drafts/checks citations against CourtListener with an anti-hallucination check (the *Mata v. Avianca* failure mode named explicitly in planning). Tier **T3** (correctness-critical AI feature — wrong here is a sanctionable-conduct risk for a using attorney, not a UX bug); **T-R** gate: no AI-generated citation ships to a filing without attorney review, enforced in software (hard gate, same pattern as demand-send/reduction-% gates already in `product-capabilities.md` §15). Depends on: 1c merged (this is PR #2 content). Size: 2–4 agent-weeks.
- **3f. Billing OS** (firm-facing time tracking / invoicing / flat-fee profitability — distinct from PraxiumLaw's own platform subscription billing in 2a). Tier **T2**. Depends on: 1c merged. Size: 1–2 agent-weeks.
- **3g. VA phase-out playbook executed** with at least one design-partner firm (staff-augmentation → software-only transition). Tier **T-R** for the client/staffing decision itself; **T2** to build any supporting tooling (transition checklists, handoff dashboards). Depends on: 1c merged, 2g (need a real firm relationship to phase out VAs *for*). Size: ongoing per-firm engagement.
- **3h. 8 practice-area modules templated** beyond PI (family, criminal, bankruptcy, immigration, estate, etc., per `ROADMAP.md` item 4). Tier **T3** for the shared-engine design (one configurable matter-schema engine, not 8 forks — matches the fleet's "merge, never fork" tool-homing rule); **T2** per individual practice-area template once the engine exists. Depends on: 1c merged, 3b (multi-tenant isolation must hold before adding more practice types to the same tenants). Size: 2–3 agent-weeks for the engine, 3–5 agent-days per practice area after.

### Phase 4 — Scaled (L4)

**Goal:** Growth engine attached, team-operable, meaningful ARR. **Target level:** L4. **Exit criteria:** Partner Hub live, network-effect data assets reach critical mass, support/success does not require Ricardo.

- **4a. Partner Hub** (referral network for cases the subscribing firm can't take). Tier **T2/T3**. Depends on: 3d compliance-cleared in enough states to have volume worth routing. Size: 2–4 agent-weeks.
- **4b. Settlement Comparables Database + Insurance Carrier Intelligence** reaching genuine network-effect scale (anonymized closed-case data across firms). Tier **T3** for the data model/privacy design; **T0** for the ongoing ingestion cron. Depends on: 2g (need real closed cases from real firms to seed it — this cannot be built on synthetic data without losing its entire value proposition). Size: 3–6 agent-weeks initial build, then ongoing.
- **4c. Content/growth engine** — Case Result Wall (public, anonymized, SEO-tuned), automated review-request engine post-settlement. Tier **T2**; **T-R** gate: no case result publishes without client consent *and* attorney sign-off (privilege/PII risk, not a marketing-only decision). Depends on: 2g. Size: 1–2 agent-weeks.
- **4d. Team-operable ops** — documented support/success runbooks so growth doesn't bottleneck on Ricardo. Tier **T2** for docs; **T-R** for the underlying org/hiring decision. Depends on: 3c monitoring live (can't run support without visibility). Size: ongoing.
- **4e. Doctor Portal + Vendor (Tow/Body Shop) Portal full build** — two-sided network moat, currently UI-mocked only per `ROADMAP.md` Phase-1 inventory. Tier **T2/T3**. Depends on: 2f HIPAA posture (Doctor Portal touches PHI). Size: 3–5 agent-weeks combined.

### Phase 5 — Franchise/Platform (L5)

**Goal:** Others build and operate on PraxHQ. **Target level:** L5 (the north star). **Exit criteria:** public API live with real third-party consumers, at least one white-label resale deal signed, category leadership recognized in ≥3 practice areas.

- **5a. Public API + webhooks + plugin marketplace** so third-party developers build on Praxium the way they'd build on Twilio or Stripe. Tier **T3**. Depends on: 3b multi-tenant isolation proven at scale, 4d team-operable support (third-party devs need a support surface too). Size: 4–8 agent-weeks.
- **5b. White-label SaaS resale program** — selling PraxHQ to *other software companies*, not just law firms, per the L5 vision in this bible's brief. Tier **T3/T4** for deal/pricing structuring; **T-R** for actual contracts. Depends on: 5a, a proven L4 ARR base to resell against credibly. Size: quarters, not agent-days — this is a business-development phase, not a build phase.
- **5c. Multi-practice-area category leadership** — win the "general law-firm OS" comparison, not just the "PI tool" comparison. Tier **T3/T4**. Depends on: 3h (8 practice areas live), 4a–4e (growth + network effects proven in PI first). Size: ongoing, multi-year.
- **5d. Franchisee/reseller enablement kit** — docs, training, certification program so a partner can onboard a new firm without a PraxHQ engineer in the room. Tier **T2** to build; **T-R** to approve the certification bar. Depends on: 5b. Size: 2–4 agent-weeks.

---

## 6. REVENUE MODEL

**Pricing tiers (locked in `ROADMAP.md`, carried forward as this bible's pricing until superseded):**

| Tier | Price | Target firm | Note |
|---|---|---|---|
| Solo | $49/user/mo | Solo practitioners | Core firm OS only |
| Starter | $99/user/mo | 1–5 attorneys | + CaseChat, NativeSign, Reports, DocGen, Intake, Client Portal |
| Pro | $199/user/mo | 5–25 attorneys | + CourtConnect, MedConnect, Vendor Portal, voice cloning (1 voice) |
| Marketplace | $299/user/mo + per-lead | Lead-hungry firms | + LawMatch lead delivery ($50–$1,000/case by type), AI MedChron, Subrogation Engine |
| Enterprise | $499+/user/mo | Multi-office | + white-label client portal, dedicated CSM, SLA |

**Path to first dollar:** Phase 1f / Phase 2 — a design-partner firm pays Starter or Pro tier once Stripe billing (2a) replaces the inquiry stub. Nothing in the current repo generates revenue yet; `billing.py` only captures upgrade *interest*.

**Path to target ARR:** the Y1–Y5 ladder in §4. Unit economics at Pro tier, 15-user firm: $199 × 15 = $2,985/mo = $35,820/yr per firm. Ten such firms = ~$358K ARR (this bible's Y2 target range). The Marketplace per-lead fees are the highest-margin line once state-by-state compliance (3d) clears, but they are gated behind that compliance work — do not count marketplace revenue before the T-R sign-off lands per state.

**The sales math** ("$10,150/mo across 8+ tools today vs. $2,985/mo on Pro, save $85,980/yr") is the core pitch and does not need re-deriving; it's in `ROADMAP.md` and holds as long as the tool-replacement claims stay true (i.e., don't sell "replaces RingCentral" until VoxLine/telephony — Phase 2e — is actually live for that customer).

**Explicitly not this bible's committed numbers:** `ROADMAP.md`'s own "$6.3M ARR Year 1" and "$100M+ ARR Year 3" — those assume adoption levels (100–2,000 firms) with no supporting evidence of current pipeline. Treat them as upside scenario math, not a target to be held accountable to.

---

## 7. OPERATING CADENCE

**Today (Phase 1, pre-external-customer):**
- No crons or monitoring currently run against this product (a Phase 3c gap, not yet built).
- No daily/weekly automated cadence exists yet beyond the fleet's own session-level git hygiene (autosave checkpoints visible in git log).

**At L2 (Phase 2) — target cadence:**
- **Daily:** none automated yet beyond deploy health checks (`GET /api/health`).
- **Weekly:** Ricardo (or whoever owns this bible) reviews `WIRING_GAP_ROLLUP.md` burn-down and the P0 backlog in `IMPROVEMENTS.md`.
- **Per-release:** the `WHITE_LABEL.md` site/app checklist (no firm-specific names in default UI, templates use placeholders only, disclosure shown at first login and template download, jurisdiction fields required before SOL/lien generation, attorney role required for demand/reduction/disbursement) — this is a standing, binding gate, not optional.
- **Human reviews:** every new/edited client-facing template or article requires licensed-attorney review before publish (`DISCLOSURE.md`); attorney-role RBAC gates already enforce demand-send, reduction-%, and disbursement approval *in the product itself* — this is the strongest existing control and should be extended, never weakened, as new modules ship.

**At L3+ (Phase 3+):**
- **Daily:** monitoring/alerting (3c) — uptime, error rate, AI cost.
- **Weekly:** support/success metrics review once team-operable (4d).
- **Quarterly:** state-by-state solicitation-compliance review as Marketplace (3d) expands to new states.
- **Annual (every July):** bible review per the fleet's `MASTER_BIBLE.md` §6 cadence — level check, next-year targets, prune/park decisions.

---

## 8. RISKS & DEPENDENCIES

| Risk / dependency | Why it matters | Mitigation / owner |
|---|---|---|
| **Two unmerged branches drifting further from `Main`** | PR #1 (54 articles + PraxHQ docs) and PR #2 (Citation OS, practice-area modules, Billing OS, VA phase-out, WellSky comparison) hold real product content that isn't in the deployed app; the longer they sit, the harder the merge | Phase 1b/1c, prioritized, T-R legal review before any new disclosure/ToS content ships |
| **UPL / ethics / solicitation compliance** | The entire product touches attorney-client relationship management; a compliance miss (e.g., FL/NY 30-day blackout violation) is a bar-complaint risk, not a bug | Hard rules already named in `ROADMAP.md` §Compliance; T-R gate on Marketplace expansion per state (3d) |
| **HIPAA exposure via MedConnect** | Medical records flow through the product before any BAA/audit-log hardening (2f) is done | Do not onboard a real firm handling real PHI at scale until 2f lands; pilot firms in Phase 1f should be scoped to avoid bulk PHI ingestion until then |
| **`EMERGENT_LLM_KEY` / Emergent-pod dependency for AI features** | Per root `README.md`: "AI features available in Emergent pods only; UI works without them except streaming chat" — CoCounsel, AI intake fill, AI MedChron, and the planned Citation OS all inherit this dependency | Track as a platform dependency; Citation OS design (3e) should not assume the current AI provider is permanent |
| **MongoDB / hosting dependency, no CI test gate** | The 19-file test suite isn't provably green in this environment; a regression could ship unnoticed | Phase 1a: CI job running `pytest` on every push |
| **Attorney-review bottleneck** | Every template, article, and disclosure/ToS change needs licensed counsel sign-off (`DISCLOSURE.md`) — this does not scale with Sonnet/Opus tiers, it's a T-R constant | Batch legal-review requests; don't let Phase 1b/1c/2b/2f/3d/3e all compete for the same counsel review slot at once |
| **No confirmed external customer today** | Every later phase (2 onward) assumes a real firm relationship exists; if Phase 1f slips, everything downstream slips with it | Treat 1f as the single highest-priority T-R item in this bible |
| **Filevine incumbency / switching cost** | The entire pitch is "we pay your switching cost" — if Switch Concierge (2c) isn't genuinely low-friction, the pitch fails regardless of feature parity | Build 2c before aggressive Marketplace-tier sales push |
| **PraxHQ / PraxiumLaw naming split** | Planning docs, this bible's own title, and the `MASTER_BIBLE.md` registry all say "PraxiumLaw / PraxHQ" but the live product, domains, and ToS say only "PraxiumLaw" / "Praxium Suite" | Resolve as part of 1b — decide whether PraxHQ becomes the umbrella brand or stays a fleet-internal working name, and make the code match whichever is decided |
| **Adjacent E3 project overlap (GoldMedalInjury)** | `MASTER_BIBLE.md` lists GoldMedalInjury as a separate E3 project (consumer PI lead-gen); PraxHQ's own Praxa consumer app plus Marketplace lead delivery could overlap in scope | Out of scope for this bible to resolve — flag for a fleet-level (T4/T-R) decision if the two start competing for the same leads |

**Kill criteria:** none defined yet. This bible does not currently recommend a kill/pause condition — the product has real, working code and a differentiated thesis. Revisit at the Y1 annual review (2027-07) if Phase 1f (first external firm) has not been reached by then.

---

## 9. GOVERNANCE & GATES

**T-R (Ricardo-only) gates, binding on this project:**

1. Publishing any new or edited client-facing template, article, disclosure, or ToS/legal-facing language — requires licensed-attorney review per `DISCLOSURE.md`, not just Ricardo's own sign-off (attorney review is a distinct, stricter gate than a normal T-R product decision).
2. Demand-letter send, reduction-percentage approval, expensive-treatment spend approval, litigate/settle/drop decisions, trust disbursement approval, minor's-compromise handling, conflict-waiver strategy — all already enforced as **in-product RBAC hard gates** (staff prepare, attorney approves) per `product-capabilities.md` §15; do not weaken these when building new modules.
3. Any new carrier/vendor contract (Twilio/Telnyx, SendGrid, Daily.co/LiveKit, ElevenLabs, InfoTrack, Tyler Odyssey, etc.).
4. Enabling Marketplace lead-delivery in any new state (per-state solicitation-compliance sign-off).
5. VA phase-out execution with any specific firm (staffing/relationship decision).
6. White-label resale deals and franchise/reseller certification bar (Phase 5).
7. Merging PR #1/PR #2 legal-facing content is **T2** work to merge, but publishing it live is **T-R** gated on the attorney-review item above.

**Standing safety rules carried into this bible:**

- **De-identification (Van Law rule):** no client-specific, case-specific, or historical-firm-specific material may ever appear in shippable docs, articles, templates, or product UI. `WHITE_LABEL.md`'s placeholder table (`{{FIRM_NAME}}`, `{{ATTORNEY_NAME}}`, etc.) and its "never ship" list (named firms/attorneys/staff, specific phone/email/addresses from training sources, historical firm branding, jurisdiction-specific statutes presented as universal) are binding on every future PI-adjacent or practice-area module, not just the original corpus.
- **No-legal-advice boundary:** PraxHQ ships SOPs and operations tooling, **not legal advice**. Every article, template, and AI response (CoCounsel, Praxa Insurance Coach, future Citation OS) carries the "not legal advice / talk to a licensed attorney" disclaimer. This is the same boundary pattern the fleet already enforces for GoldMedalInjury and the Credit Engine ("no-advice boundary" / "honesty gate").
- **Release lanes:** per the fleet's `expedia-solutions/CLAUDE.md`, commit/push/deploy on this repo is risk-tier 3 ("ask") — Ricardo's explicit approval is required for push/deploy specifically; local commits of verified work should still happen incrementally (standing fleet git-hygiene rule) so work isn't lost to fleet automation.
- **No fabrication rule:** per `SOURCES.md` and `gaps.md`, nothing may be invented to fill a training-corpus gap. Where the corpus is silent (case valuation, cold-lead phone scripts, full litigation playbooks), the product must surface the gap, not paper over it with generated content.
- **Doc-integrity rule:** a bible or status doc that contradicts reality is a P1 doc bug (fleet `MASTER_BIBLE.md` §6). `PROJECT_STATUS.md`'s staleness (§2, gap #3) should be fixed under this rule, not left as-is.

---

## 10. CHANGELOG

- **2026-07-11** — v1 created. First full Bible for PraxiumLaw/PraxHQ following `BIBLE_TEMPLATE.md`. Current-state assessment based on direct repo inspection (`Main` branch working tree): confirmed 14 PI backend modules + 13 frontend matter-tab components exist and are wired (contradicting the stale 2026-07-04 `PROJECT_STATUS.md`); confirmed 24 (not 54) knowledge articles on `Main`; confirmed zero "PraxHQ" references anywhere in the repo; confirmed test suite present but unverified passing in this session (env config gap: `MONGO_URL` unset); confirmed no external paying/pilot firm evidenced in the repo. Two branches (PR #1 `claude/praxium-pi-sop-praxhq`, PR #2 `claude/praxium-expansion-systems`) noted as unmerged and not independently inspected in this pass (git-command restriction on this task) — their content is carried forward from prior-session fleet memory only, flagged as unverified.
- **2026-07-28** *(backfilled 2026-08-02 — this merge wasn't logged here at the time, a changelog gap)* — PR #1 (`claude/praxium-pi-sop-praxhq`, the 45-article PI SOP expansion + PraxHQ docs) merged into `Main` as `888e967`; articles directory grew from 24 to 55 files.
- **2026-08-02** — Phase 1a (test env/CI): added `backend/tests/conftest.py` (centralizes the `MONGO_URL`/env-var defaults + `mongomock_motor` monkeypatch that previously only worked as a side effect of full-suite alphabetical collection order — partial/isolated `pytest` runs used to fail collection with `KeyError: 'MONGO_URL'`, now fixed and verified) and `.github/workflows/ci.yml` (backend pytest + frontend vite build on push/PR to `Main` — no CI existed before this). First CI run is red on ~13 pre-existing failures + ~50 errors (live-server-dependent integration tests + shared-mongomock-state flakiness); confirmed via a baseline-worktree comparison on unmodified `Main` that this predates and is unrelated to the PR #2 merge below — full stabilization is separate follow-up work, not attempted in this pass.
  <br>Merged PR #2 (`claude/praxium-expansion-systems`) into `Main` as `ae111b8` — a real 3-way `git merge` (not a squash/rebase), 2 trivial additive conflicts (`backend/db_indexes.py`, `backend/env.production.example`, both "add both sides' lines"), verified with a real merge attempt (not the legacy `git merge-tree` tool, which mishandles the CRA→Vite rename history on this branch pair) before resolving. **Scoping decision (Ricardo-approved): PI-only for now.** Citation OS, Billing OS, and the shared exception-queue/gate/persistence/webhook core merged in full — approved regardless of practice-area scope, per Ricardo's own framing of what PR #2 contains. The practice-area **module engine** (`backend/practice_modules.py`) also merged as-is, unmodified — judged "cleanly separable/inert until configured" rather than needing surgery, because it already defaults every firm to personal-injury-only (`DEFAULT_ENABLED`), the PI module can't be disabled, and every other module needs an authenticated firm-admin `settings.write` toggle to turn on. What did **not** merge: the public marketing pages for the other 8 injury verticals — `PracticeAreas.jsx`, `PracticeAreaDetail.jsx`, the `/practice-areas` + `/practice-areas/:slug` routes, and every "Practice areas" nav/footer/proof-strip link pointing at them (`Landing.jsx`, `LandingMobileNav.jsx`, `MarketingShell.jsx`) — because that content would have advertised workers' comp/med-mal/premises/mass-tort/etc. as live capability before any firm besides us has signed up. That content isn't deleted from history — it's sitting on `claude/praxium-expansion-systems`, and `frontend/src/data/expansion.js` keeps a one-line pointer to it. Verified before merging: `vite build` clean; `pytest tests/` collects all 172 tests (no import errors from any of the 12 new backend modules); pass/fail profile matched the pre-existing baseline (no regression traced to the merge). **Open flag, not a merge blocker (nothing below is reachable with PI as the only enabled module):** `docs/practice-areas/README.md` already states every non-PI module's deadline pack and forms "must be jurisdiction-verified by counsel before the module is enabled for a firm" — that review hasn't happened, `SettingsModules.jsx` carries the disclaimer client-side, and nobody should flip a non-PI module on for a real firm until an actual attorney signs off, not just a code reviewer.
