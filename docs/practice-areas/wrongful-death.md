# Module: Wrongful Death (Overlay)

Not a standalone vertical — an **overlay** that combines with any liability module (auto PI, premises, med-mal, product, nursing home) when the injured person dies. Turning it on changes parties, damages, and approvals; the underlying module still drives liability workup.

## 1. Scope
In: statutory wrongful-death claims + survival actions arising from any covered module. Out→refer: probate administration itself (coordinate with probate counsel; the estate must exist for the claim to proceed).

## 2. Intake deltas
Caller authority (personal representative appointed? heirs identified?), death certificate, relationship map (statutory beneficiaries vary by state), funeral/burial costs, decedent's earnings/dependents, whether an estate is opened. Urgency triggers: evidence preservation per underlying module; estate-opening as critical path (**no PR, no claim** in most states — probate-referral task fires immediately).

## 3. Lifecycle deltas
Adds `estate_and_standing` phase before claims open (PR appointment tracked as external dependency). Adds `beneficiary_allocation` phase before disbursement — allocation among statutory beneficiaries usually needs **court approval** (reuses the court-approval workflow from [minors' compromise](../pi-case-os/articles/30-minors-compromise-and-court-approval.md); minors as beneficiaries stack that overlay too). Attorney gates: standing confirmation, allocation proposal, court-approval filings.

## 4. Document pack
Probate-coordination letters, PR retainer amendment, beneficiary questionnaires, economic-loss documentation set (earnings, dependency), allocation petition shells, court-approval packets.

## 5. Deadline pack (categories)
Wrongful-death SOL (often runs from death, not injury — **separate clock from the underlying case**) · survival-action SOL · estate/creditor-claim windows interacting with settlement timing.

## 6. Damages model deltas
Splits the worksheet: **survival damages** (decedent's pre-death pain/suffering, medicals, lost wages to death) vs. **wrongful-death damages** (beneficiaries' pecuniary loss, loss of consortium/guidance, funeral costs). Adds economist-input fields for dependency loss.

## 7. Counterparty map
Same as underlying module, but policy-limits pressure is immediate (death cases routinely exceed limits) — early limits-disclosure demands and excess/umbrella sweep are standard tasks (extends [15 — policy limits](../pi-case-os/articles/15-policy-limits-and-claimants.md)).

## 8. Compliance flags
Who is the client (PR, not the family collectively) — conflict waivers among beneficiaries; allocation disputes may require separate counsel; settlement funds flow through estate/trust rails with court oversight.

## 9. KPIs
Estate-opened latency, standing-confirmed latency, allocation-approval cycle time, limits-disclosure response time — plus underlying module KPIs.

## 10. Reuse map
Everything from the underlying module. Reuses: court-approval workflow, trust accounting, disbursement. New content: standing/probate playbook, allocation packet, split damages worksheet.
