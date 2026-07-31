# PraxiumLaw PI Case OS — Improvement Opportunities (from full source corpus)

Prioritized list of what in `sources/` can strengthen the product beyond the current specs.  
All shippable items must stay **white-label** and honor [`DISCLOSURE.md`](./DISCLOSURE.md).

---

## P0 — Ship in product (high value, clear in sources)

| Opportunity | Source | Product impact |
|-------------|--------|----------------|
| **Document taxonomy** | Standard practice: Documents Saving Overview | Classify every inbound item: Intake / Medical / Auto insurance / Health-subro / Invoice-receipt / Pleadings / Misc. Drive tab updates + tasks from type. |
| **Redaction rules** | Standard practice: Redaction script | Mandatory redact before sending records to carriers: DOB, age, address, SSN, Medicare ID, VIN, plate, health-ins IDs, sensitive diagnoses (STD/HIV), ethnicity, lien-holder IDs. Prevents prior-claim indexing and lowball offers. |
| **Certificate of Records (COR)** | litigation audit checklist | When treatment done (or transfer to lit), require COR per provider/billing period. Missing COR = not verified. Reduces supplements. |
| **Medical LOR workflow** | Script Medical LOR | Check no duplicate request; date-range from DOL–present or specific DOS; attach HIPAA with provider name filled; fax subject convention; follow-up task open until received. |
| **Reduction pre-check** | Short/Long Reduction scripts | Before reduction letters: reconcile Meds totals to attached bills **and** disbursement sheet; send to lien holder if present; follow up in 1 week. |
| **Transfer-to-litigation notice** | Transfer to Litigation Letter | Auto-prompt letter to providers/carriers when phase = lit and correspondence arrives; include litigating attorney contact. |
| **White-label template catalog** | Letter templates (NV/WA packs) | Onboarding pack of template *types* (not firm-branded files): see list below. |

### Template types to productize (placeholders only)

Intake packet · Contingency fee · HIPAA (adult/minor) · Medicare questionnaire · 1P/3P LOR · LOP · Medical LOR · MedPay w/ and w/o bills · Preservation · Liability confirm/deny/inquiry · Demand (limits / not limits / supplemental) · Counter (simple / MRI / low-impact) · Last-chance · Lien verify · Short/long reduction · Drop letter · Non-engagement · Monthly status (EN/ES) · Please contact office (EN/ES) · Loss of use · Transfer to lit · Disbursement letter · Dog-bite variants (optional practice area) · Out-of-state intake · Client dropping another firm

---

## P1 — Strong product features (partially in specs today)

| Opportunity | Source | Add to product |
|-------------|--------|----------------|
| **litigation audit checklist** | litigation audit checklist | Structured audit fields: primary/secondary, FOL, meds total, future meds, life care plan, lost wages, PD amount/complete/damage tier, treatment status, LTD (PM only), COR status, subro applicable/initiated/complete, 3P/1P limits & offers, medical summary currency, lit letter signed, complaint/service/answer/REA/ECC/discovery/depos/mediation/motions/open tasks. |
| **Lit phases** | litigation audit checklist | Phases: Transfer to Lit · Lit Last Chance · Lit/Treating · Lit/Done Treating · secondary variants. |
| **Court type rules** | litigation audit checklist | District / Federal / Justice / Arbitration; Justice Court → REA N/A. |
| **Medical summary gate** | litigation audit + Case Audit | Summary dated **after** last treatment day before negotiation/lit handoff. |
| **PD damage tier** | litigation audit | Low / medium / high; if low (&lt;~$2k) force photo review of both vehicles. |
| **Team role model** | VA Roles / List of Teams | White-label roles: POC, Jr Admin, Sr Caller, MedSum, Records, Demand, Subro, Disbursement, Reconciliation, E-filing — not named people. |
| **Inbound document channels** | Docs overview | Model fax/mail/email/text/photo/voicemail as intake channels with routing rules. |
| **Expense/receipt capture** | Saving invoices | Police report, limits pull, copy fees → expenses tab (feeds disbursement). |

---

## P2 — Nice-to-have / later

| Opportunity | Notes |
|-------------|--------|
| Spanish monthly status / contact letters | Templates exist; productize bilingual exports |
| Dog-bite letter set | Adjacent practice area |
| Pleadings naming conventions | Lit module |
| VA recruitment SOP | Ops, not case OS |
| Empty docx (Demands/Counters/Med Pay Demand scripts) | Files empty — rely on video transcripts instead |
| Google Drive knowledge bodies | Still stubs; export if needed |
| Remaining intake audio (Class / Intake / Intake 2) | Whisper in progress — lead phone scripts |

---

## Already well covered (do not re-derive)

Intake Needs List · 3P/1P timing · treatment compliance · MRI gates · Meds hygiene · demand demand worksheet order · settlement scenarios · subrogation Medicare path · attorney gates · white-label disclosure.

---

## Recommended implementation order

1. Document type classifier + redaction checklist (P0)  
2. COR + Medical LOR workflows (P0)  
3. White-label template pack index in app (P0)  
4. Reduction pre-check + disbursement reconcile (P0)  
5. litigation audit module + transfer-to-lit letter (P1)  
6. Role-based team model (P1)  
7. Finish intake-call transcripts → lead scripts (P2)

---

## Articles to add (this pass)

| Article | Topic |
|---------|--------|
| `18-document-taxonomy.md` | Document types and filing actions |
| `19-redaction-checklist.md` | What to redact before carrier send |
| `20-certificate-of-records.md` | COR requirement |
| `21-medical-lor-workflow.md` | Records request procedure |
| `22-transfer-to-litigation.md` | Lit handoff notices |
