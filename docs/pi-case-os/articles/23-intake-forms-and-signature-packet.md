# Intake Forms & Signature Packet (Template Catalog)

**Category:** Client Intake  
**Source:** `system-spec.md` §1 · MVA questionnaire · white-label template library (`sources/docs/white-label-templates/`)  
**Audience:** Intake specialist, paralegal, case manager  
**White-label:** Replace `{{FIRM_NAME}}` etc. Counsel review required — [`../DISCLOSURE.md`](../DISCLOSURE.md)

---

## Two layers at intake

| Layer | What it is | Where in templates |
|-------|------------|-------------------|
| **Questionnaire** | Client fills facts of loss, injuries, insurance, witnesses (bilingual EN/ES, ~8 pages) | `MVA Questionnaire & Intake.docx`, `INTAKE SHEET - FILLABLE MVA QUESTIONNAIRE.docx`, `PI Intake MVA Questionnaire (Fillable).docx` |
| **Signature packet** | Client signs retainers, authorizations, disclosures | WA numbered pack + NV variants (below) |
| **Needs List** | Homework checklist — documents to bring back | Not a single form; live checklist — [`01-intake-needs-list.md`](./01-intake-needs-list.md) |

Staff **copies client documents** while the client completes the questionnaire. Case manager reviews legibility **before** data entry into PraxiumLaw.

---

## MVA questionnaire (data capture)

**Primary template:** `MVA Questionnaire & Intake.docx` (also extracted text in `sources/templates-text/`)

Captures (minimum):

- Identity, DOB, SSN, address, phones, email, marital status, language  
- Role in accident (driver / passenger / pedestrian)  
- Accident type, seatbelt, airbags, weather, location, citations  
- Lyft/Uber/work driving (client + defendant)  
- Police agency + report number  
- Narrative, priors, witnesses  
- Medical transport, hospital, imaging, current treatment  
- Additional pages: insurance, injuries, employment  

**PraxiumLaw today:** Enter DOL, SOL, client contact, incident date on `/matters/new` — **no** full questionnaire UI. Use fillable DOCX or `/intake` public form for lead capture only.

---

## Signature packet — document by document

Print/sign at intake (counsel-approved set for your jurisdiction):

| # | Document | Purpose | Template file(s) |
|---|----------|---------|------------------|
| 1 | **Contingency fee agreement** | Representation | `(WA) Contingency Fee Agreement.docx`, `1.-Contingency Fee Agreement WA.docx` |
| 2 | **Conflict waiver** | Multi-occupant same vehicle | Use firm counsel form if not in pack |
| 3 | **Limited power of attorney** | Endorse settlement checks to trust | `6.- LIMITED POWER OF ATTORNEY WA.docx` |
| 4 | **General release / authorization** | Police reports, general auth | `4.-GENERAL RELEASE WA.docx` |
| 5 | **Wage loss authorization** | Lost wage claims | `(WA) Wage Loss Verification.docx` |
| 6 | **HIPAA (medical)** | Records requests — **leave facility name blank** at signing | `(WA) HIPAA - Minor.docx` (minors), `5.- HIPAA for Policy Limits w Chiro Info WA.docx`; fill facility per provider later |
| 7 | **Medicare questionnaire** | If Medicare recipient | `(WA) Intake - Medicare Recipient.docx`, `7.- Medicare Questionaire 1 WA.docx` |
| 8 | **Non-Medicare intake bundle** | Standard intake docs pack | `(WA) Intake Docs - Not a Medicare Recipient.docx` |
| 9 | **Medical claims history** | Prior accidents/claims (~5 yr) | Part of intake bundles / questionnaire |
| 10 | **Internet / surveillance acknowledgment** | Social media warning | In intake bundles |
| 11 | **Consent for disclosure** | Share info with insurers, lien holders, providers | `3.- CONSENT FOR DISCLOSURE OF INFORMATION WA.docx` |
| 12 | **Property damage disclosure** | PD-only client coaching | `8.- Property Damage Disclosure WA.docx` |
| 13 | **ISO authorization** | Claims history pull | `9.- ISO Authorization WA.docx` |
| 14 | **Attorney lien notice** | NV practice | `(NV)` / `(WA) Attorney Lien.docx`, `2.- Attorney Lien (WA).docx` |

**Special intakes:**

| Situation | Template |
|-----------|----------|
| Out-of-state client | `(WA) Out of State Intake.docx` |
| Medicare recipient | `(WA) Intake - Medicare Recipient.docx` |
| Minor client | `(WA) HIPAA - Minor.docx` + counsel minor fee agreement |
| Client leaving prior firm | `(WA) Client Dropping Another Firm.docx` |

**NV jurisdiction:** Use `(NV)` prefixed LOR/lien templates where WA differs.

---

## Medicare vs non-Medicare branch

At intake ask: **Is client a Medicare recipient?**

- **Yes** → Medicare questionnaire + Medicare intake bundle  
- **No** → `Intake Docs - Not a Medicare Recipient` pack  

Wrong branch affects subrogation later — flag on matter.

---

## Day-of-intake workflow (forms + documents)

1. Client completes **MVA questionnaire** (pen or fillable PDF/DOCX)  
2. Staff copies ID, cards, any bills in hand  
3. Print **signature packet** (Medicare branch + minor if applicable)  
4. Client signs; staff witnesses as firm policy requires  
5. Scan signed packet → matter Documents, type **Intake**  
6. Hand client **Needs List** with appointments written on it  
7. Generate **3P LOR** day one — [`04-opening-3p-and-1p-claims.md`](./04-opening-3p-and-1p-claims.md) — templates: `(WA) 3P LOR…`, `(NV) 3P LOR…`  

---

## Template library location

**Editable:** `sources/docs/white-label-templates/docx/` (106 templates)  
**PDF:** matching files in `pdf/`  

Before live use: replace placeholders, counsel review — [`../WHITE_LABEL.md`](../WHITE_LABEL.md).

**PraxiumLaw:** Template browser at **Settings → Template library** (`/settings/templates`). Print/download **intake packet checklist** from there or `/training/intake-checklist`. Full merge engine still pending (UX-020).

---

## Related articles

- [`01-intake-needs-list.md`](./01-intake-needs-list.md) — homework documents  
- [`17-in-office-intake-coaching.md`](./17-in-office-intake-coaching.md) — live intake scripts  
- [`13-conflict-check-and-related-cases.md`](./13-conflict-check-and-related-cases.md)  
- [`18-document-taxonomy.md`](./18-document-taxonomy.md) — classify signed packet as **Intake**
