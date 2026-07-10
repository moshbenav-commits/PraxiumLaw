# PraxHQ ↔ PI Case OS — Integration Map

PraxHQ is **the personal injury helper — the customer-communication tool**. This maps how that client-facing helper plugs into the [case lifecycle](../pi-case-os/articles/00-case-lifecycle-and-workflow-map.md): at each phase, PraxHQ's job is to **keep the client informed and moving** while the firm works the file behind it. For each phase: what PraxHQ does, which SOP article it supports, and the **compliance guardrail** that keeps it a helper/communication tool (not UPL, capping, or a fee-split). Guardrails trace to [`LEGAL_REGULATORY_RESEARCH.md`](./LEGAL_REGULATORY_RESEARCH.md).

---

## Phase-by-phase

| Phase | PraxHQ role | SOP article | Guardrail |
|-------|-------------|-------------|-----------|
| **Lead & qualify** | Intake forms, photo/doc upload, e-sign starter; schedule the consult | [35](../pi-case-os/articles/35-lead-intake-and-signup-operations.md), [23](../pi-case-os/articles/23-intake-forms-and-signature-packet.md) | Client **self-initiates**; no paid steering to the firm (NRS 7.045). No legal advice in-app. |
| **Sign up** | Deliver retainer/HIPAA/intake packet; capture e-signatures; open the app-to-file link | [23](../pi-case-os/articles/23-intake-forms-and-signature-packet.md) | Fee agreement is the **firm's**, attorney-reviewed. PraxHQ is the delivery channel, not a party to the fee. |
| **Open claims** | Notify client claims are open; collect carrier/adjuster info the client has | [04](../pi-case-os/articles/04-opening-3p-and-1p-claims.md), [14](../pi-case-os/articles/14-client-insurance-script.md) | App relays info; **staff/attorney** communicate with carriers. |
| **Property damage / towing** | Request/dispatch **towing & roadside**; vendor app confirms; store estimates/photos | [03](../pi-case-os/articles/03-property-damage-liability-timing.md) | Towing vendors receive **logistics only, no PHI**. Vendor fees are flat, not per-referral. |
| **Treatment mgmt** | Appointment reminders, directions, **ride coordination** (if firm offers), doctor portal for records/updates | [05](../pi-case-os/articles/05-treatment-gaps-and-mri-timing.md), [16](../pi-case-os/articles/16-treatment-compliance-coaching.md), [21](../pi-case-os/articles/21-medical-lor-workflow.md) | Doctor connection is **neutral**; no pay-for-referral. **BAA + HIPAA** for any PHI. Rides get no diagnosis data. |
| **Case review / cadence** | Automated status updates, check-ins, and the [call cadence](../pi-case-os/articles/11-client-call-cadence.md) reminders; nudge missing items | [07](../pi-case-os/articles/07-thirty-day-case-review.md), [11](../pi-case-os/articles/11-client-call-cadence.md), [06](../pi-case-os/articles/06-social-media-and-subrosa.md) | Status **relay** only; no legal opinions or valuations. |
| **Records & demand** | Collect records/bills via doctor portal; surface a completeness checklist to staff | [09](../pi-case-os/articles/09-demand-prep-checklist.md), [20](../pi-case-os/articles/20-certificate-of-records.md), [21](../pi-case-os/articles/21-medical-lor-workflow.md) | PraxHQ gathers; **attorney/case manager** drafts the demand ([39](../pi-case-os/articles/39-demand-letter-drafting.md)). |
| **Negotiate / litigate** | Notify client of milestones; schedule meetings/depositions | [10](../pi-case-os/articles/10-settlement-calculator-scenarios.md), [31](../pi-case-os/articles/31-litigation-handoff-and-management.md) | **No** negotiation or advice by the app. Attorney-gated. |
| **Settle / disburse** | Show client the status, collect signatures on releases/disbursement statement | [27](../pi-case-os/articles/27-settlement-and-disbursement-workflow.md), [25](../pi-case-os/articles/25-disbursement-sheet-preparation.md) | Money stays in **attorney IOLTA**; PraxHQ never holds/controls settlement funds. |
| **Close out** | Deliver closing letter/docs; satisfaction survey | [40](../pi-case-os/articles/40-file-closeout-reconciliation-and-retention.md) | Retention/security per HIPAA + [ops policy](../pi-case-os/articles/38-firm-operations-and-office-policies.md). |

## Who connects, and what they see (data segregation)

| Party | Sees | Never sees |
|-------|------|-----------|
| **Consumer/client** | Their own case status, appointments, docs, messages | Other clients; firm-internal strategy |
| **Doctor/clinic** (BAA) | Records requests, appointments for *their* patients | Legal strategy; unrelated PHI (minimum necessary) |
| **Towing/roadside** | Location, vehicle, contact for the job | **Any PHI**, case details |
| **Firm staff/attorney** | Full case file link, client messages | — |

## Revenue model in the flow (compliant)

PraxHQ bills **flat SaaS/admin fees** (to firm and/or providers) and, if used, a **clearly-disclosed consumer service fee** for real non-legal coordination. It takes **no percentage** of settlement or legal fees, and **no per-referral** payments. See the [compliant reference architecture](./LEGAL_REGULATORY_RESEARCH.md#compliant-reference-architecture-take-this-to-counsel).

## Cross-cutting SOP hooks

- **Anti-capping / anti-kickback / referral-source policy** — the new SOP article [44](../pi-case-os/articles/44-referral-sources-and-marketing-compliance.md) governs how PraxHQ may and may not acquire and route clients.
- **Ethics/CLE** — [37](../pi-case-os/articles/37-cle-and-ethics-compliance.md). **Correspondence-to-file** — [34](../pi-case-os/articles/34-correspondence-and-communications.md). **CMS setup** — [36](../pi-case-os/articles/36-case-management-system-setup.md).

## Build sequence (suggested)

1. **Counsel sign-off** on the model (research memo checklist) — *gate 0, do not skip.*
2. HIPAA foundation (BAAs, Security Rule) before any PHI flows.
3. Client app: intake, reminders, messaging, doc upload, status.
4. Doctor portal (BAA-gated) for records/appointments.
5. Towing/roadside vendor app (logistics-only).
6. Firm console tying it all to the case file.
