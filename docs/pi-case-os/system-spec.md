# PraxiumLaw PI Case OS — Case Management System Spec

**Status:** Extracted from pre-litigation PI training materials (video transcripts, forms, letter templates, medical-management notes).  
**Date:** 2026-07-04  
**Rule:** Only procedures, scripts, and rules present in source training are included. Gaps and attorney-only steps are flagged.  
**Sources:** See `SOURCES.md` and `sources/`. Full gap list: `gaps.md`.

**White-label:** Written for **any** PI law firm. Use `{{FIRM_NAME}}` / role labels — never ship firm-specific branding. See [`WHITE_LABEL.md`](./WHITE_LABEL.md).

**Disclosure:** Not legal advice. Firms **must edit** all documents and have **licensed counsel review language** before use. See [`DISCLOSURE.md`](./DISCLOSURE.md).

---

## 0. Purpose and scope

PraxiumLaw is a **pre-litigation personal injury (MVA) case management system** for case managers and support staff. It encodes the operational workflow from intake through demand, negotiation, lien reduction, and settlement disbursement.

**In scope (from training):**

- Client intake, needs list, releases, conflict checks
- Opening 3P (and conditional 1P) claims; Letter of Representation (LOR)
- Pain education / treatment-compliance coaching (get clients to treat and follow care)
- Medical appointment booking, treatment monitoring, Meds tab hygiene
- Medical record / bill gathering for demand
- 30-day / 5-week case review (pain management, MRI)
- Demand package prep; negotiation offer logging; settlement calculator scenarios
- Lien verification, short/long reduction, subrogation timing
- Client communication cadence and property-damage coaching

**Out of scope / not fully specified in training:** full litigation playbooks, jurisdiction packs beyond NV/WA examples, automated valuation models.

**Legal sensitivity:** Materials describe attorney-supervised case work, contingent fees, lien negotiation, and client coaching. Privilege and UPL boundaries are flagged in `gaps.md`. This spec is **operational process**, not legal advice.

---

## 1. Client Intake Process

### 1.1 In-office flow (day of signing)

1. Client arrives; staff copies documents while client completes the **intake sheet / MVA questionnaire**.
2. Case manager reviews questionnaire for legibility before data entry.
3. Case manager creates (or finds) the client contact and **new project** in the case management system (training used a case management system).
4. Enter: date of loss (DOL), date of intake, language, texting preference, DOB, contact info, marital status, gender, SSN (as required for forms), marketing opt-in.
5. Generate **intake documents** (English or Spanish).
6. Assign **team members and roles** (case manager primary/follower; supervising attorney; clerical; accounting/disbursements; intake specialist / junior VA as applicable).
7. Turn on **text line**; give client the text-only number and case manager contact. Explicitly tell client: **do not call the text line**.
8. Walk client through **Needs List** (homework) and book **initial medical appointments** (pain management / primary referral + chiro or PT) as early as possible.
9. Client signs releases and acknowledgments (see §1.3).
10. Copy signed packet; send to assistant for typing into system tabs.

### 1.2 Documents to collect (Needs List)

**At intake (or ASAP):**

| Item | Notes from training |
|------|---------------------|
| Driver’s license / ID | Required |
| Health insurance card | Required if any |
| Auto insurance card | Required |
| Insurance **declaration page** | Client may call agent and request declarations **without announcing the accident** |
| Hospital bills and records | Prefer **client obtains** (see article: hospital bills) |
| Ambulance bills | Often arrive by mail |
| ER physician / radiology bills | Separate from hospital facility bill |
| Accident exchange ticket / defendant info | |
| Traffic / police report info | Agency + report number if known |
| Photos of vehicles | Client texts to case text line |
| Repair estimate | Prefer **referral body shop**, not insurer’s low estimate |
| Vehicle registration | Optional |
| Body shop / tow yard location | If applicable |

### 1.3 Intake questionnaire fields (from MVA questionnaire form)

Form captures (bilingual EN/ES in source):

- Client identity, DOB, SSN, address, phones, email, marital status, preferred language
- Role in accident (driver / passenger / pedestrian)
- Misdemeanor / felony history (dates and details if yes)
- Emergency contacts
- Passenger seating, airbags, seatbelt, accident type (head-on, rear-end, T-bone, sideswipe, hit-and-run)
- Vehicle counts; adults/minors in each vehicle
- Weather, location (cross streets)
- Photos taken? Cited? Lyft/Uber/work driving (client and defendant)
- Police on scene: agency, report number (skip if TAR already on file)
- Narrative of how accident happened
- Prior accidents, work-comp / homeowners / PI claims
- Witnesses and permission to contact
- Medical: transport, ambulance company, hospital, X-rays, current treatment, referrals
- (Additional pages in form cover insurance, injuries, employment — full form is 8 pages)

**Minimal lead fields** (from intake notes scrap): driver name, passengers, DOL, unit placement / PR#, 3P ins Y/N, 1P ins Y/N, UIM/UM if no 3P, injured Y/N + symptoms, dates of treatment (first/last), facts.

### 1.4 Signature packet (training-described)

| Document | Purpose |
|----------|---------|
| Contingency / fee agreement | Representation (template exists; attorney-owned) |
| Conflict of interest waiver | **Required when multiple clients in same vehicle** (related cases linked) |
| Limited power of attorney | Endorse settlement checks into trust |
| General release / authorization | Police reports and general authorizations |
| Authorization to obtain wage information | Lost wages claims |
| HIPAA (medical) | Leave **facility name blank** at signing; fill per provider when requesting records |
| Medical claims history | Prior accidents/claims (training: last **5 years**); criminal history (training: ~**10 years**) for settlement vs litigation strategy |
| Internet surveillance acknowledgment | Subrosa / social media warning |
| Consent for disclosure of information | Loans, providers, lien holders, insurers as needed |

### 1.5 Conflict check

- Run conflict check on **defendant** before proceeding.
- If driver ≠ owner, also conflict-check **owner** (may be additional coverage).
- Training: may defer owner conflict until police report confirms driver/owner identity (~15 days).

### 1.6 Related cases (multi-occupant)

- One **primary** project (usually driver; sometimes passenger if driver is at fault or represented elsewhere).
- **Secondary** projects for other occupants; link related cases.
- Conflict waiver signed by all represented occupants.

### 1.7 Early client coaching (intake scripts — paraphrased from training)

**Three questions clients always ask:**

1. How long will this take? → Six months to two years; depends on policy limits, injuries, treatment path — not the same as a coworker’s case.
2. How much will I get? → Unknown until policy limits, damages, bills, and consistency of pain reporting are known.
3. When will my car be fixed? → Usually not until **liability is accepted**; if they need a car now, discuss **1P** (see §6).

**Property damage talk:** Liability rarely accepted immediately; insurer often waits for police report (2–3 weeks) or insured statement. Do not volunteer that acceptance can take months (training: “don’t freak them out”), but prepare them that it is not instant.

**Social media:** Do not post activity inconsistent with claimed injuries; do not delete posts (spoliation). Investigators may use **subrosa** video on larger cases (training: often when exposure is over ~$100k).

---

## 2. Pain Education & Treatment Compliance Coaching

**Purpose:** Get the client to do what the case needs — attend appointments, accept medically appropriate care, report pain consistently, and avoid gaps that destroy value. Training materials teach this as case-manager coaching, not as a branded curriculum.

### 2.1 Outcomes the coaching must produce

| Client behavior | Why the case needs it |
|-----------------|------------------------|
| Start treatment immediately (chiro/PT **and** pain management/GP) | Gaps → insurer argues “not hurt” |
| Attend **every** referred provider, not only one | Clients often treat one doctor and skip the rest |
| Accept recommended care (“say yes when the doctor offers treatment”) | Incomplete care → incomplete medical specials and weaker demand |
| Get MRI when conservative care stalls (~1 month; escalate by ~8 weeks) | No MRI → “Band-Aid only” offers |
| Understand injection / surgery ramifications if they decline | Low meds + unresolved injury → low settlement; future care may fall on client |
| Report pain consistently (not 9–10 one day and 1 the next) | Inconsistent scores undermine credibility |
| Stay on **monthly** evaluations while demand is pending | Prevents negotiation gaps during record-gathering and adjuster review |
| Avoid social media / activity that contradicts injuries | Subrosa and spoliation risk |

### 2.2 Coaching moments (from training)

1. **Intake:** Book appointments same day; explain gaps kill claims; set homework (Needs List).
2. **3-day / 7-day calls:** Confirm attendance at each provider; re-book no-shows.
3. **Monthly / biweekly:** Alternate client check-ins and provider balance calls (catch dropped appointments).
4. **MRI push:** Explain ladder — conservative care → imaging → injections → surgery only if needed; do not jump to surgery to “hit” limits.
5. **Injection talk:** If MRI shows structural findings, counsel on injections vs “bandaid and hope” — including that settlement is often a **multiplier of meds**, and unpaid future care (copays/deductibles) may land on the client after close.
6. **Demand window:** Client is “done treating” for demand purposes but continues monthly visits until an offer — explicit tactic so adjusters cannot exploit a gap.

### 2.3 Product support

PraxiumLaw should surface **compliance coaching prompts** at these moments (scripts, checklists, alerts for no-show / no MRI / gap risk), with attorney escalation when the client wants to stop treating early.

Optional enrichment (not required for MVP): additional pain-education scripts and doctor-visit communication coaching drawn from operator experience — see `gaps.md` § Treatment compliance scripts.

---

## 2b. Document taxonomy & redaction

### Document types (inbound)

Classify every item: **Intake** · **Medical** · **Auto insurance** · **Health/subro** · **Invoice/receipt** · **Pleadings** · **Misc** (voicemail, leads). Type drives filing location and tab updates. See article `18-document-taxonomy.md`.

### Redaction (before carrier send)

Redact: DOB, age, address, SSN, Medicare ID, VIN, plate, health-insurance IDs, sensitive diagnoses, ethnicity, lien-holder IDs. Apply to police reports, bills, records, repair estimates. See article `19-redaction-checklist.md`.

### Certificate of Records (COR)

When treatment is complete or case transfers to lit: require **COR** per provider/billing period. Missing COR = not verified. See article `20-certificate-of-records.md`.

---

## 3. Medical Record Tracking Protocol

### 3.1 Meds tab as system of record

- Every provider must appear on the **Meds tab** with specialty, first date of treatment, lien holder (if any), and balances.
- Meds tab **must match** paper file and Docs tab before demand. Mismatches force rework on settlement calc and reductions.
- Do **not** create duplicate contacts for the same clinic (use clinic/entity name, not individual doctor name unless required).
- Case manager initials on Meds entries so generated letters carry correct staff initials.

### 3.2 Naming and filing conventions

- Prefer short filenames: `MR` (medical records), `B` (bills), `FE` (futures estimate).
- Date format in training examples: `YYYY.MM.DD` style with leading zeros on single-digit months/days.
- Use **hashtags** on documents (provider name, anesthesia, etc.) because the system may lack folders.
- Distinguish **client** vs **defendant** photos in filenames.
- Expenses (e.g. small copy fees) go on **Expenses** tab, not Meds — they feed settlement calculator reimbursement.

### 3.3 Requesting records

| Situation | Action |
|-----------|--------|
| Client still treating | Prefer **lien balance verification** (phone or letter), **not** full records every month |
| Client done treating / demand prep | Full **medical LOR** + HIPAA for each provider still missing |
| Provider uses ChartSwap / special portal | Check **doctor referral list** first; request via required channel to avoid week-long delays |
| Prior accidents (last 5 years) | Request **records only** (not bills); adjust HIPAA date range to **5 years prior** |
| Lien sold to factoring company | Note “liens sold to [holder]”; pay holder, not original provider |

### 3.4 Hospital / ER bill stack

One ER visit often produces **four** bill streams:

1. Hospital facility  
2. ER physician group (contracted)  
3. Radiology group (contracted)  
4. Ambulance  

Client should watch mail and deliver each. Training prefers client retrieval so providers do not treat the file as “attorney involved” until later (better reduction leverage).

### 3.5 Futures estimates (FE)

- Save surgical/injection **futures estimates** as `FE` with amount and date.
- Compare FE to later actual bills; if amounts do not reconcile, request **updated** MR/B.

### 3.6 High-Tech letter

Training directs: for invoices **$100 and above**, use the **High-Tech letter** (with signed HIPAA page) when requesting records from facilities that will not cooperate with ordinary LOR — always use High-Tech going forward per that session.

---

## 4. Treatment Milestone Checklist

Training does **not** use a single formal checklist labeled “ER → Primary → Specialist → Chiro → PT → Injection,” but the operational path and gates are:

| Stage | Actions | Gates / rules |
|-------|---------|----------------|
| **ER / acute** | Document hospital, ambulance, imaging | Client obtains bills/records; use health insurance card at hospital/ambulance when available |
| **Initial appointments (day 0–1)** | Book pain management / clinic **and** chiro or PT near home or work | **No treatment gaps** — insurers argue gaps = not injured |
| **Ongoing conservative care** | Chiro / PT attendance; update LTD / NTD / estimated balance | Color-coded follow-up sheets (see §5) |
| **~1 month no improvement** | Push for **MRI** | Missing MRI at ~8 weeks → call pain doctor; missing MRI **reduces settlement** |
| **Pain management** | Read plans for injections / surgery language | Attach PM notes + MRI interpretation to **30-day case review** |
| **Injections** | Track FE and actual bills; do not approve large injection spend **without liability acceptance** | Liability target: **within 30 days** |
| **Near MMI / demand** | Gather all MR/B; keep client on **monthly evaluations** while demand is out | Med totals vs policy limits (see §8) |
| **Post-settlement care note** | Training notes: ~25% of settlement for future care | Process incomplete in sources |

### 4.1 30-day case review / 5-week review

- Review **important** providers: pain management, neurologist EMGs, MRIs — **not** routine chiro notes.
- Attach MRI; summarize interpretation (e.g. disc bulge levels and mm).
- Confirm document is **MRI not X-ray**.
- Note pain scores and **plan** (injections, surgery).
- Flag outstanding findings for attorney review.
- If no MRI by ~8 weeks, investigate who dropped the ball (client, office, or doctor).

### 4.2 Monthly treatment status cadence

Alternate every two weeks:

1. Call **client** — how is treatment? still attending?
2. Call **provider** — balances, last date of treatment (LTD), next date (NTD), no-shows; confirm next appointment exists (receptionist turnover can strand clients).

### 4.3 Med totals vs limits (rule of thumb from training)

Example given: $100k per person + $25k UM/UIM + $5k MedPay ≈ $130k exposure → aim meds roughly **$60k–$80k** before starting demand; keep client treating at least monthly while demand is pending.

---

## 5. Doctor Network Coordination

### 5.1 Booking

- Ask client: doctor near **home** or **work**?
- Prefer first available appointment; fill Needs List with provider name, address, phone, date/time.
- Training examples: pain clinic + chiro; NPIM (Nevada Personal Injury Management) as pain-management network; Apache-type chiro clinics; Dynamic PT (WA).

### 5.2 Letter of Protection / referral forms

Templates exist for:

- **Letter of Protection** (NV/WA)
- **NPIM Referral Form** (NV)
- Medical Letter of Representation to providers

### 5.3 Chiro / clinic follow-up sheets (med training notes)

**Color coding (Nevada chiro sheet):**

| Color | Meaning |
|-------|---------|
| Red | Completed |
| White | Active |
| Purple | No show |
| Yellow | Close to stopping treatment |
| Green | Treatment on hold |
| Highlighted blue | Not confirmed |

**Duties:**

- Update treatment dates, claimants, policy limits on sheets + case system
- Request treatment updates in **each doctor’s preferred format**
- Lists: no-shows, close-to-stop, stop-ats, limits
- New clients: confirm initial appointment, follow-up, current balance; call after appointment and after referral sent
- **3-day chiro** task in case system
- NPIM: yellow = est. balance near **Stop At**; purple = no-shows; PRN = person reporting no pain
- WA: Westcare / Dynamic PT — LTD, NTD, est. balance, non-responsive lists

### 5.4 Lien balance vs full records

- While treating: balances only (phone or lien verification letter).
- Network providers who already signed liens usually answer balance requests without a new LOR.
- Non-network / hospital: may need HIPAA + High-Tech letter.

---

## 6. Insurance Communication Rules

### 6.1 Definitions (training language)

| Term | Meaning |
|------|---------|
| **3P** | Third-party (at-fault) liability carrier |
| **1P** | First-party (client’s own) carrier — collision, rental, MedPay/PIP, UM/UIM |
| **LOR** | Letter of Representation |
| **MedPay / PIP** | Medical payments / personal injury protection (PIP noted as WA-required in med training notes) |
| **UM / UIM** | Uninsured / underinsured motorist |

### 6.2 Day-one 3P claim

1. Call 3P to open claim or obtain existing claim number.
2. Collect: adjuster name, phone, fax, email, mailing address, claim number, policy number, personal vs commercial.
3. Check **driver vs owner** — mismatch may mean additional policies.
4. Separate **BI** and **property damage** adjusters if different.
5. **Do not** give client SSN, DOB, address, or phone to 3P on the open call.
6. Send **3P LOR** same day with signed **general release** page only (notarized signature page).
7. Subject lines on faxes/emails: client name + document type (e.g. “Third Party LOR”) for searchability.
8. Save sent LOR in Docs; if no acknowledgment in **~5 days**, follow up.
9. Training cites: acknowledge claim within **20 days**; investigation / liability posture within **~30 days** — push for **liability acceptance within 30 days** before approving expensive treatment (e.g. injections).

### 6.3 LOR content rules

- Be **vague** on liability facts (“client was rear-ended”) — do not volunteer lane-change or fault-suggesting details.
- Remove property-damage paragraphs if not handling PD through 3P.
- Initials: attorney initials + staff initials (staff lowercase in training example).
- Never send highlighted draft text.

### 6.4 Client speaking to insurers

Script direction:

> Client may discuss **property damage only**. For injuries or accident facts: “I am only authorized to speak to you about property damage. If you want to talk about injuries or the accident, talk to my attorney.”

### 6.5 When to open 1P

- **Last resort** in training.
- Open when client needs rental/repairs **now** and 3P will not move, or 3P is known to be extremely slow.
- Reasons to **avoid** early 1P / early MedPay:
  - 1P and 3P carriers may share information (prior accidents, pre-existing conditions) and reduce value.
  - Hospitals may raid MedPay and get paid in full before the firm controls it — send MedPay notice / bills strategically.
- MedPay: submit bills up to MedPay limits; send notice so providers do not take MedPay directly when inappropriate.
- Training: open MedPay / send MedPay when 1P is open, or immediately if hospital is likely to bill MedPay sneakily.

### 6.6 Policy limits

- Prefer limits disclosed on acknowledgment / LOR response **before** paying for limit pulls ($80–$250+ cited).
- If **no police report**, pull limits sooner.
- Record limits on **all related claimants**; note **number of claimants** for pro rata math.
- Example limit stacks in med training: 25/50, 50/100, 100/300, 250/500, 1M; UIM; collision; MedPay.

### 6.7 Property damage rules of thumb

- Total loss if repairs **> ~60%** of current market value (med training notes).
- Prefer independent body-shop estimate (training: insurer estimates often low; example $500 vs $5,000).
- **Loss of use:** days without vehicle × rental rate of **similar** vehicle.
- Rental / PD follow-up: training emphasizes **daily** pressure until rental/repairs resolved — primary reason clients fire firms.

### 6.8 Police report

- Task ~**8–10 days after DOL**.
- Call agency: report ready? pictures? cost? envelope type (padded if photos/CD).
- Mail check + general release + request letter; statements often free — request them.

### 6.9 Health insurance subrogation

- Open **only if** health insurance was used (typically hospital/ambulance).
- **Exception:** Medicare (elderly/disabled) — open even when cautious about Medicaid/poor-aid plans; training distinguishes Medicare vs Medicaid.
- Do not open subro “for nothing” if no benefits used.
- Letter of rep style notice to health plan / outsourced recovery vendor.

---

## 7. Demand Package Preparation

### 7.1 Preconditions

- Treatment substantially complete or at demand-ready med totals (see §4.3).
- Meds tab complete and reconciled to Docs and paper file.
- Police report on file (if one exists).
- Liens / loans entered (do not forget loans — must be repaid at disbursement).
- Out-of-pocket expenses captured.

### 7.2 Gather checklist (from demand-prep training)

- [ ] Every provider on Meds has matching MR and/or B (or documented FE)
- [ ] Hospital / ER / radiology / ambulance complete
- [ ] MRI reports and interpretations
- [ ] Injection / surgical notices and FE
- [ ] Lien verifications where balances uncertain
- [ ] Acknowledgment of representation / adjuster info current
- [ ] Prior claims history documented
- [ ] Photos / PD materials as needed

### 7.3 Draft and review

- Draft demand (and UIM demand when applicable).
- **Attorney or office manager reviews** demand before send (explicit in PI Workflow).
- Calendar response deadline.
- Templates exist for WA demand (policy limits and non-limits variants) and counters.

### 7.4 Lessons from demand-prep failures (training)

- Cutting corners on Meds tab early **blocks** demand later.
- Missing hospital on Meds when client went to ER is a critical miss.
- Always task **follow-up on yourself** after assigning record requests (assignee may complete task without delivery).
- Check provider-specific retrieval methods (ChartSwap, etc.) **before** waiting on a dead LOR.

---

## 8. Settlement Negotiation Guidelines

### 8.1 Logging offers

- Every written (or confirmed) offer goes on **Negotiations tab**: amount, date, direction (insurance → plaintiff), adjuster/carrier notes.
- Screenshot or save offer letter to Docs.

### 8.2 Settlement calculator scenarios

- Build scenarios from **current Meds tab balances**.
- Attorney enters **reduction percentages or flat amounts** per provider.
- Run multiple scenarios (initial offer vs improved offer) to show client **net in pocket** under different reduction assumptions.
- Provider may refuse expected reduction % — scenarios must be re-run.

### 8.3 Fee / reduction notes in training (illustrative, not universal policy)

From med training notes (scenario math — illustrative, not universal policy):

- Attorney fees cited as **33⅓%**
- Doctor discounts / reductions often **35–45%** in example
- Expenses example: $350
- MedPay under $10k “usually goes directly to customer” in one scenario note

### 8.4 Lien reduction

Training modules exist for:

- Lien verification  
- Short reduction  
- Long reduction  
- Lien reduction request letters (NV template)  
- Drop letter asserting a lien / drop letter to lien holders  

Detailed reduction scripts are only partially in transcripts; treat full negotiation language as **attorney-directed** (see gaps).

### 8.5 Post-offer workflow (high level from PI Workflow)

Reduce bills → finalize settlement calc → disbursement letter → client reviews → request client reviews/testimonials.

### 8.6 Minors

- **Minor’s compromise** / court approval path when claimant is a minor (status-chart training module exists).
- Minors “normally don’t treat” unless older teens or serious injury (intake guidance).

---

## 9. Case Manager Tips & Tricks (index)

Publishable articles live in `articles/`. Index:

| Article | Topic |
|---------|--------|
| `01-intake-needs-list.md` | Needs List and day-one documents |
| `02-hospital-bills-client-retrieves.md` | Why clients get their own hospital bills |
| `03-property-damage-liability-timing.md` | PD timing and liability acceptance |
| `04-opening-3p-and-1p-claims.md` | 3P day-one vs 1P last resort |
| `05-treatment-gaps-and-mri-timing.md` | Gaps, MRI at 4–8 weeks |
| `06-social-media-and-subrosa.md` | Social media and surveillance |
| `07-thirty-day-case-review.md` | 30-day / 5-week review |
| `08-meds-tab-and-record-hygiene.md` | Meds tab, naming, hashtags |
| `09-demand-prep-checklist.md` | Demand package readiness |
| `10-settlement-calculator-scenarios.md` | Negotiation tab and scenarios |
| `11-client-call-cadence.md` | 3-day, 7-day, monthly cadence |
| `12-chiro-follow-up-color-codes.md` | Treatment tracker color codes |
| `13-conflict-check-and-related-cases.md` | Conflicts and multi-client vehicles |
| `14-client-insurance-script.md` | PD-only script for clients |
| `15-policy-limits-and-claimants.md` | Limits, pro rata, driver vs owner |
| `16-treatment-compliance-coaching.md` | Pain education — get clients to treat |
| `17-in-office-intake-coaching.md` | Live in-office intake coaching (herman recording) |
| `18-document-taxonomy.md` | Classify inbound documents |
| `19-redaction-checklist.md` | Redact PII before carrier send |
| `20-certificate-of-records.md` | COR requirement |
| `21-medical-lor-workflow.md` | Medical records request procedure |
| `22-transfer-to-litigation.md` | Lit handoff notices |
| `23-intake-forms-and-signature-packet.md` | MVA questionnaire + signature packet catalog (106 templates) |
| `24-medical-documents-reference.md` | MR/B/FE/COR types, hospital stack, HIPAA vs Medical LOR |

---

## 10. Case timeline (end-to-end)

```text
Day 0     Intake, releases, text line, book doctors, open 3P, send LOR
Day 0–1   Needs List homework; PD strategy (3P wait vs 1P)
Day 3     Call client: homework, treatment attendance, estimates, bills
Day 7–10  Needs List follow-up; police report request (~8–10 days post-DOL)
Day 5–30  Push liability acceptance; rental/PD daily if needed
Ongoing   Alternate client call / provider balance every 2 weeks
~30 days  Case review: MRI / PM notes; SOL calendared (NV: 2 years from DOL)
~4–8 wks  MRI if no improvement
Demand    Meds reconciled → draft → attorney review → send → calendar response
Negotiate Log offers → settlement scenarios → reductions
Close     Disbursement, liens/loans paid, reviews requested
```

**Statute of limitations (training):** Nevada — **2 years** from date of accident; calendar on intake.

---

## 11. System roles (from training)

| Role | Typical duties |
|------|----------------|
| Case manager | Intake sit-in, client coaching, 3P open, treatment oversight, demand coordination |
| Supervising attorney | Directives, demand review, reduction %, liability strategy |
| Intake specialist / junior VA | Data entry, picture organization, tabs, DocGen |
| Clerical / filing | Physical files, mail |
| Accounting / disbursements | Settlement checks, trust |
| Cleaner fish | Audit/cleanup of incomplete tasks and tabs (named role in training) |
| POC | Point of contact assigning limit pulls / admin tasks |

---

## 12. Named methodologies and terms (preserve exactly)

Use these terms in product copy and UI where applicable:

- Needs List  
- Letter of Representation (LOR) / Letter of Rep  
- Bolded Vines  
- Cleaner Fish  
- 30-day case review / 5-week review  
- Meds tab  
- Futures Estimate (FE)  
- Lien verification  
- Short reduction / Long reduction  
- High-Tech letter  
- Stop At / LTD / NTD  
- Subrosa  
- 1P / 3P  
- MedPay / PIP  
- UM / UIM  
- Minor’s compromise  
- NPIM (Nevada Personal Injury Management)  
- ChartSwap (provider portal example)

---

## 13. Implementation notes for PraxiumLaw app

| Training assumption | App must provide |
|---------------------|------------------|
| Attorney reviews demand | Review queue + approval gate |
| Attorney sets reduction % | Settlement scenario editor restricted to attorney role |
| Supervising attorney role in tasking | Role-based task routing |
| Conflict check | Defendant/owner conflict search |
| SOL calendar | Jurisdiction-aware deadlines (only NV 2-year rule documented) |
| DocGen letters | Template engine for LOR, medical LOR, High-Tech, demand, counters, lien letters |
| Text line | SMS channel distinct from voice |
| Related cases | Multi-claimant linking + conflict waiver checklist |

Items the training assumes a human attorney will do are listed in `gaps.md` § Attorney-presence assumptions.
