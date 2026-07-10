# Training Guide — Supervising Attorney

**PraxiumLaw role:** `attorney` or `partner`  
**Platform permissions:** `matters.write`, `leads.write`, `workflows.read`, `idv.review`, `audit.read` (partner/admin)

---

## Purpose

You provide **legal judgment**, approve gated actions, and speak to clients on strategy — especially limits, settlement, and treatment stop decisions. Staff prepare; you decide on sends, reductions, and disbursements.

---

## Gates you must approve (hard rules)

| Gate | Staff prepares | You decide |
|------|----------------|------------|
| Demand send | Package + exhibits | Approve / edit / reject |
| Lien reductions | Provider list + balances | Set % or flat |
| Settlement acceptance | Scenario calculator | Authorize |
| Disbursement / trust | Checklist + ledger | Sign off |
| Drop client / assert lien | Draft letter | Approve |
| Transfer to litigation | Audit + letters | Approve |
| 1P / MedPay / UM strategy | Facts + declarations | Approve timing |

Full list: [`../product-capabilities.md`](../product-capabilities.md) §15 · [`../gaps.md`](../gaps.md) § Attorney-presence.

---

## Client contact cadence (training preference)

- When **policy limits** are known — you speak to client  
- About every **two months** on active files  
- When client wants to **stop treating** — ramifications conversation  
- **Minor's compromise** and structured settlements  

Staff handles routine coaching; you handle strategy and authority.

---

## Case review touchpoints

| When | You review |
|------|------------|
| ~30 days | MRI plan, outlier treatment — [`../articles/07-thirty-day-case-review.md`](../articles/07-thirty-day-case-review.md) |
| Pre-demand | demand worksheet complete — [`../articles/09-demand-prep-checklist.md`](../articles/09-demand-prep-checklist.md) |
| Offer received | Settlement scenarios — [`../articles/10-settlement-calculator-scenarios.md`](../articles/10-settlement-calculator-scenarios.md) |
| Limits low vs med spend | Chiro/Meds vs limits strategy |

---

## PraxiumLaw — wired today

| Action | Where |
|--------|-------|
| Matter oversight | `/matters/:id` all tabs |
| Approve team / workflows | `/settings/team`, `/settings/workflows` |
| Audit trail | `/settings/audit` |
| IDV review | `/settings/identity-review` |
| AI research assist | CoCounsel chat |
| Lead conversion | `/inbox` |

---

## Not wired yet (enforce manually)

- **Software blocks** on demand send without attorney role  
- **Software blocks** on disbursement without attorney role  
- PI phase dashboard  
- In-app approval queue for demands/settlements  

Product requirement: implement RBAC gates per [`../product-capabilities.md`](../product-capabilities.md).

---

## Required reading

- [`../system-spec.md`](../system-spec.md) — full process map  
- [`../gaps.md`](../gaps.md) — what training does not cover  
- All articles marked **attorney** in [`README.md`](./README.md)  

---

## Ethical reminders

- Do not withhold attorney involvement from providers when ethics require disclosure (jurisdiction-specific)  
- Published KB articles are **process education**, not privileged strategy  
- Review all white-label templates before firm use — [`../DISCLOSURE.md`](../DISCLOSURE.md)  
