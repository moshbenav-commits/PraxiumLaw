# Training Guide — Case Manager

**PraxiumLaw role:** `staff` or `paralegal` (primary case owner)  
**Reports to:** Supervising attorney

This is the **core PI operations role** — you drive the file from intake through demand, negotiation support, and settlement prep.

---

## Purpose

Keep cases moving on the **training timeline**: treat → gather records → demand → offer → settle. You coach clients, maintain the Meds ledger, chase records, and prepare attorney-ready packages. You do **not** send demands, set reduction percentages, or approve disbursements without attorney gate.

---

## Phase responsibilities

| Phase | You own |
|-------|---------|
| **Intake** | Handoff from intake specialist; verify Needs List complete |
| **Treating** | Appointments, gap prevention, MRI timing, monthly visits during demand |
| **Record gathering** | Medical LOR, lien verification, COR, prior records (5 yr) |
| **Demand** | Yellow-sheet package assembly — **attorney approves send** |
| **Waiting / Counter** | Track 30-day response; log offers; supplement when new bills |
| **Settlement** | Populate calculator from Meds — **attorney sets reductions** |
| **Litigate / Drop** | Transfer letters — attorney decision |

Full timeline: [`../system-spec.md`](../system-spec.md) · Phase diagram in spec §10.

---

## Weekly rhythm

| Cadence | Action |
|---------|--------|
| **Daily** | Client touch (text/call per firm cadence) — [`../articles/11-client-call-cadence.md`](../articles/11-client-call-cadence.md) |
| **3-day / 7-day** | Treatment compliance check — [`../articles/16-treatment-compliance-coaching.md`](../articles/16-treatment-compliance-coaching.md) |
| **~30 days** | Case review + MRI push — [`../articles/07-thirty-day-case-review.md`](../articles/07-thirty-day-case-review.md) |
| **Monthly** | Doctor visit while demand pending; update Meds tab |
| **Ongoing** | Lien balance verification (not full records every month) |

---

## Meds tab (your daily workspace)

Every provider: specialty, LTD/NTD, balance, lien holder, futures estimate (FE), your initials, **COR status** when done treating.

**Medical document types:** MR (records) · B (bills) · FE (futures estimate) · COR (certificate) — full reference: [`../articles/24-medical-documents-reference.md`](../articles/24-medical-documents-reference.md)

- [`../articles/08-meds-tab-and-record-hygiene.md`](../articles/08-meds-tab-and-record-hygiene.md)  
- [`../articles/12-chiro-follow-up-color-codes.md`](../articles/12-chiro-follow-up-color-codes.md)  
- [`../articles/20-certificate-of-records.md`](../articles/20-certificate-of-records.md)  
- [`../articles/21-medical-lor-workflow.md`](../articles/21-medical-lor-workflow.md)  

**Alerts to escalate to attorney:** no-show · no MRI by ~8 weeks · treatment gap · client wants to stop · spend approaching policy limits.

---

## Insurance & PD (you track — attorney on limits)

- 3P LOR + acknowledgment follow-up (~5 days)  
- Liability acceptance letter when oral OK (~30 days)  
- Policy limits + claimant count — [`../articles/15-policy-limits-and-claimants.md`](../articles/15-policy-limits-and-claimants.md)  
- PD module: rental, estimates, total loss — [`../articles/03-property-damage-liability-timing.md`](../articles/03-property-damage-liability-timing.md)  

---

## Demand & settlement (prepare only)

| Step | Who |
|------|-----|
| Reconcile Meds, exhibits, chronology | Case manager |
| Draft demand per yellow-sheet order | Case manager |
| **Review and approve send** | **Attorney** |
| Log offers, run settlement scenarios | Case manager enters balances |
| **Reduction % or flat amounts** | **Attorney** |
| Disbursement / trust checklist | Billing + attorney sign-off |

- [`../articles/09-demand-prep-checklist.md`](../articles/09-demand-prep-checklist.md)  
- [`../articles/10-settlement-calculator-scenarios.md`](../articles/10-settlement-calculator-scenarios.md)  

---

## Case audit (“cleaner fish”)

Periodic file audit against timeline checklist: police report, lien, liability, MRI, limits, med totals, subro, PD, client contact. Flag gaps before they become malpractice or low offers.

---

## PraxiumLaw — wired today

| Action | Where |
|--------|-------|
| Matter hub | `/matters/:id` — Overview, **Pipeline**, **Intake**, **Insurance**, **PD**, **Medical**, **Demand**, **Settlement**, Documents, Tasks |
| Tasks + calendar | `/tasks`, `/calendar` (SOL) |
| PI phase + case audit hints | Matter → **Pipeline** tab |
| Property damage track | Matter → **PD** tab |
| Demand package + attorney gate | Matter → **Demand** tab |
| Settlement offers + scenarios | Matter → **Settlement** tab |
| Documents + taxonomy + redaction | Matter → **Documents** tab |
| PI matters kanban by phase | `/matters` → **PI phases** view |
| Treatments / Meds ledger | Matter → **Medical** tab |
| Providers | `/medconnect` |
| AI case help | CoCounsel chat (matter context) |
| Client portal msgs | Matter → Client msgs |

---

## Not wired yet

- PI **case audit dashboard** (firm-wide rollup — per-matter hints on Pipeline tab)  
- Firm-wide **dashboard** rollup of treatment alerts (matter tab is wired)  
- Client portal upload taxonomy (staff matter upload is wired)

See [`../SITE_WIRING_AUDIT.md`](../SITE_WIRING_AUDIT.md).

---

## Required reading (minimum)

All articles in [`README.md`](./README.md) index — prioritize **24** (medical docs), **08**, **21**, **20**, **01**, **05**, **07**, **09**, **11**, **16**.

---

## Common mistakes

- Sending records to carrier without **redaction** — [`../articles/19-redaction-checklist.md`](../articles/19-redaction-checklist.md)  
- Duplicate paid record requests  
- Demand before MRI / MMI / attorney review  
- Letting client skip months without treating  
- Entering settlement reductions without attorney numbers  

---

## First 30 days

1. Own 3–5 active matters with supervision  
2. Run one 30-day case review per file  
3. Maintain Meds tab daily on active treating cases  
4. Complete one demand prep packet (attorney review only)  
