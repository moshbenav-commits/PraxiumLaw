# Training Guide — Intake Specialist

**PraxiumLaw role:** `staff` or `paralegal` 
**Reports to:** Supervising attorney · Case manager (after sign-up)

---

## Purpose

You are the **first operational touch** after marketing hands off a lead. Your job is to qualify the case, collect documents, run conflict checks, execute the signature packet, and hand off a complete file — not to give legal advice.

---

## What you own

| Task | When |
|------|------|
| Lead follow-up and scheduling | Same day |
| In-office or phone intake (firm script) | Appointment |
| MVA questionnaire / intake sheet review | Before data entry |
| **Print & execute signature packet** | Day of signing — see catalog below |
| Needs List tracking | Day 0–7 |
| Conflict check (defendant + owner if different) | Before sign |
| Signature packet generation | Intake appointment |
| Scan/index inbound docs with correct **taxonomy** | Ongoing |
| Book first medical appointments (two tracks) | Day 0–3 |
| Client coaching: PD-only with insurers, no gaps | Day 0+ |

---

## Attorney gates (you prepare — attorney decides)

- Sign / decline representation 
- Fee agreement exceptions 
- Conflict resolution when hit found 
- Lyft/Uber/work-driving preservation strategy 

---

## Intake forms & templates (document library)

Full catalog: [`../articles/23-intake-forms-and-signature-packet.md`](../articles/23-intake-forms-and-signature-packet.md)

**Location:** `sources/docs/white-label-templates/docx/` (106 editable templates + PDFs) · **In app:** Settings → **Template library** · **Print checklist:** `/training/intake-checklist`

### Questionnaire (client fills)

| Template | Use |
|----------|-----|
| `firm template` | Primary bilingual EN/ES questionnaire (~8 pages) |
| `firm template` | Fillable variant |
| `firm template` | Alternate fillable |

Enter key fields into PraxiumLaw matter/contact after legibility check.

### Signature packet (client signs at intake)

| Document | Template |
|----------|----------|
| Fee agreement | `firm template` |
| Limited POA | `firm template` |
| General release | `firm template` |
| Wage auth | `firm template` |
| HIPAA | **Blank facility at sign** — `firm template` or intake pack HIPAA |
| Medicare questionnaire | `firm template` if Medicare |
| Intake bundle | `firm template` **or** `firm template` |
| Disclosure consent | `firm template` |
| PD disclosure | `firm template` |
| ISO auth | `firm template` |
| Out of state | `firm template` |

**Medicare branch:** Ask at intake — wrong pack breaks subrogation workflow later.

After signing: scan entire packet → matter Documents → classify **Intake** ([`18-document-taxonomy.md`](../articles/18-document-taxonomy.md)).

---

## Medical documents at intake (what you collect — not what you sign)

At intake you **collect** client-held medical items for the Needs List; you do **not** usually send Medical LORs until later (except lien verify if needed).

| Client brings | Classify as | Guide |
|---------------|-------------|-------|
| Hospital / ambulance / ER bills | **Medical** (`B`) | [`24-medical-documents-reference.md`](../articles/24-medical-documents-reference.md) |
| Records in hand | **Medical** (`MR`) | same |
| Health insurance card | **Intake** | Needs List |
| Signed HIPAA (blank facility) | **Intake** | Keep for future LOR merges |

Hospital stack = up to **four** bills (facility, ER doc, radiology, ambulance). Prefer client retrieval — [`02-hospital-bills-client-retrieves.md`](../articles/02-hospital-bills-client-retrieves.md).

---

## Day 0 checklist

- [ ] Create **contact** + **matter** in PraxiumLaw (`/matters/new`) — set DOL, SOL (e.g., 2 years in many states — confirm yours) 
- [ ] Enter intake fields: language, texting preference, DOB, marital status, role in accident 
- [ ] Assign team roles (case manager, attorney, clerical, billing) on matter 
- [ ] Generate intake documents (English/Spanish per firm policy) 
- [ ] Run **conflict check** — see [`../articles/13-conflict-check-and-related-cases.md`](../articles/13-conflict-check-and-related-cases.md) 
- [ ] Walk **Needs List** — see [`../articles/01-intake-needs-list.md`](../articles/01-intake-needs-list.md) 
- [ ] Collect declarations page, ID, health card, photos, estimates 
- [ ] Enable client **text line** — text only, not voice 
- [ ] Book chiro/PT **and** GP/pain management 
- [ ] Open **3P claim** day one — see [`../articles/04-opening-3p-and-1p-claims.md`](../articles/04-opening-3p-and-1p-claims.md) 
- [ ] Coach client: speak to adjuster about **PD only** — [`../articles/03-property-damage-liability-timing.md`](../articles/03-property-damage-liability-timing.md) 

---

## PraxiumLaw — wired today

| Action | Where |
|--------|-------|
| **Needs List checklist** | Matter → **Intake** tab |
| **3P/1P insurance** | Matter → **Insurance** tab |
| Public lead form | `/intake/:firmSlug` |
| Claim/convert lead | `/inbox` |
| Create matter + contact | `/matters/new`, `/contacts/new` |
| Print signature packet checklist | `/training/intake-checklist` or Settings → Templates |
| Upload intake scans | Matter → Documents tab |
| Assign tasks | Matter → Tasks (or workflow auto-tasks) |
| E-sign retainer | `/esign` |
| Client portal invite | Matter → enable portal |

---

## Not wired yet (work offline / manual)

- Related-case linker on conflict check 
- In-app intake scripts / coaching prompts 
- Cold **phone lead** greeting script — **gap**; in-office coaching only in [`../articles/17-in-office-intake-coaching.md`](../articles/17-in-office-intake-coaching.md) 

---

## Required reading

1. [`../articles/23-intake-forms-and-signature-packet.md`](../articles/23-intake-forms-and-signature-packet.md) — **forms catalog** 
2. [`../articles/01-intake-needs-list.md`](../articles/01-intake-needs-list.md) 
3. [`../articles/24-medical-documents-reference.md`](../articles/24-medical-documents-reference.md) — what to collect vs sign 
4. [`../articles/17-in-office-intake-coaching.md`](../articles/17-in-office-intake-coaching.md) 
5. [`../articles/13-conflict-check-and-related-cases.md`](../articles/13-conflict-check-and-related-cases.md) 
6. [`../articles/18-document-taxonomy.md`](../articles/18-document-taxonomy.md) 
7. [`../articles/16-treatment-compliance-coaching.md`](../articles/16-treatment-compliance-coaching.md) 

---

## Common mistakes

- Letting client discuss **injuries** with 3P adjuster before attorney strategy 
- Skipping owner conflict check when driver ≠ registered owner 
- Data entry before questionnaire is legible 
- Calling the **text-only** line for voice 
- Opening 1P/MedPay too early (training: 3P first; 1P last resort) 

---

## First week goals

1. Complete one supervised intake end-to-end 
2. Memorize Needs List top 10 items 
3. Practice PD-only client script aloud 
4. File 5 documents with correct taxonomy labels 
