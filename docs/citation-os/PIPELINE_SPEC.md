# Citation OS — Pipeline Spec

End-to-end pipeline from "a ticket exists" to "matter resolved and archived." Built as a **state machine**; every transition is either automated, automated-with-review, or attorney-gated.

## 1. Intake — finding the ticket

Tickets arrive three ways; all normalize into one **Citation record**.

| Channel | How it works |
|---------|--------------|
| **Email/mail scan** | A monitored intake mailbox (firm scan-to-email, client forwards a photo, mail-scanning service) is polled continuously. A classifier flags messages that look like citations: issuing-agency sender domains, keywords (citation, notice to appear, violation, fine, court date), and attachment OCR hits on citation-number patterns. |
| **Client upload** | Client photographs the ticket in the app (same rail as [hospital-bill retrieval](../pi-case-os/articles/02-hospital-bills-client-retrieves.md)). |
| **Court/agency portal watch** | Where a jurisdiction exposes a case-lookup portal, a scheduled job re-checks known client identifiers for new citations and status changes. |

**Extraction.** OCR + structured extraction pulls: citation number, issuing agency, court, violation code(s) and description, issue date, **response deadline**, appearance date, fine amount, officer/device ID, location, vehicle/license data. Every extracted field carries a confidence score; anything below threshold routes to human verification before the record is trusted. *A wrong citation number or deadline poisons everything downstream — verification is mandatory on first ingest.*

**Dedup + conflict check.** Match against existing citations and run the standard [conflict check](../pi-case-os/articles/13-conflict-check-and-related-cases.md).

## 2. Triage & engagement (attorney-gated)

1. **Jurisdiction lookup** — pull the court's row from the Jurisdiction Matrix: response methods (e-file / mail / in person), available dispositions (dismissal, amendment to non-moving, traffic school, deferral, fine reduction), whether attorney may appear for client, local fee schedule.
2. **Options memo (drafted, not decided)** — the system assembles the eligible options with deadlines and costs. **The attorney selects the strategy**; the client e-signs the engagement + limited-scope representation and fee agreement (flat fee) via the existing [signature packet](../pi-case-os/articles/23-intake-forms-and-signature-packet.md) rail.
3. **Deadline fan-out** — response deadline, appearance date, and internal buffers (D-14, D-7, D-3) land on the [deadline calendar](../praxhq/SCHEDULING_MODULE.md).

## 3. Document generation & submission

From the attorney-approved strategy, the pipeline generates the filing set from the [Document & Letter Matrix](./DOCUMENT_AND_LETTER_MATRIX.md) (entry of appearance, not-guilty plea / written declaration, discovery request, mitigation letter, continuance motion, traffic-school request — whatever the strategy calls for), pre-filled from the Citation record and firm/attorney profile.

- **Review gate:** every generated document is attorney-reviewed on first use of a template in a jurisdiction; after a template+jurisdiction pair is certified, routine regenerations go out on a lighter per-batch review.
- **Submission adapters:** e-filing where supported; otherwise print-and-mail (certified where required) via a mail API, or calendar a physical filing task. Every submission stores proof (e-file receipt, mail tracking) on the record.
- **Follow-the-mail loop:** the intake mailbox watcher (step 1) also catches **responses** — court acknowledgments, prosecutor counter-offers, hearing notices — and attaches them to the matter, advancing the state machine. Unanswered submissions auto-generate a status-inquiry letter at +14/+30 days. This is the "keep sending the letters" loop: **every outbound item schedules its own expected-response timer; silence triggers the next letter.**

## 4. Negotiation — driving the price down

Negotiation is attorney-conducted; the system does the preparation and the persistence:

- **Mitigation pack builder** — assembles the factors that move prosecutors and courts: driving record abstract, equipment-fix proof ("fix-it" compliance), calibration/discovery gaps, completion certificates (traffic school, defensive driving), hardship documentation. Analogous to the [demand-prep checklist](../pi-case-os/articles/09-demand-prep-checklist.md) — evidence assembled *before* the ask.
- **Ask ladder** — per jurisdiction, an ordered sequence of outcomes (dismissal → amend to non-moving/no-point violation → deferred adjudication → fine reduction → payment plan) with the standard letter/motion for each rung. The attorney picks the rung; the system drafts, sends, and tracks the counter.
- **Offer log** — every offer/counter-offer with source, date, and terms, so the attorney sees the negotiation history at a glance (mirrors [reductions negotiation](../pi-case-os/articles/26-reduction-requests-and-negotiation.md) mechanics).
- **Client authority** — accepting any disposition requires recorded client consent (in-app confirmation or e-sign), then the acceptance filing is generated and submitted.

## 5. Resolution & closeout

Record the disposition; verify the court's records reflect it (portal re-check); confirm fine payment / traffic-school completion by deadline; generate the client closing letter with outcome and any point/insurance implications flagged **as information, not advice**; archive per [file closeout](../pi-case-os/articles/40-file-closeout-reconciliation-and-retention.md).

## State machine

`detected → verified → conflict_cleared → engaged → strategy_set → filed → awaiting_response ⇄ negotiating → disposition_offered → client_approved → resolved → verified_closed`

Failure/exit states: `declined` (client didn't engage), `withdrawn`, `defaulted` (**must never be reached by system inaction** — a matter approaching deadline with no next action pages a human), `referred_out` (out-of-scope severity, e.g. DUI/criminal — auto-flag, never handled by this pipeline).

## Automation map

| Step | Automation level |
|------|-----------------|
| Mailbox watch, OCR, extraction | Automated (confidence-gated) |
| Dedup, conflict check, jurisdiction lookup | Automated |
| Options memo, engagement packet | Auto-drafted → **attorney gate** |
| Strategy selection | **Attorney only** |
| Document generation | Automated from certified templates → per-batch review |
| Submission + proof capture | Automated where adapters exist |
| Response ingestion, timers, follow-up letters | Automated |
| Negotiation asks/counters | Auto-drafted → **attorney gate** per rung |
| Disposition acceptance | **Client consent + attorney gate** |
| Closeout verification | Automated with human spot-check |

## KPIs

Cycle time (detect→resolve), % resolved without appearance, average fine reduction vs. face amount, dismissal/amendment rate, deadline-incident count (**target: zero**), cost per matter, matters per staff-hour. Feed the standard [KPI system](../pi-case-os/KPIS_AND_CASE_GRADE.md).
