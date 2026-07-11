# PraxiumLaw Expansion — Systems Overview

Second wave of PraxiumLaw system docs, stacked on the [PI Case OS](./pi-case-os/README.md) (articles 00–53) and [PraxHQ](./praxhq/README.md). Five systems that take the product from "PI case management" to "the operating system for every injury firm."

| # | System | Docs | One-liner |
|---|--------|------|-----------|
| 1 | **Citation OS** | [`citation-os/`](./citation-os/README.md) | Ticket arrives by mail/email → extract → file the right documents → letter persistence loop → negotiate the fine down. Attorney-gated throughout. |
| 2 | **Practice-area modules** | [`practice-areas/`](./practice-areas/README.md) | Shared core + 9 vertical modules (workers' comp, med-mal, premises, product, mass tort, nursing home, dog bite, wrongful-death overlay, citations) — sell to every injury vertical, not just PI. |
| 3 | **PraxHQ Booking** | [`praxhq/BOOKING_SYSTEM_SPEC.md`](./praxhq/BOOKING_SYSTEM_SPEC.md) | Full booking product: WellSky-class table stakes + the cross-org legal-medical layer (case-linked, gap-driven, transport-aware, client self-serve) they can't follow. |
| 4 | **Billing OS** | [`billing-os/`](./billing-os/README.md) | The billing department as software: bill capture, lien/subrogation state machines, reduction negotiation engine, disbursement, continuous trust reconciliation. |
| 5 | **VA automation & phase-out** | [`automation/VA_AUTOMATION_PLAN.md`](./automation/VA_AUTOMATION_PLAN.md) | Instrument → assist → supervise → retire: permanently automate the offshore-VA clerical layer; doubles as the ROI sales asset. |

**Dependency spine:** Billing OS and Booking feed the VA phase-out (most VA tasks land in those two systems). Citation OS reuses the intake-mailbox classifier and letter-persistence loop that Billing OS also needs — build those once, in the core. Practice-area modules ride on everything.

All systems inherit the [product rules](./pi-case-os/README.md#product-rules) and [DISCLOSURE](./pi-case-os/DISCLOSURE.md): white-label, no fabrication, counsel review per jurisdiction, attorney gates on legal judgment.
