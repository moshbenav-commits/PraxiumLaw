# PraxiumLaw Practice-Area Expansion — Core + Modules

PraxiumLaw is no longer "a PI product." It is a **shared injury-firm operating core** plus **practice-area modules**, so the same platform sells to every injury vertical — not just auto-accident personal injury.

**Status:** architecture + module specs. The PI vertical (the [PI Case OS](../pi-case-os/README.md), articles 00–53) is the reference implementation; every module below is defined as **deltas against that core**.

## The shared core (built once, reused by every module)

| Core capability | Source of truth |
|-----------------|-----------------|
| Intake, conflict check, signup, e-sign packet | Articles [01](../pi-case-os/articles/01-intake-needs-list.md), [13](../pi-case-os/articles/13-conflict-check-and-related-cases.md), [23](../pi-case-os/articles/23-intake-forms-and-signature-packet.md), [35](../pi-case-os/articles/35-lead-intake-and-signup-operations.md), [47](../pi-case-os/articles/47-inbound-lead-intake-call-script.md) |
| Case lifecycle engine (phases, gates, tasks) | [00 lifecycle map](../pi-case-os/articles/00-case-lifecycle-and-workflow-map.md) + [phase checklists](../pi-case-os/checklists/) |
| Records/bills retrieval + document taxonomy | Articles [02](../pi-case-os/articles/02-hospital-bills-client-retrieves.md), [18](../pi-case-os/articles/18-document-taxonomy.md), [52](../pi-case-os/articles/52-records-retrieval-and-vendors.md) |
| Client communication cadence, EN/ES templates | Article [11](../pi-case-os/articles/11-client-call-cadence.md) + [templates](../pi-case-os/templates/client-comms/) |
| Demand/claims engine | Articles [09](../pi-case-os/articles/09-demand-prep-checklist.md), [39](../pi-case-os/articles/39-demand-letter-drafting.md) |
| Liens, subrogation, reductions, disbursement, trust | Articles [25](../pi-case-os/articles/25-disbursement-sheet-preparation.md)–[29](../pi-case-os/articles/29-health-insurance-subrogation.md), [45](../pi-case-os/articles/45-trust-accounting-and-reconciliation.md) + [Billing OS](../billing-os/README.md) |
| Scheduling/booking + client app | [PraxHQ](../praxhq/README.md) + [Booking System](../praxhq/BOOKING_SYSTEM_SPEC.md) |
| Deadlines/SOL calendaring | [Scheduling module](../praxhq/SCHEDULING_MODULE.md) deadline engine |
| KPIs & case grading | [KPIS_AND_CASE_GRADE](../pi-case-os/KPIS_AND_CASE_GRADE.md) |

## What a module is

A module = configuration + content pack on the core, defined by [`MODULE_TEMPLATE.md`](./MODULE_TEMPLATE.md): intake deltas (questions, disqualifiers, urgency triggers), lifecycle deltas (extra/changed phases and gates), document pack, deadline pack (the vertical's killer dates), damages model deltas, negotiation counterparty map, compliance flags, KPIs. **A firm turns a module on; nothing is forked.**

## Modules

| Module | Spec | Maturity of source material |
|--------|------|------------------------------|
| Personal injury (auto) | [PI Case OS](../pi-case-os/README.md) | **Reference implementation** |
| Workers' compensation | [`workers-compensation.md`](./workers-compensation.md) | Seeded by article [42](../pi-case-os/articles/42-workers-compensation-coordination.md) |
| Medical malpractice | [`medical-malpractice.md`](./medical-malpractice.md) | New |
| Premises liability | [`premises-liability.md`](./premises-liability.md) | Seeded by article [41](../pi-case-os/articles/41-premises-liability-slip-and-fall.md) |
| Product liability | [`product-liability.md`](./product-liability.md) | New |
| Mass tort | [`mass-tort.md`](./mass-tort.md) | Seeded by article [32](../pi-case-os/articles/32-mass-tort-intake-and-management.md) |
| Nursing home abuse/neglect | [`nursing-home-abuse.md`](./nursing-home-abuse.md) | New |
| Dog bite / animal attack | [`dog-bite.md`](./dog-bite.md) | New |
| Wrongful death | [`wrongful-death.md`](./wrongful-death.md) | New (overlay module — combines with any of the above) |
| Citations/tickets | [Citation OS](../citation-os/README.md) | New (non-injury; proves the core generalizes) |

## Rollout order (recommended)

1. **Premises + dog bite** — smallest deltas from PI core; same insurers, same medical rails.
2. **Workers' comp** — big market, administrative-forum engine is the main new build.
3. **Wrongful death overlay** — unlocks high-value cases across all modules.
4. **Mass tort** — volume economics; needs the bulk-intake scaling work.
5. **Med-mal + product liability** — expert-witness and evidence-preservation machinery; highest complexity, do them once the expert-management component exists.

## Rules

Everything inherits the [PI Case OS product rules](../pi-case-os/README.md#product-rules) (no fabrication, white-label, counsel review, attorney gates) and [DISCLOSURE](../pi-case-os/DISCLOSURE.md). Each module's deadline pack and forms **must be jurisdiction-verified by counsel before the module is enabled for a firm** — module specs below name the deadline *categories*, never hard-coded numbers.
