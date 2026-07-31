# PraxHQ — Customer Journey (the PI Helper, screen by screen)

The injured client's experience in PraxHQ, from crash to close. This is the product spine for the **personal injury helper**: at every step the app's job is to **keep the client informed, supported, and moving**, while the firm works the file behind it. Each stage maps to the [case lifecycle](../pi-case-os/articles/00-case-lifecycle-and-workflow-map.md) and carries the [compliance guardrails](./LEGAL_REGULATORY_RESEARCH.md) (helper, not lawyer; no legal advice; money stays in attorney trust).

> Persistent in the app: a plain-language **"PraxHQ helps you manage your case — it is not a law firm and does not give legal advice"** banner, and one-tap access to a human on the firm's team.

## The journey

| Stage | What the client sees / does | Behind the scenes (SOP) | Helper guardrail |
|-------|-----------------------------|-------------------------|------------------|
| **0 · Right after the crash** | "You're okay, here's what to do now" checklist; request a **tow**; snap photos of the scene/vehicle; save the other driver/insurance info | [PD & liability timing](../pi-case-os/articles/03-property-damage-liability-timing.md) | Client comes on their own; no cold solicitation |
| **1 · Sign up** | Meet the firm; e-sign the retainer/HIPAA/intake packet; upload ID & docs | [Intake packet](../pi-case-os/articles/23-intake-forms-and-signature-packet.md), [needs list](../pi-case-os/articles/01-intake-needs-list.md) | Fee agreement is the firm's, attorney-reviewed |
| **2 · Meet your team / what happens next** | A simple case roadmap ("here are the stages"), who their case manager is, expected timeline | [Lifecycle map](../pi-case-os/articles/00-case-lifecycle-and-workflow-map.md) | Educational only — no promises of outcome/value |
| **3 · Treatment** | Appointment reminders, directions, **book a ride** (if firm offers), see providers, **upload bills/records**, symptom check-ins | [Treatment compliance](../pi-case-os/articles/16-treatment-compliance-coaching.md), [gaps & MRI timing](../pi-case-os/articles/05-treatment-gaps-and-mri-timing.md) | Rides/tow get **no medical detail**; PHI stays protected |
| **4 · Case progress** | Status timeline, nudges for missing items, monthly check-in, gentle **social-media caution** | [30-day review](../pi-case-os/articles/07-thirty-day-case-review.md), [call cadence](../pi-case-os/articles/11-client-call-cadence.md), [social media](../pi-case-os/articles/06-social-media-and-subrosa.md) | Status relay only; no legal opinions |
| **5 · Demand & negotiation** | "Your demand was sent," milestone updates, realistic-expectations messaging | [Demand drafting](../pi-case-os/articles/39-demand-letter-drafting.md) | App reports; attorney negotiates |
| **6 · Settlement & disbursement** | Review & **e-sign** release and disbursement statement; see the breakdown | [Settlement/disbursement](../pi-case-os/articles/27-settlement-and-disbursement-workflow.md) | Money stays in **attorney trust**; PraxHQ never holds funds |
| **7 · Close** | Closing letter/docs; "you're all set"; request a review; keep records | [Close-out](../pi-case-os/articles/40-file-closeout-reconciliation-and-retention.md) | Retention/security per HIPAA + ops policy |

## Always-on helper features

- **Messaging** with the firm's team (logged to the case file — see [correspondence SOP](../pi-case-os/articles/34-correspondence-and-communications.md)).
- **Notifications & reminders** (appointments, tasks, deadlines the firm surfaces).
- **Document upload** (photos, bills, records, letters) straight into the file.
- **Help / "talk to a human"** — one tap to the case manager.
- **Multilingual** (EN/ES priority) so the helper meets clients where they are.

## Why this wins

The client relationship *is* the product. A client who feels guided treats consistently, responds faster, provides better documentation, and refers others — which improves the very case metrics the [SOPs](../pi-case-os/articles/07-thirty-day-case-review.md) care about. Own the communication layer and everything downstream gets easier.

## Build notes

- Design mobile-first; the client lives on their phone.
- Every screen answers "what's happening and what do I do next?"
- Keep the "not legal advice" line visible; route anything that needs judgment to the attorney.
- See the [provider portal](./PROVIDER_PORTAL.md) for the other side of the relationship (doctors) and the [integration map](./INTEGRATION_MAP.md) for the firm side.
