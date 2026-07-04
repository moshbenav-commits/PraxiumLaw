# Medical Documents — Types, Naming, and Workflow

**Category:** Medical Record Tracking  
**Source:** `system-spec.md` §2b, §3 · Med training · Medical LOR scripts · Lit audit  
**Audience:** Case manager, paralegal, records staff, clerical  
**White-label:** Any firm — [`../DISCLOSURE.md`](../DISCLOSURE.md)

---

## What counts as a “medical document”

In training taxonomy, **Medical** is everything from providers about treatment — not the signed intake HIPAA page (that is **Intake** until used for a request).

| Type | Examples | File as |
|------|----------|---------|
| **Medical records (MR)** | Office notes, MRI reports, PT notes, hospital records | `MR` + provider + date |
| **Bills (B)** | Itemized statements, UB-04, physician groups, radiology, ambulance | `B` + provider + date |
| **Futures estimate (FE)** | Injection/surgery cost estimates before procedure | `FE` + amount + date |
| **Certificate of Records (COR)** | Provider certifies completeness for a billing period | Flag on Meds tab — [`20-certificate-of-records.md`](./20-certificate-of-records.md) |
| **Lien verification** | Balance confirmation while treating (not full MR) | Note on Meds + task |

**Not medical (different taxonomy):**

| Type | Examples |
|------|----------|
| **Intake** | Signed HIPAA blank, fee agreement, ID copy |
| **Invoice/receipt** | ChartSwap fee, copy fees, police report purchase |
| **Auto insurance** | Adjuster letters about BI/PD (not provider bills) |

See [`18-document-taxonomy.md`](./18-document-taxonomy.md).

---

## Hospital / ER = four bill streams

One ER visit often produces **four** separate items — each needs its own Meds row and files:

1. **Hospital facility** bill  
2. **ER physician group** (contracted)  
3. **Radiology group** (contracted)  
4. **Ambulance**  

Training prefers **client self-retrieval** of hospital/ambulance mail for ~30 days (reduction leverage) — [`02-hospital-bills-client-retrieves.md`](./02-hospital-bills-client-retrieves.md).

---

## File naming conventions

Keep names short; use hashtags if the system has no folders:

| Code | Meaning | Example |
|------|---------|---------|
| **MR** | Medical records | `MR Dr Smith 2024.03.15` |
| **B** | Bill | `B Hospital ABC 2024.03.15` |
| **FE** | Futures estimate | `FE Pain Mgmt Injection 3500 2024.04.01` |

- Date style in training: `YYYY.MM.DD` with leading zeros  
- Tag **client** vs **defendant** photos separately  
- Case manager **initials** on Meds entries (letters pull staff initials)

Upload to matter → Documents; classify type **Medical**; update **Meds tab** balances.

---

## HIPAA — two different moments

| Moment | Rule |
|--------|------|
| **At intake signing** | HIPAA signed with **facility name blank** — template: `(WA) HIPAA - Minor.docx` or HIPAA in intake pack |
| **When requesting records** | Fill **provider name** on HIPAA; attach to Medical LOR; combine to one PDF |

**Prior accidents (5 years):** Request **records only** (not bills); narrow HIPAA date range to five years prior — do not use blank facility copy without editing dates.

---

## Outbound templates (requesting medical documents)

| Template | When to use |
|----------|-------------|
| `(WA) Medical Letter of Rep.docx` / `(WA) Medical LOR_Non Hospital.docx` | Standard records + bills request |
| `(WA) Chiropractor Request for Bills_Records.docx` | Chiro-specific |
| `(WA) Chiropractor Letter of Rep.docx` | Chiro LOR |
| **High-Tech letter** (training module) | Invoice **≥ ~$100** or uncooperative facility — always with signed HIPAA page |
| `(NV)` medical/chiro variants | Nevada matters |

Full send workflow: [`21-medical-lor-workflow.md`](./21-medical-lor-workflow.md)

**Before sending:**

1. Confirm records/bills actually missing  
2. **No duplicate paid request**  
3. Choose records only, bills only, or both  
4. Date range: DOL → present (or specific DOS)  
5. Check **ChartSwap** / portal requirements first  

---

## When to request what

| Case stage | Action |
|------------|--------|
| **Client still treating** | **Lien balance verification** by phone/letter — not full MR every month |
| **Demand prep / done treating** | Full **Medical LOR + HIPAA** for every provider missing MR/B |
| **Transfer to litigation** | Bills + records + **COR** for each provider — [`20-certificate-of-records.md`](./20-certificate-of-records.md) |
| **Prior accident workup** | Records only, 5-year HIPAA range |

---

## Meds tab = system of record

Every provider on Meds with:

- Specialty · first treatment date · LTD/NTD · balance · lien holder · FE if any · **COR status** · case manager initials  

Meds must match Documents tab before demand. Duplicates break settlement calculator.

Deep dive: [`08-meds-tab-and-record-hygiene.md`](./08-meds-tab-and-record-hygiene.md)

---

## Before sending medical docs to carriers

**Redact** PHI and identifiers — [`19-redaction-checklist.md`](./19-redaction-checklist.md):

DOB, SSN, address, Medicare ID, VIN, plate, health plan IDs, sensitive diagnoses.

Never export unredacted MR/B to 3P adjuster without checklist.

---

## PraxiumLaw today vs training

| Training expects | App today |
|------------------|-----------|
| Meds ledger with MR/B/FE/COR | **Medical tab** — editable ledger (balance, LTD/NTD, FE, COR, LOR status) |
| Taxonomy **Medical** on upload | Optional folder string only (UX-009) |
| LOR request log per provider | **Medical tab** — LOR status per row; templates at `/settings/templates` |
| Redaction gate | None (UX-010) |
| Duplicate-request warning | None |

MR/B/FE file naming: upload to Documents; balances live on Medical tab.

---

## Related templates (full list)

Medical/LOR/chiro: search `white-label-templates/docx/` for `Medical`, `Chiro`, `HIPAA`, `Med Pay`, `Lien`.

Intake HIPAA (signed blank): see [`23-intake-forms-and-signature-packet.md`](./23-intake-forms-and-signature-packet.md).
