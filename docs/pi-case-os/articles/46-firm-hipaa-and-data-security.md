# Firm HIPAA & Client-Data Security

**Category:** Operations / Compliance
**Recommended procedure** — cross-reference against your firm's policy and jurisdiction before use.
**White-label:** Any firm. See [`../DISCLOSURE.md`](../DISCLOSURE.md).
**References:** [`../REFERENCES.md`](../REFERENCES.md); companion: [`../../praxhq/HIPAA_COMPLIANCE.md`](../../praxhq/HIPAA_COMPLIANCE.md)

---

## Purpose

A PI firm swims in sensitive data: medical records (PHI), SSNs, DOBs, financial and insurance details. This SOP covers how the firm handles it. **Confirm specifics with privacy counsel** — data-breach and privacy laws are state-specific and evolving.

## Know your status (get this right)

- A law firm is generally **not itself a HIPAA "covered entity."** It usually obtains medical records through a **client-signed HIPAA authorization**, not as a healthcare provider.
- The firm **can become a HIPAA Business Associate** in some arrangements (e.g., handling PHI on behalf of a provider, or via a platform like [PraxHQ](../../praxhq/README.md)). When it does, **BAAs and the Security Rule apply.**
- Independent of HIPAA, the firm **always** owes: ethical **confidentiality** (Model Rule 1.6), **technology competence** (Rule 1.1), and compliance with **state data-breach/privacy laws**.

Bottom line: treat all client health and personal data as protected, regardless of the HIPAA label.

## Handling medical records (PHI)

- Obtain a **valid, current HIPAA authorization** before requesting records; track expiration.
- **Minimum necessary** — request and share only what the matter needs.
- **Redact** before sending records to carriers or third parties ([redaction checklist](19-redaction-checklist.md)): SSN, DOB, address, Medicare/insurance IDs, VIN/plate, sensitive diagnoses.
- Route provider communications through the firm's channels and log to the file ([correspondence](34-correspondence-and-communications.md)).

## Safeguards (people, process, technology)

| Area | Practice |
|------|----------|
| **Encryption** | Encrypt sensitive data in transit and at rest; no PHI over plain email/SMS |
| **Access control** | Role-based, least-privilege; unique logins; MFA; auto-logoff |
| **Vendors** | Sign **BAAs** with any vendor touching PHI (cloud, case-management, e-sign, PraxHQ); confirm their security |
| **Devices** | Encrypted laptops/phones; remote-wipe; no client data on personal/unsecured devices |
| **Physical** | Locked files; clean-desk; shred bins |
| **Audit** | Log access to sensitive records; review |
| **Training** | Onboard staff on confidentiality + security; sanctions for violations ([firm ops](38-firm-operations-and-office-policies.md)) |

## Retention & destruction

Keep records per your ethics/retention schedule, then **destroy securely** (shred paper, wipe media). Align with [close-out & retention](40-file-closeout-reconciliation-and-retention.md) and trust-record rules ([45](45-trust-accounting-and-reconciliation.md)).

## Breach response

Have a written runbook: contain, assess scope, preserve evidence, notify per **state breach-notification law** (and HIPAA if you're a BA), and remediate. Know your state's notice deadlines **before** you need them.

## PraxHQ / platform note

If the firm uses PraxHQ or any client/provider app, health data flows are governed by BAAs + the Security Rule — see [`../../praxhq/HIPAA_COMPLIANCE.md`](../../praxhq/HIPAA_COMPLIANCE.md). Towing/rideshare vendors get **logistics only, no PHI**.

## Attorney / firm gate

Data-privacy posture, breach notification, and vendor BAAs are **firm-leadership responsibilities** requiring qualified counsel. This article is operational guidance, not legal or security-compliance advice.
