# PraxiumLaw PI Case OS — Terminology & Glossary

Two goals: (1) **keep true industry-standard terms** so the procedures read like real PI practice, and (2) **replace firm-specific jargon** with neutral Praxium wording so nothing reads as another firm's internal vocabulary. See [`DISCLOSURE.md`](./DISCLOSURE.md).

> Rule of thumb: if a term is used firm-to-firm across the industry, keep it. If it's a single firm's internal nickname or a **state-specific** artifact, generalize it.

## Industry-standard terms — keep

| Term | Meaning |
|------|---------|
| **LOR** (Letter of Representation) | Notice to a carrier/provider that the firm represents the client |
| **LOP** (Letter of Protection) | Attorney assurance that a provider will be paid from settlement |
| **Demand** | The settlement demand package/letter |
| **Disbursement** | Paying liens/providers/fees and the client from settlement |
| **Subrogation** | A payer's right to reimbursement from the recovery |
| **UM/UIM** | Uninsured / underinsured motorist coverage |
| **MedPay / PIP** | First-party medical (and, for PIP, wage) coverage |
| **Quantum meruit** | "Reasonable value of services" — basis for a discharged attorney's fee |
| **Charging lien** | Attorney's lien on the recovery |
| **Minor's compromise** | Court approval of a minor's settlement |
| **Guardian ad litem (GAL)** | Person appointed to protect a minor's interest |
| **MMI** | Maximum medical improvement |
| **MIST** | Minor Impact Soft Tissue (industry label for low-PD soft-tissue cases) |
| **IOLTA / trust account** | Where client/settlement funds are held |
| **Statute of limitations (SOL)** | Filing deadline |
| **Comparative / contributory fault** | Fault-allocation rules affecting recovery |
| **Policy limits** | Maximum coverage available |

## Firm-specific jargon → use instead

| Avoid (firm/regional jargon) | Use (Praxium / neutral) | Why |
|------------------------------|--------------------------|-----|
| **Yellow sheet** | **Crash/DMV report** *(when it means the report)* or **demand worksheet** *(when it means the demand order)* | Firm/Nevada-specific slang (a Nevada DMV form), not an industry term — and ambiguous |
| **Cleaner fish** | **Case audit / QA review** | Internal nickname for a QA role |
| **The vine / Filevine tab** | **The case file / [section] in the case-management system** | Ties to a specific product; keep platform-neutral |
| **Smiley face (on the sheet)** | **Reduction-approved flag** | Internal UI convention |
| **EOS report / case grade tab** | **Case-grade / metrics** | Firm-specific tooling name |
| **Needs list** | **Intake needs list** *(acceptable)* / **required-documents checklist** | Borderline-generic; fine as "intake needs list," avoid as a proper noun |
| **Runner slip / Legal Wings form** | **Court-runner request** | Vendor/firm-specific |
| Specific template filenames (`(WA) …docx`, numbered packs) | **"firm template"** + the document type | Real filenames are a fingerprint; describe the *type*, not the file |
| State-specific figures (e.g., "25/50 minimum," "NRS …") | **"your state's minimum/statute"** (+ example if useful) | Don't hard-code one state's law into a white-label SOP |

## Naming conventions (Praxium-neutral)

- Documents: `Party – Type – Date – Initials` (e.g., `INS-3P – LOR – 2026-07-10 – RS`).
- Case types, phases, and sections follow [`36-case-management-system-setup.md`](articles/36-case-management-system-setup.md).
- In published/client-facing text, prefer role labels: *the firm, the attorney, the case manager, the intake specialist*.

## Maintenance

When adding an article, run the term check: any single-firm nickname, product brand, real filename, or one-state statute number gets generalized per this glossary. See the de-identification approach in [`SOURCES.md`](./SOURCES.md).
