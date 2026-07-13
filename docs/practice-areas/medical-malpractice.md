# Module: Medical Malpractice

Provider negligence causing injury: misdiagnosis, surgical error, medication error, birth injury, failure to treat. The **highest-complexity module** — gated on the expert-management core build.

## 1. Scope
In: claims against physicians, hospitals, clinics, pharmacies. Out→refer: claims below the module's viability floor (case economics — expert costs make small med-mal cases net-negative; the viability calculator is a hard intake gate).

## 2. Intake deltas
Full treatment chronology, all providers/facilities involved, what the client was told vs. what happened, prior conditions, date client **discovered** the harm (discovery-rule anchor). Urgency triggers: pre-suit notice/affidavit-of-merit clocks, provider about to destroy/rotate records. Day-one: complete records request set to *every* involved provider (records are the case).

## 3. Lifecycle deltas
New phases before demand: `records_complete → internal_medical_review → expert_screening (merit opinion) → pre_suit_notice/affidavit_of_merit → demand_or_file`. **Expert screening is a hard gate** — no demand or filing without a supporting expert opinion. Litigation is the default endpoint, not the exception: the [litigation handoff](../pi-case-os/articles/31-litigation-handoff-and-management.md) machinery is primary here.

## 4. Document pack
Comprehensive records requests (incl. audit trails/metadata requests for EHR), pre-suit notice letters, affidavit/certificate-of-merit shells, expert engagement agreements, medical chronology template, demand with expert-opinion exhibit structure.

## 5. Deadline pack (categories)
Med-mal SOL (often shorter than general PI) · discovery-rule tolling limits · statute of repose (absolute bar) · pre-suit notice period · affidavit-of-merit filing window · minor-plaintiff tolling rules. **These interact; the deadline engine must support dependent deadlines** (`CORE-BUILD: derived-deadline rules`).

## 6. Damages model deltas
Add: life-care plan, future earnings expert model, **state damage caps** (non-economic caps are common — worksheet must apply cap tables), loss of chance where recognized.

## 7. Counterparty map
Med-mal carriers and hospital self-insurance trusts; **consent-to-settle clauses** mean the defendant physician can block settlement — negotiation rail must model this. Defense is specialist bar; expect expert battles, not adjuster phone calls.

## 8. Compliance flags
Expert-fee arrangements must be hourly, never contingent. HIPAA handling at maximum sensitivity (reuse [firm HIPAA](../pi-case-os/articles/46-firm-hipaa-and-data-security.md)). Screening-panel requirements in some states. Do not name-and-shame providers in marketing.

## 9. KPIs
Screen-to-accept ratio, expert-review turnaround, cost-per-case vs. budget, affidavit-deadline incidents (target zero), resolution value vs. life-care-plan baseline.

## 10. Reuse map
Unchanged: intake rail, comms, scheduling, trust, disbursement, closeout. New `CORE-BUILD`s: expert-witness management (roster, engagement, opinions, payments — shared with product liability), medical chronology builder, derived-deadline rules, damage-cap tables.
