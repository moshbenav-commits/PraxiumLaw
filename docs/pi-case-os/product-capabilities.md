# PraxiumLaw PI Case OS — Product Capabilities (from training materials)

**White-label:** Any PI law firm. See [`WHITE_LABEL.md`](./WHITE_LABEL.md).  
**Disclosure:** Firms must edit documents and have counsel review language. See [`DISCLOSURE.md`](./DISCLOSURE.md).

**Question:** Are the training materials enough to define what PraxiumLaw must do?  
**Answer:** **Yes for pre-litigation MVA case management** — video transcripts + standard-practice scripts describe a complete operational system (roles, phases, tasks, letters, gates, failure modes, and treatment-compliance coaching). **Lead/intake phone scripts** live in separate **audio** files — Whisper in progress under `intake-calls/`.

**Source corpus:** `sources/` (transcripts, training-pi-text, letter templates, intake audio). Capabilities below are **product requirements**, not a specific case-system UI.

**Related:** `system-spec.md` · `gaps.md` · `articles/`

---

## Sufficiency verdict

| Domain | Transcripts enough? | Notes |
|--------|---------------------|--------|
| Intake → treatment → demand → negotiate → disburse | **Yes** | End-to-end timeline in Case Audit + PI Workflow |
| Claims (3P/1P), LOR, PD, MedPay/UM/UIM | **Yes** | Rules, timing, and letter types are explicit |
| Medical tracking, MRI gates, spend vs limits | **Yes** | Treatment tracker + case audit math |
| Treatment compliance / pain-education coaching | **Yes (MVP)** | Scripts and moments in transcripts; optional deeper script library later |
| Subrogation (health / Medicare / Medicaid) | **Yes** | Dedicated long transcripts |
| Lien reductions (short/long) | **Yes** | Procedural, attorney sets % |
| Settlement / trust / disbursement checklist | **Yes** | Status-chart settlement phase |
| Case audit / pipeline reporting | **Yes** | Phase filters, incomplete-task audits |
| Demand letter structure | **Yes** | demand worksheet order, exhibits, 30-day response |
| Lead scripts / marketing intake phone | **Pending** | Live intake audio found (not in video archive); transcription in progress — see `gaps.md` + `intake-calls/` |
| Full litigation (pleadings, dep, EUO) | **Partial** | Modules exist; not required for MVP pre-lit |
| Jurisdiction packs beyond NV (+ some WA) | **Partial** | NV-heavy; WA differences mentioned, not fully specified |

**Bottom line:** You can build PraxiumLaw’s **pre-lit case OS** from these transcripts alone, including coaching that gets clients to treat and follow care.

---

## What PraxiumLaw must be able to do

Capabilities are phrased as product features. Each maps to transcript-taught work.

### 1. Case identity and parties

- Create a **case** with DOL, intake date, language, SOL (NV: 2 years from DOL — calendar it).
- Store client profile (contacts, texting preference, minor flag, marketing opt-in).
- Link **related cases** (multi-occupant vehicles) with primary/secondary designation.
- Run **conflict checks** on defendant and, when driver ≠ owner, on owner.
- Capture adverse parties, adjusters, claim/policy numbers, personal vs commercial.
- Flag **Lyft/Uber/work** driving for preservation-letter logic.

### 2. Intake packet and Needs List

- Drive a **Needs List** checklist (declarations, ID, health card, hospital/ambulance bills, photos, estimates, defendant info, etc.).
- Generate / track signature packet: fee agreement, conflict waiver, POA, HIPAA (facility blank at sign), wage auth, claims history (5-year priors), internet/surveillance acknowledgment, disclosure consent.
- Assign **roles** (case manager, supervising attorney, intake specialist, clerical, accounting, cleaner-fish auditor) so tasks route correctly.
- Provision a **client text channel** that is text-only (not voice), with onboarding message templates.

### 3. Phase / pipeline engine

Cases move through phases the transcripts audit by name:

`Intake` → `Treating` → `Record gathering` → `Demand` → `Waiting for offer` → `Counter` / `Supplement` → `Settlement / disbursement` → (`Minor’s compromise` when applicable) → `Litigate` or `Drop` or `Closed`

PraxiumLaw must:

- Show incomplete tasks per phase.
- Support **status charts / reports** filtered by phase (demand tracker, settlement tracker).
- Support **case audit** views: what’s missing vs the timeline checklist (police report, lien, liability, MRI, limits, med totals, subro, PD, client contact).

### 4. Day-one claims and insurance

- Open **3P** claim day one; capture adjuster contacts; send **LOR** + signed release page.
- Track acknowledgment (~5-day follow-up) and **liability acceptance within ~30 days** (written confirmation letter when oral).
- Optionally send **preservation letters** (Uber/cab/semi/video-capable scenes).
- Send **attorney lien** notices (NV training: defendant + client; certified unless client signed in person).
- Decide **1P last-resort** (rental/repairs now, or bad 3P carriers); delay 1P/MedPay/UM to limit carrier-to-carrier information sharing.
- Read **declaration pages**: liability, MedPay/PIP, UM/UIM (incl. stacked), collision, rental, towing; household members for MedPay; UM rejection signatures.
- Pull or record **policy limits** and **claimant count** (pro rata awareness); attorney call when limits known.
- Client coaching: **PD-only** conversations with insurers.

### 5. Property damage module

- Track inspection, tow-yard removal, estimates (prefer independent / highest estimate; re-estimate if low, e.g. under ~$2–2.5k), rental, loss of use, total loss (~60% rule of thumb), gap, rare diminished value.
- Daily follow-up mode when rental/repairs block client retention.
- Photos: client vs defendant labeling; scene photos encouraged.

### 6. Pain education & treatment compliance coaching

**Goal:** Get the patient/client to do what the case needs (treat, image, follow recommendations, stay consistent).

- Prompt staff at intake, 3-day, 7-day, monthly, MRI-due, and pre-demand moments.
- Scripts for: no gaps, attend all referred providers, accept recommended treatment, MRI ladder, injection ramifications, monthly visits during demand, consistent pain reporting, social media / subrosa.
- Alerts: no-show, no MRI by ~8 weeks, treatment gap, client wants to stop early → attorney escalation.
- See `system-spec.md` §2.

### 7. Treatment and medical management

- Book **two tracks**: (chiro **or** PT) **and** (GP **or** pain management).
- Prevent **treatment gaps**; monthly doctor visits while demand is pending (explicit negotiation tactic).
- **Meds ledger**: every provider, specialty, LTD/NTD, balances, lien holder, futures estimates (FE), case-manager initials.
- Provider **knowledge-of-firm** flag (ethics: duty to pay what firm knows **and** provider knows about representation).
- Hospital bill stack: facility + ER physician + radiology + ambulance; prefer **client self-retrieval** for ~30 days.
- **MRI gate**: push by ~1 month no improvement; escalate by ~8 weeks; no MRI → low offers (“Band-Aid only”).
- **Spend vs limits** controls: warn when chiro/meds consume too much of a small policy; switch to health insurance when limits approached.
- Injection counseling after MRI.
- Color-coded treatment follow-up (active, no-show, stop-at, hold, etc.).
- 30-day / 5-week **case review**: attach MRI interpretation + PM plans; escalate outliers to attorney.

### 8. Records and documents

- **Document taxonomy** on every inbound item (intake / medical / auto ins / health-subro / expense / pleadings / misc).
- **Redaction checklist** (or automation) before carrier send — DOB, SSN, address, VIN, plate, health IDs, sensitive diagnoses, etc.
- Request medical LOR / HIPAA / High-Tech letter by provider rules (ChartSwap, etc.); **no duplicate paid requests**; specific date ranges.
- **Certificate of Records (COR)** per provider when done treating or transferring to lit.
- Lien **balance verification** while treating (not full records monthly).
- Prior records (5 years) — records only, date-range HIPAA.
- Naming conventions (MR, B, FE) and hashtags.
- Chronological exhibits for MedPay and demand packages.
- Expense/receipt capture (police report, limits pull, copy fees) for disbursement.
- **Transfer-to-litigation** letters to providers/carriers when phase changes.

### 9. Subrogation

- Open health subro **only if benefits used**, except **Medicare always** (non-conditional payment letter before settlement funds).
- Support plan types: private pay (often no payback), ERISA/employer, Medicaid (multi-vendor), Medicare portal, Culinary, TRICARE, etc.
- Notice of lien → interim lien → final lien; strip unrelated charges (cost-benefit on tiny items).
- Abundance-of-caution letters; holdbacks when final lien pending.
- Coordinate “bill health insurance” strategy without prematurely notifying hospitals of representation.
- Final subro lien timing aligned with demand send.

### 10. Demand package

- Trigger demand when: MMI, client stops (after attorney ramifications talk), or meds ≈ **40–60% of limits** (training heuristic).
- Build demand from Meds using **demand worksheet priority order** (hospital / large items first, not pharmacy first).
- Include futures estimates, wage loss if any, police report, photos, repair estimate.
- Support **3P demand**, **MedPay demand** (chronological bills + buffer over limit), **1P/UM request** (training: request benefits, not “demand” same as tort).
- Multi-client demands (plural language, combined specials).
- **30-day** response calendar; attorney/office-manager **approval gate** before send.
- Post-demand: impact questions, medical summary for negotiators, preliminary disbursement sheet.

### 11. Negotiation and reductions

- Log every offer (amount, date, direction, notes).
- Settlement **scenarios**: provider balances from Meds + attorney-entered reduction % or flats → net to client.
- Short vs long **reduction request** letters to providers or lien holders; verify Meds vs disbursement sheet before send; follow up in one week.
- Last-chance / litigate / settle / drop outcomes.
- Keep monthly treatment until offer (avoid gap during adjuster review window).

### 12. Settlement and disbursement

- Checklist-driven close: final offer, reductions approved, liens/loans verified, final subro, releases, trust entries, checks balance, client signs disbursement, reviews requested.
- Trust account balance validation (catch missing firm fee checks, wrong lien amounts).
- Minor’s compromise path when claimant is a minor.
- Child support / other special liens when present.

### 13. Communications and cadence

- Tasks at **3 days**, **7 days**, **~10 days** (police report), **monthly** client updates, **biweekly** alternate client/provider calls.
- Attorney speaks to client when limits known and about every **two months** (training preference).
- Script library for: PD-only insurer talk, hospital self-retrieval, text-line onboarding, treatment compliance, social media / subrosa warning.

### 14. Team operations

- Role-based task assignment and the QA-audit role audit role.
- Incomplete-task filters and pinned status notes (3P adjuster, claim #, PD blockers).
- Exportable pipeline reports for managers (who is stuck in demand, waiting on offer, settlement).
- Letter/template engine (LOR, medical LOR, preservation, lien, MedPay stop-pay, demand, reduction, subro, drop, disbursement) using **white-label placeholders only**.

### 14b. White-label onboarding (site/app)

- Firm profile: name, address, phone, attorneys, jurisdictions, fee defaults.
- Template pack install with `{{PLACEHOLDERS}}` substitution.
- **Mandatory acknowledgment** of [`DISCLOSURE.md`](./DISCLOSURE.md) before first template export or live matter create.
- No historical firm branding in default UI or PDF exports.

### 15. Attorney gates (hard product rules)

Transcripts assume a human attorney for:

| Gate | Staff prepares | Attorney decides |
|------|----------------|------------------|
| Demand send | Package complete | Approve / edit / send |
| Reduction % | Letters, balances | Percentages / flats |
| Expensive care (injections) | Liability status | Approve spend |
| Stop treatment / demand early | Facts, meds % | Ramifications talk |
| Settle / litigate / drop | File status | Outcome |
| Trust disbursement | Sheet + checks | Approve payouts |
| Conflict waiver strategy | Related cases | Keep / drop clients |

PraxiumLaw should **enforce** these gates in software (no silent staff send of demand or final disbursement).

---

## Explicit non-goals (from transcript silence)

Do **not** invent product features for:

- Automated case valuation (“how much will I get?”)
- Full lead CRM / phone scripts (not in transcripts)
- Replacing attorney judgment on ethics edge cases — support the workflow, surface risks, require attorney role

---

## Recommended MVP build order (transcript-backed)

1. **Case + parties + phases + roles + SOL**
2. **Needs List + intake packet checklist + text channel**
3. **Insurance (3P/1P) + LOR + liability + limits**
4. **Treatment compliance coaching prompts + Meds ledger + MRI/gap alerts**
5. **Document taxonomy + redaction + Medical LOR + COR**
6. **Demand builder (demand worksheet order) + approval gate**
7. **Offers + settlement scenarios + reductions** (disbursement reconcile first)
8. **Subrogation module (Medicare-critical path first)**
9. **Disbursement / trust checklist**
10. **Audit reports by phase** (+ litigation audit / transfer-to-lit as phase 2)

See [`IMPROVEMENTS.md`](./IMPROVEMENTS.md) for the full prioritization from the source corpus.
