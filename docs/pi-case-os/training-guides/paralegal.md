# Training Guide — Paralegal

**PraxiumLaw role:** `paralegal`  
**Reports to:** Supervising attorney · Partner

Paralegals often **overlap case manager duties** plus heavier document production, filings support, and workflow ownership.

---

## Purpose

Draft and assemble litigation-ready documents, maintain pleadings/filings hygiene, support demand and settlement packages, and run firm workflows — always under attorney supervision on legal strategy and send gates.

---

## What you own

| Area | Tasks |
|------|-------|
| **Intake support** | Conflict check tasks, retainer packet, HIPAA/med auth — forms: [`23-intake-forms-and-signature-packet.md`](../articles/23-intake-forms-and-signature-packet.md) |
| **Records** | Medical LOR, prior records, COR — [`24-medical-documents-reference.md`](../articles/24-medical-documents-reference.md) |
| **Insurance** | LOR mail merge, acknowledgment follow-up letters |
| **Demand** | Draft demand letter + exhibit binders — **attorney approves** |
| **Settlement** | Reduction request letters (short/long templates) — **attorney sets terms** |
| **Litigation prep** | Transfer-to-lit letters, filing drafts — attorney signs |
| **Quality** | Document naming (MR, B, FE), taxonomy, redaction before carrier send |

---

## Attorney gates

- Demand send  
- Reduction percentages / settlement authority  
- Drop / assert lien on drop  
- Transfer to litigation  
- Any letter implying legal conclusion or admission  

---

## PraxiumLaw — wired today

| Action | Where |
|--------|-------|
| Matter documents | Upload, folder field, PDF view |
| **3P/1P insurance tracking** | Matter → **Insurance** tab |
| Filings list | Matter → Filings tab (API exists) |
| E-sign packets | `/esign` |
| Workflow toggles | `/settings/workflows` — intake paralegal tasks auto-fire |
| Tasks | Full read/write |
| Leads | Read/claim (with attorney on convert) |

**Workflow default:** On new matter → tasks: conflicts check, retainer letter, med records auth.

---

## Not wired yet

- Template merge engine (106 white-label DOCX in corpus)  
- Demand builder UI  
- Redaction checklist enforcement  
- CourtConnect filing submit (stub UI)  
- PI-specific filing types  

Templates (patterns only): `docs/pi-case-os/sources/docs/white-label-templates/` — browse in app at **Settings → Template library** (`/settings/templates`).

---

## Required reading

1. [`../articles/24-medical-documents-reference.md`](../articles/24-medical-documents-reference.md) — MR/B/FE/COR + templates  
2. [`../articles/23-intake-forms-and-signature-packet.md`](../articles/23-intake-forms-and-signature-packet.md) — intake packet  
3. [`../articles/18-document-taxonomy.md`](../articles/18-document-taxonomy.md)  
4. [`../articles/19-redaction-checklist.md`](../articles/19-redaction-checklist.md)  
5. [`../articles/21-medical-lor-workflow.md`](../articles/21-medical-lor-workflow.md)  
6. [`../articles/09-demand-prep-checklist.md`](../articles/09-demand-prep-checklist.md)  
7. [`../articles/22-transfer-to-litigation.md`](../articles/22-transfer-to-litigation.md)  
8. [`case-manager.md`](./case-manager.md) — shared operational timeline  

---

## First week

1. Process one records request end-to-end  
2. Redact one medical packet using checklist  
3. Assemble exhibit index for one demand (draft)  
4. Review workflow settings with admin  
