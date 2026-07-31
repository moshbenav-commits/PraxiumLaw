# Intake Forms & Signature Packet (Template Catalog)

**Category:** Client Intake 
**Recommended procedure** — cross-reference against your firm's policy and jurisdiction before use. 
**References:** [`../REFERENCES.md`](../REFERENCES.md) 
**Audience:** Intake specialist, paralegal, case manager 
**White-label:** Replace `{{FIRM_NAME}}` etc. Counsel review required — [`../DISCLOSURE.md`](../DISCLOSURE.md)

---

## Two layers at intake

| Layer | What it is | Where in templates |
|-------|------------|-------------------|
| **Questionnaire** | Client fills facts of loss, injuries, insurance, witnesses (bilingual EN/ES, ~8 pages) | `firm template` |
| **Signature packet** | Client signs retainers, authorizations, disclosures | the firm document pack + jurisdiction variants (below) |
| **Needs List** | Homework checklist — documents to bring back | Not a single form; live checklist — [`01-intake-needs-list.md`](./01-intake-needs-list.md) |

Staff **copies client documents** while the client completes the questionnaire. Case manager reviews legibility **before** data entry into PraxiumLaw.

---

## MVA questionnaire (data capture)

**Primary template:** `firm template` (also extracted text in `sources/templates-text/`)

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
| 1 | **Contingency fee agreement** | Representation | `firm template` |
| 2 | **Conflict waiver** | Multi-occupant same vehicle | Use firm counsel form if not in pack |
| 3 | **Limited power of attorney** | Endorse settlement checks to trust | `firm template` |
| 4 | **General release / authorization** | Police reports, general auth | `firm template` |
| 5 | **Wage loss authorization** | Lost wage claims | `firm template` |
| 6 | **HIPAA (medical)** | Records requests — **leave facility name blank** at signing | `firm template` (minors), `firm template`; fill facility per provider later |
| 7 | **Medicare questionnaire** | If Medicare recipient | `firm template` |
| 8 | **Non-Medicare intake bundle** | Standard intake docs pack | `firm template` |
| 9 | **Medical claims history** | Prior accidents/claims (~5 yr) | Part of intake bundles / questionnaire |
| 10 | **Internet / surveillance acknowledgment** | Social media warning | In intake bundles |
| 11 | **Consent for disclosure** | Share info with insurers, lien holders, providers | `firm template` |
| 12 | **Property damage disclosure** | PD-only client coaching | `firm template` |
| 13 | **ISO authorization** | Claims history pull | `firm template` |
| 14 | **Attorney lien notice** | jurisdiction-specific | `firm template` |

**Special intakes:**

| Situation | Template |
|-----------|----------|
| Out-of-state client | `firm template` |
| Medicare recipient | `firm template` |
| Minor client | `firm template` + counsel minor fee agreement |
| Client leaving prior firm | `firm template` |

**Jurisdiction variants:** Maintain separate template sets where your state(s) differ.

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
7. Generate **3P LOR** day one — [`04-opening-3p-and-1p-claims.md`](./04-opening-3p-and-1p-claims.md) — templates: `3P LOR…`, `3P LOR…` 

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
