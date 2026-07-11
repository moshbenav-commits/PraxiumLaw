# Billing OS — Automation Spec

Five automated flows over one financial ledger per case. Every figure traces to a source document; every negotiation step is logged; every payout is attorney-gated.

## The case financial ledger

One append-only ledger per case holding: **Provider bills** (billed, adjustments, paid-by, outstanding), **Liens** (medical, statutory, contractual, [non-medical](../pi-case-os/articles/53-non-medical-liens-and-claims.md)), **Subrogation claims** (health plan, Medicare/Medicaid, ERISA — classification matters, see flow 3), **Costs advanced**, **Fees** (contract %, referral/co-counsel splits), **Settlement proceeds**, **Disbursements**. The ledger *is* the [damages worksheet](../pi-case-os/DAMAGES_WORKSHEET.md) specials feed and the [disbursement sheet](../pi-case-os/articles/25-disbursement-sheet-preparation.md) source — no re-keying anywhere.

## Flow 1 — Bill capture & verification

- **Ingest:** every document classified `medical_bill`/`lien_notice`/`EOB` by the [document taxonomy](../pi-case-os/articles/18-document-taxonomy.md) rail auto-parses into ledger line items (provider, dates of service, CPT-level detail where present, billed amount). Confidence-gated like Citation OS extraction — low confidence routes to human keying.
- **Completeness watch:** treatment calendar ([Booking](../praxhq/BOOKING_SYSTEM_SPEC.md) VisitOutcomes) vs. bills received — visits without bills trigger provider bill-requests automatically ([08 — meds tab hygiene](../pi-case-os/articles/08-meds-tab-and-record-hygiene.md), automated).
- **Balance verification loop:** before demand and again before disbursement, written balance confirmations go to every provider/lienholder; non-responses re-letter on a timer (same persistence engine as [Citation OS §3](../citation-os/PIPELINE_SPEC.md)). Discrepancy between confirmed and ledger → exception queue.

## Flow 2 — Lien & subrogation management

- Every lien gets: classification (who, legal basis, priority), notice-received date, claimed amount, verified amount, and a **resolution state machine** (`asserted → verified → negotiating → resolved → paid → release_received`). **`release_received` is the terminal state — a paid lien without a written release stays open.**
- Medicare: conditional-payment monitoring, final-demand sequencing, and MSA flags follow [48](../pi-case-os/articles/48-medicare-set-aside-and-future-medicals.md); the system tracks portal/status checks as recurring tasks and hard-blocks disbursement while a final demand is outstanding.
- ERISA vs. state-law plan classification is an attorney call; the system collects plan documents and tees up the analysis ([29](../pi-case-os/articles/29-health-insurance-subrogation.md)).

## Flow 3 — Reduction negotiation engine

Automates [26 — reduction requests](../pi-case-os/articles/26-reduction-requests-and-negotiation.md):

- **Reduction plan:** at settlement, the engine computes the client-net picture and generates a per-lienholder ask sheet (statutory reduction rights, made-whole/common-fund doctrines where applicable — flagged by jurisdiction, applied by attorney).
- **Ask → counter → accept loop:** drafts reduction letters from the certified template pack, sends, logs counters, re-drafts. Every offer/counter in the offer log. **Attorney approves each outbound ask and each acceptance.**
- **Batch leverage:** same-provider reductions across multiple cases are surfaced together so the firm negotiates portfolio-level (with per-client consent boundaries respected — no aggregate trades without individual consent).

## Flow 4 — Settlement & disbursement

Automates [25](../pi-case-os/articles/25-disbursement-sheet-preparation.md) + [27](../pi-case-os/articles/27-settlement-and-disbursement-workflow.md):

- Settlement recorded → ledger locks a **disbursement draft**: proceeds − fees − costs − verified liens/bills (post-reduction) = client net. Every line links to its verification document; unverified line = blocked sheet.
- Gates in order: balances verified → liens resolved (releases in hand or holdback approved) → **attorney approves sheet** → client reviews and e-signs (PraxHQ Live signing session) → checks/transfers prepared → attorney authorizes trust movement → paid → releases confirmed → [closeout reconciliation](../pi-case-os/articles/40-file-closeout-reconciliation-and-retention.md).
- Minors/wrongful-death allocations route through the court-approval workflow first ([30](../pi-case-os/articles/30-minors-compromise-and-court-approval.md), [wrongful-death overlay](../practice-areas/wrongful-death.md)).

## Flow 5 — Trust accounting

Automates [45](../pi-case-os/articles/45-trust-accounting-and-reconciliation.md): per-client sub-ledgers, continuous three-way reconciliation against bank feed, zero-balance-on-close enforcement, stale-funds aging alerts, and an immutable audit trail. Any unreconciled delta pages a human same-day. **The system never initiates a bank transaction** — it prepares and records; signatory humans execute.

## Automation map

| Work | Level |
|------|-------|
| Bill/EOB parsing to ledger | Automated (confidence-gated) |
| Missing-bill chasing, balance-verification letters | Automated persistence loop |
| Lien state tracking, release chasing | Automated |
| Medicare status checks / final-demand sequencing | Automated tasks, attorney-owned decisions |
| Reduction asks/acceptances | Auto-drafted → **attorney gate** |
| Disbursement sheet | Auto-assembled → **attorney gate + client e-sign** |
| Trust movements | Prepared only — **human signatory executes** |
| Reconciliation | Continuous automated + human exception queue |

## KPIs

Bill-capture latency (service→ledger), % balances verified in writing before demand, lien release-in-hand rate at closeout (target 100%), average reduction % by lienholder type, settlement-to-client-payment cycle time, reconciliation exceptions (target zero), billing-department hours per case (the headline automation metric — see [VA automation plan](../automation/VA_AUTOMATION_PLAN.md)).
