# Module: Mass Tort

High-volume claims against common defendants (drug/device, environmental, consumer-product waves). Extends article [32 — mass tort intake and management](../pi-case-os/articles/32-mass-tort-intake-and-management.md) into a full module. **The economics are volume economics — this module is mostly about scale controls.**

## 1. Scope
In: participation in established mass-tort dockets (MDL/coordinated proceedings) as claimant-side intake/workup firm; referral or co-counsel models. Out: originating novel mass actions (leadership-track work) unless the firm opts in.

## 2. Intake deltas
Campaign-driven: each tort gets a **criteria card** (exposure product, dates, injury signature, disqualifiers) and a scripted qualification flow the intake rail runs at volume. Proof-of-use evidence list per tort (pharmacy records, implant cards, purchase history). Urgency triggers: docket registration/census deadlines.

## 3. Lifecycle deltas
Replaces the per-case negotiation arc with: `qualified → signed → proof_of_use_collected → records_workup → docket_registered/census → settlement_program_matrix → award → disbursement`. Attorney gates at qualification criteria approval (per campaign) and settlement-program election. Cases move in **cohorts**, not individually — the lifecycle engine needs bulk phase-transition (`CORE-BUILD: cohort operations` — bulk tasking, bulk status, exception queues).

## 4. Document pack
Campaign retainer + co-counsel/referral agreements, proof-of-use collection letters, plaintiff fact sheet (PFS) shells per docket, census/registration forms, settlement-program claim forms, lien-resolution program enrollments.

## 5. Deadline pack (categories)
Tort-specific SOL/tolling agreements · census/PFS deadlines · settlement-program registration and claim windows. Deadlines are **per-campaign packs** loaded when a campaign opens.

## 6. Damages model deltas
Settlement matrices (injury tier × exposure factors) replace individual negotiation modeling; worksheet maps client facts to matrix tiers for expected-value scoring at intake.

## 7. Counterparty map
Claims administrators and lien-resolution programs more than adjusters; co-counsel coordination is a first-class relationship (fee-split tracking → [Billing OS](../billing-os/README.md)).

## 8. Compliance flags
Advertising rules for mass-tort solicitation (review per state), fee-division disclosure and client consent for referral/co-counsel splits, aggregate-settlement consent rules (each client consents individually), lien resolution at scale (Medicare global programs).

## 9. KPIs
Cost-per-qualified-signup, PFS/census on-time rate (target 100%), proof-of-use completion rate, time-in-records-workup, per-campaign ROI.

## 10. Reuse map
Unchanged: e-sign, comms (bulk-templated), records retrieval (bulk mode), trust/disbursement (bulk mode). New `CORE-BUILD`: cohort operations + campaign manager (criteria cards, per-campaign deadline/document packs).
