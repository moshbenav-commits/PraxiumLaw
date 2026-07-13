# Module: Workers' Compensation

Injured-at-work claims in the **administrative (no-fault) forum**, plus coordination with any third-party liability case. Extends article [42 — workers' compensation coordination](../pi-case-os/articles/42-workers-compensation-coordination.md) from "coordinate with outside WC counsel" to "run WC in-house."

## 1. Scope
In: workplace injury/occupational disease claims before the state WC board/commission; benefit disputes (medical, temporary/permanent disability, vocational); settlement of WC claims. Out→refer: federal schemes (LHWCA, FELA, FECA) unless firm opts in per scheme.

## 2. Intake deltas
Employer, insurer/TPA if known, injury-report status (**was it reported? when? to whom?**), witnesses, employment status/wage basis, prior injuries to same body part, whether employer directed a clinic visit. Urgency triggers: injury-report window (very short in most states), denial letter with appeal clock, employer retaliation signals (flag → employment-counsel referral).

## 3. Lifecycle deltas
No liability phase — compensability replaces it. New phases: `claim_filed → accepted/denied → benefits_managed (parallel: medical + wage) → MMI/rating → hearing_track (if disputed) → settlement/closure`. New attorney gates: appeal filing, rating disputes, settlement (many states require board approval of settlements — `CORE-BUILD: court/board-approval workflow`, shared with [minors' compromise](../pi-case-os/articles/30-minors-compromise-and-court-approval.md)). Third-party track runs as a **linked companion PI case** with the WC lien tracked in [Billing OS](../billing-os/README.md).

## 4. Document pack
Claim form (state-specific), notice of representation, medical-authorization set, benefit-demand letters, petition/appeal forms, deposition notices, settlement documents (compromise & release / stipulation), WC-lien resolution letters.

## 5. Deadline pack (categories)
Injury-report-to-employer window · claim-filing statute · denial-appeal window · hearing brief/exhibit deadlines · IME objection windows. All jurisdiction-verified.

## 6. Damages model deltas
Not tort damages — **benefit streams**: average weekly wage calc, TTD/TPD/PPD/PTD classifications, impairment rating × state schedule, future medical, vocational retraining. Worksheet swaps pain-and-suffering for rating-based schedules; keeps medical-specials engine.

## 7. Counterparty map
WC insurer or self-insured employer's **TPA adjuster**; defense counsel appears at hearing stage. Negotiation rail = benefit disputes and C&R settlement value (driven by rating, future-medical exposure, Medicare set-aside — reuse article [48](../pi-case-os/articles/48-medicare-set-aside-and-future-medicals.md)).

## 8. Compliance flags
Attorney fees are **state-capped and often board-approved** — fee agreement templates must be per-state. No client solicitation at employer sites. MSA obligations on settlements involving Medicare-eligible clients.

## 9. KPIs
Time-to-claim-filed, denial-overturn rate, benefit-interruption incidents, average C&R vs. rating benchmark, lien-resolution delta on companion cases.

## 10. Reuse map
Unchanged: intake rail, records retrieval, document taxonomy, client cadence/EN-ES comms, scheduling, trust accounting, closeout. New: administrative-forum engine (`CORE-BUILD` — also serves Social Security disability later if pursued).
