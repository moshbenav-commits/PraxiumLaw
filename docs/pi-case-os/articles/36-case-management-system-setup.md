# Case Management System Setup

**Category:** Systems
**Recommended procedure** — cross-reference against your firm's policy and jurisdiction before use.
**White-label:** Any firm / any case-management platform. See [`../DISCLOSURE.md`](../DISCLOSURE.md).
**References:** [`../REFERENCES.md`](../REFERENCES.md)

---

## Purpose

A repeatable configuration for a PI case-management system so every matter is structured the same way and documents/automation work. Written platform-neutrally — apply it to whatever system your firm uses.

## Project / matter types

Set up distinct case types so fields and automation match the work, e.g.: **Auto PI (pre-lit)**, **Litigation**, **Premises/Slip-and-Fall**, **Minor's Compromise**, **Mass Tort**, and **Workers' Comp** if you handle it. Each type carries its own phase list and required fields.

## Phases (pipeline)

Model the lifecycle as phases so status is visible and reporting works: **Intake → Treatment → Demand Prep → Demand/Negotiation → Litigation (if needed) → Settlement → Disbursement → Reconciliation → Closed.** Each phase should have entry criteria and the tasks that must complete before advancing.

## Core sections / tabs

Standardize where information lives: Intake, Insurance (1P/3P), Medical Providers & Bills, Liens/Subrogation, Expenses, Documents, Litigation, Settlement/Disbursement, KPIs, and Activity/Communications. Consistent structure is what makes the [document taxonomy](18-document-taxonomy.md) and demand/disbursement automation reliable.

## Document automation (templates)

- Build merge templates for the repeat documents: LORs, records/bills requests, preservation letters, demand, reduction/disbursement letters, drop/lien letters, and court forms.
- Map each template's merge fields to the case fields above so a complete file generates a near-final document. **Every generated document is edited and attorney-reviewed before send** — automation drafts, it does not approve.

## Data hygiene & permissions

- Required fields per phase prevent advancing an incomplete file.
- Role-based permissions gate sensitive actions (demand send, reductions, trust disbursement) to the right roles — see the attorney gates throughout these articles.
- Keep client trust/financial records to your jurisdiction's retention standard (commonly ≥5 years post-representation; verify).

## Attorney gate

Template language, fee/trust fields, and any automation that produces client- or court-facing documents must be **attorney-approved** and localized to your jurisdiction before use.
