# Training Guide — Billing / Disbursements

**PraxiumLaw role:** `billing` or `admin`  
**Reports to:** Partner · Supervising attorney

---

## Purpose

You manage **financial hygiene** on closed and closing files: trust accounting support, fee calculation, provider payments, expense reimbursement, and disbursement checklists — under attorney approval.

---

## What you own

| Task | When |
|------|------|
| Track case expenses | Receipts in matter (Invoice/receipt taxonomy) |
| Settlement scenario data entry | Provider balances from Meds tab |
| Disbursement sheet | After attorney sets reductions |
| Fee calculation | Contingency (training cites 33⅓% — firm policy governs) |
| Trust / IOLTA coordination | Firm accounting system (may be outside PraxiumLaw) |
| Minor's compromise logistics | When applicable |
| Medicare / Medicaid repayment awareness | Flag to case manager + attorney |

---

## Attorney gates

- **Reduction percentages or flat amounts** per provider  
- **Settlement acceptance**  
- **Final disbursement authorization**  
- Lien assertions on drop  

You **never** publish net-to-client figures without attorney-entered reduction inputs — [`../articles/10-settlement-calculator-scenarios.md`](../articles/10-settlement-calculator-scenarios.md).

---

## Disbursement checklist (training)

- All providers paid or scheduled per settlement sheet  
- Attorney fee calculated per agreement  
- Expenses (police report, records fees, etc.) reimbursed  
- Client net documented  
- File ready for close  

Status-chart **Settlement / disbursement** phase in training timeline.

---

## PraxiumLaw — wired today

| Action | Where |
|--------|-------|
| View matters | `/matters` (read) |
| View contacts | `/contacts` (read) |
| View documents | `/documents` (read) |
| Team list | `/settings/team` |
| Billing API | Backend stub — **no billing UI** |

---

## Not wired yet

- Settlement calculator UI  
- Disbursement sheet module  
- Trust accounting integration  
- Expense capture workflow  
- `billing` role-specific dashboard  

Use firm’s accounting system + Meds ledger export until PI settlement module ships.

---

## Required reading

1. [`../articles/10-settlement-calculator-scenarios.md`](../articles/10-settlement-calculator-scenarios.md)  
2. [`case-manager.md`](./case-manager.md) — Settlement phase  
3. [`../system-spec.md`](../system-spec.md) §8 Settlement & disbursement  

---

## First week

1. Shadow one settlement from offer → disbursement  
2. Learn firm trust / IOLTA SOP (outside app)  
3. Practice entering provider lines from a sample Meds export  
