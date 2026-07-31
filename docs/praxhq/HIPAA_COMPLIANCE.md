# PraxHQ — HIPAA Compliance Requirements

**Status:** Requirements checklist for build. **Not legal advice** — confirm scope and controls with healthcare-privacy counsel and a HIPAA security assessor. Sources current as of 2026-07-10.

---

## Is PraxHQ in scope? Almost certainly yes

An app that **creates, receives, stores, or transmits Protected Health Information (PHI)** on behalf of a covered entity (a doctor/clinic) is a **HIPAA Business Associate (BA)**. Connecting patients to providers, syncing appointment or treatment data, or relaying records puts an app **in scope**. ([HHS — Business Associates](https://www.hhs.gov/hipaa/for-professionals/faq/business-associates/index.html), [HIPAA app compliance](https://www.paubox.com/blog/hipaa-compliance-when-using-mobile-apps-with-your-patients))

- **Provider-facing flows** (records, appointments shared *on behalf of* a clinic) → PraxHQ is a **BA**; a **BAA is required** with each provider before any PHI is exchanged.
- **Consumer-entered data** the patient inputs about themselves may fall outside BA status in that specific flow — but the moment it connects to a provider's systems, scope attaches. Treat all health data as PHI by default.
- **Sub-vendors** (cloud, analytics, messaging, support) that touch PHI each need a **downstream BAA**.

## Required controls (HIPAA Security Rule)

| Area | Requirement |
|------|-------------|
| **BAAs** | Signed BAA with every covered entity and every sub-vendor that touches PHI, **before** PHI flows |
| **Encryption** | PHI encrypted **in transit and at rest** |
| **Access control** | Unique user authentication; role-based least-privilege access; automatic logoff |
| **Audit logging** | Log access to and disclosure of PHI; retain and review |
| **Minimum necessary** | Share only the PHI needed for the task |
| **Authorization** | Patient authorizations for uses/disclosures beyond treatment/payment/operations |
| **Integrity & availability** | Backups, disaster recovery, tamper detection |
| **Breach response** | Breach-notification process and timelines |
| **Risk analysis** | Documented security risk assessment (ongoing) |
| **Workforce** | HIPAA training; sanctions policy; BA workforce agreements |

## Special considerations for PraxHQ's design

- **Towing/roadside vendors** should generally receive **no PHI** — send only logistics (location, vehicle, contact), not medical information. Segregate data so vendors see only their slice (minimum necessary).
- **Ride coordination** (e.g., third-party rideshare): avoid transmitting diagnosis/treatment; a ride to "an appointment" need not reveal the medical reason.
- **Messaging** between client and firm may include health facts — encrypt, log, and keep inside the compliant boundary; don't fan PHI out over plain SMS/email.
- **Attorney-client + firm data**: keep legal-file confidentiality and privilege controls in addition to HIPAA (see [redaction](../pi-case-os/articles/19-redaction-checklist.md) and [correspondence](../pi-case-os/articles/34-correspondence-and-communications.md) SOPs).
- **The firm as covered entity vs. hybrid**: a PI firm handling medical records may itself have HIPAA obligations via authorizations; align PraxHQ's BAAs and the firm's HIPAA authorizations.

## Why this matters

OCR collected **$9.9M across 22 enforcement actions in 2024**, with **BAA deficiencies** a recurring factor. ([HIPAA BAA guide](https://www.hipaajournal.com/hipaa-business-associate-agreement/)) Build HIPAA in from day one — retrofitting is expensive and a breach is existential for a health-adjacent startup.

## Build checklist

- [ ] Scope assessment (BA vs. conduit) with counsel, per data flow
- [ ] BAA template + execution workflow with every provider and sub-vendor
- [ ] Encryption in transit + at rest verified
- [ ] AuthN/AuthZ with unique IDs, RBAC, least privilege
- [ ] Audit logging + retention
- [ ] Minimum-necessary data segregation (esp. towing/rides get no PHI)
- [ ] Patient authorization flows in-app
- [ ] Breach-notification runbook
- [ ] Documented risk analysis + remediation plan
- [ ] Workforce HIPAA training + sanctions policy
