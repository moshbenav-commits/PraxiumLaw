# PraxiumLaw PI Case OS — Training Gaps

**White-label / disclosure:** See [`DISCLOSURE.md`](./DISCLOSURE.md) and [`WHITE_LABEL.md`](./WHITE_LABEL.md). Gaps do not authorize shipping firm-specific or unreviewed legal language.

Flagged for **manual completion**. Nothing below was invented to fill holes; each item is either missing, vague, conflicting, or attorney-only in the source corpus.

**Sources reviewed:** PI video training transcripts, med training notes, MVA questionnaire, letter templates, local PDFs (limited text extraction).  
**Not available:** Google Drive knowledge stubs (titles only; body not on disk).

---

## Treatment compliance scripts (optional enrichment)

**MVP is covered** by transcripts: gaps, MRI timing, accept recommended care, injection ramifications, monthly visits during demand, consistent pain reporting, social media.

**Optional later:** Deeper pain-education and doctor-visit communication scripts from operator experience (how to get clients to follow through at appointments). Not required to ship the case OS — product should already prompt staff at the coaching moments in `system-spec.md` §2.

---

## Lead / intake phone scripts — transcribed; cold phone lead still a gap

**Status (2026-07-04):** All four intake training recordings were **Whisper-transcribed** into `intake-calls/*.txt`. **Raw audio was removed** from the repo (text-only policy).

| Transcript | Pulled into |
|------------|-------------|
| `Intake herman.txt` | `articles/17-in-office-intake-coaching.md` |
| `Intake.txt` | Same article (in-office roleplay patterns) |
| `Intake 2.txt` | Same article |
| `Intake Class 8.28.19.txt` | Review for phone/lead vocabulary — **not yet a separate article** |

**Finding:** Transcripts are **in-office intake coaching** (facts of loss, priors, PD, treatment, fee agreement) — **not** a cold inbound phone lead greeting (“sorry to hear about your accident…”). That script is still a **gap** for MVP phone intake.

**Already in video transcripts (phone-adjacent, not lead intake):**

- Live **3P claim open** call dialogue (`3rd_PARTY_-_Open_a_claim…`)
- **Wage-loss HR** call script (“Hi, this is … I wanted to speak to HR…”)
- Client coaching scripts (PD-only, hospital bills) — not inbound lead greeting

Google Drive stubs still include a **Leads Scripts** title (body not on disk).

---

## Google Drive / knowledge SOPs (inaccessible)

These titles exist as **stubs only** — body not on disk:

| Title | Likely relevance |
|-------|------------------|
| Leads Scripts | May duplicate intake audio — export if needed |
| Intake | Intake SOP |
| Negotiations | Negotiation playbook |
| Demand | Demand drafting standards |
| Treatments and Medical Management (Jr. Caller Tasks) | Treatment calling scripts |
| Procedure for Handling Pre-Litigation Claims | End-to-end pre-lit SOP |
| Opening Claims (1P and 3P) | Claims SOP |
| Policy Limits | Limits procedure |
| Liens and Dropping a Client | Lien + termination |
| Minor Impact Soft Tissue (MIST) Cases | MIST strategy |
| Health Insurance Subrogation | Subro detail |
| Auto Liability Insurance | Coverage education |
| Using Our Tettra Important SOP'S | SOP index |
| PI-After-signing a lead guideline | Post-sign checklist |
| Lead Submission Training | Lead ops |
| MSK EVALUATION TEMPLATE (ENG) | Medical evaluation template |
| Laws NRS and Case Law | Legal research (attorney) |
| Litigation | Lit handoff |
| Premise Liability Slip and Falls | Non-MVA |
| Workers Compensation | Work-comp |
| Washington Cases | WA-specific |
| Minor's Compromise | Minors detail |

**Action:** Export knowledge docs to markdown and re-run extraction if those scripts are needed.

---

## Covered well (clear process in sources)

| Area | Why |
|------|-----|
| Day-of intake flow | Full PI Workflow transcript |
| Needs List documents | Explicit list + homework pattern |
| Treatment compliance coaching | Gaps, MRI, care ladder, monthly demand visits |
| 3P open + LOR same day | Step-by-step with field list |
| Client PD-only insurance script | Explicit coaching language |
| Hospital bill client-retrieval rationale | Detailed explanation |
| Treatment gap / MRI timing | 30-day review + 1–2 month / 8-week rules |
| Meds tab reconciliation for demand | Demand Prep Part 1 |
| Offer logging + settlement scenarios | Negotiation tab training |
| Chiro color-code follow-up | Med training notes |
| Conflict check + related cases | Cleaner Fish / PI Workflow |
| NV SOL 2 years | Explicit |

---

## Mentioned but vague / incomplete

| Topic | What’s missing |
|-------|----------------|
| Future care “25% of settlement” | No calculation rules, timing, or client disclosure script |
| Doctors’ discounts 35–45% | Example only; not a reduction playbook |
| MedPay “usually goes directly to customer when under 10k” | Conditions and exceptions incomplete |
| Acknowledge in 20 days / investigate in 30 days | Cited as “rules” but statute/regulation not named |
| Criminal history ~10 years on claims history form | “I believe it’s like 10 years” — not definitive |
| Witness statements | Only when liability disputed; no template text in corpus |
| EUO prep | Module title exists; not fully extracted into system-spec |
| Deposition prep | Module exists; litigation-adjacent, not fully mapped |
| Long vs short lien reduction | Modules exist; detailed scripts partially captured |
| Subrogation full workflow | Long transcript exists; needs dedicated attorney-reviewed summary |
| WA vs NV differences | Templates for both; no single comparison matrix in training |
| Policy limit pull vendors/process | Cost ranges only; no step-by-step |
| “Pro rata” among claimants | Mentioned; formula not taught |
| Stop At thresholds | Color codes exist; numeric stop-at rules per clinic not documented |
| Part 2 of PI Workflow (pay-out) | Explicitly deferred in video (“part two… at some point”) |

---

## Conflicts / tensions across sources

| Tension | Notes |
|---------|--------|
| Client gets hospital bills **vs** firm eventually requests them | Prefer client for ~1 month; then firm requests if client fails — reductions suffer |
| Don’t open 1P **vs** open 1P for rental | Last resort vs client-fire risk on PD |
| Don’t send MedPay early **vs** send immediately if hospital will raid MedPay | Case-by-case; no decision tree formalized |
| Don’t want treatment “done” **vs** need MMI-ish demand package | Keep monthly evals while demand out |
| Vague LOR facts **vs** detailed intake facts | Intake is detailed; insurer communications stay vague |
| HIPAA blank facility **vs** prior-records date edits | Different edit rules for current vs prior providers |

---

## Attorney-presence assumptions (app must replace or gate)

Training assumes a licensed attorney / supervising attorney for:

1. **Demand letter final review and send authority**
2. **Reduction percentages and flat fee reductions** on settlement calculator
3. **Approving expensive treatment** (e.g. injections) relative to liability posture
4. **Litigation vs settle** decisions (criminal history, bad facts)
5. **Dropping a client** / asserting liens on drop (templates exist; decision is attorney)
6. **Conflict waiver strategy** when co-clients blame each other
7. **Contingency fee agreement** terms
8. **Trust accounting / disbursement approval**
9. **Minor’s compromise** court process
10. **Case valuation** answers to “how much will I get?”
11. **NRS / case law** application (doc title only; no body)
12. **Transfer to litigation** matrix (module exists; attorney-led)

PraxiumLaw product implication: **hard gates** — staff prepare; attorney approves.

---

## Legally sensitive / privilege-adjacent content

Flag for counsel review before publishing articles externally:

| Content | Risk |
|---------|------|
| Coaching clients to appear “destitute” to hospitals for discounts | Ethical / misrepresentation concerns if overstated |
| Withholding attorney involvement from medical providers | Strategy discussion; jurisdiction-specific ethics |
| “Always say yes” to all offered treatment | Could be read as directing care; medical decisions are physician/patient |
| Fee percentages and reduction targets | Firm-specific; not general legal advice |
| Spoliation / social media instructions | Fine as education; not a substitute for counsel advice |
| Sharing case info with lenders (consent form) | Privacy / privilege boundaries |
| Client criminal history collection | Sensitive data handling (retain policy needed) |

**Privilege:** Training describes internal case strategy. Published knowledge-base articles should stay at **process education** level and avoid case-specific attorney-client communications.

---

## PDFs with weak extraction

These files exist but text extraction was poor (image-heavy or encoding). Prefer video transcripts where available:

- Personal Injury Workflow PDF (transcript used instead)
- Virtual Assistant Training module PDF
- PI Intake MVA Questionnaire fillable PDF (DOCX questionnaire used instead)
- Organizational Structure PDF
- Case Flow Chart / Chart PDFs (visual — not transcribed)

**Action:** OCR pass if charts contain unique milestones not in transcripts.

---

## Non-MVA / out of product scope (present in archive, not mapped)

- Real estate / MLS / Transaction Desk modules  
- Mass torts, premise liability, workers’ comp (titles only)  
- Hiring and admin-only modules  

---

## Recommended manual completion order

1. Export knowledge-base docs if lead scripts / Tettra SOPs are needed  
2. Optional: expand treatment-compliance script library from operator experience  
3. Attorney review of ethically sensitive coaching articles before public blog  
4. OCR Case Flow Chart + Organizational Structure if useful  
5. Dedicated pass on lien reduction + subrogation long transcripts  
6. WA vs NV jurisdiction matrix  
7. Formalize 1P / MedPay decision tree with attorney sign-off  
