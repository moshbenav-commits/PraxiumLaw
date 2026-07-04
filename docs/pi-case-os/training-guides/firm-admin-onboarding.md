# Training Guide — Firm Admin / Office Manager

**PraxiumLaw role:** `admin` or `partner`  
**Platform permissions:** Full settings, team.manage, workflows.manage, audit.read

---

## Purpose

You **stand up the firm** on PraxiumLaw, invite staff with correct roles, enable workflows, and ensure training/disclosure requirements are met before live client use.

---

## Firm setup checklist

### 1. Account & team

- [ ] Sign up at `/signup` — creates firm + admin user  
- [ ] Invite team at `/settings/team` with correct roles:

| PI position | PraxiumLaw role |
|-------------|-----------------|
| Managing partner | `partner` |
| Attorney | `attorney` |
| Paralegal / senior CM | `paralegal` |
| Case manager / intake / clerical / VA | `staff` |
| Accounting | `billing` |
| IT / office manager | `admin` |

- [ ] Confirm MongoDB / production env per workspace [`docs/PRAXIUM_DEPLOY.md`](../../../../docs/PRAXIUM_DEPLOY.md)

### 2. Firm profile (manual until template engine ships)

- [ ] Firm name, address, phone, jurisdictions  
- [ ] Attorney roster for letterhead  
- [ ] Fee default (contingency %) — attorney policy  
- [ ] Replace `{{FIRM_NAME}}` placeholders in white-label templates  
- [ ] **Counsel review** all templates before use — [`../DISCLOSURE.md`](../DISCLOSURE.md)

Templates: `docs/pi-case-os/sources/docs/white-label-templates/`

### 3. Workflows

- [ ] Review `/settings/workflows`  
- [ ] Enable **intake-paralegal-tasks** (conflicts, retainer, med auth on new matter)  
- [ ] Enable **document-complaint-notify** if using pleadings folder workflow  

### 4. Client-facing surfaces

- [ ] Public intake URL: `/intake/{{firmSlug}}`  
- [ ] Client portal process documented for staff  
- [ ] NativeSign (`/esign`) for retainers  
- [ ] Magic upload links for document collection  

### 5. Training rollout

- [ ] Assign each hire their guide from [`training-guides/README.md`](./README.md)  
- [ ] **Training Center:** `/training` (role guides + 24 articles)  
- [ ] **Template library:** `/settings/templates` + intake checklist print  
- [ ] Do **not** ship raw `sources/` corpus to staff — use guides + articles only  

### 6. Security & compliance

- [ ] Rotate JWT secrets in production  
- [ ] Restrict audit log to partner/admin  
- [ ] Site lock / password gate until go-live (Vercel env)  
- [ ] Legal pages reviewed: `/terms`, `/privacy`, `/accessibility`  

---

## What PraxiumLaw has today vs PI MVP

**Full audit:** [`../SITE_WIRING_AUDIT.md`](../SITE_WIRING_AUDIT.md)

| Built | Missing for PI |
|-------|----------------|
| Matters, contacts, docs, tasks | Demand builder |
| **Matter Intake tab** (Needs List) | ~~PI phase engine~~ — **Pipeline tab** wired |
| **Matter Insurance tab** (3P/1P) | Treatment gap alerts (UX-008) |
| **Matter Medical tab** (Meds ledger) | Document taxonomy on upload |
| Portal + e-sign | Template {{FIRM_*}} merge |
| RBAC (6 roles) | Attorney approval gates |
| `/training` + template library | Related-case linker |
| 2 workflows | Billing disbursement |

**Product roadmap:** [`../PROJECT_STATUS.md`](../PROJECT_STATUS.md) Phase 1

---

## Recommended admin cadence

| Weekly | Review open leads (`/inbox`), audit sample matters |
| Monthly | Audit log spot-check, workflow effectiveness |
| Quarterly | Template + disclosure review with counsel |

---

## Required reading

1. [`../SITE_WIRING_AUDIT.md`](../SITE_WIRING_AUDIT.md)  
2. [`../PROJECT_STATUS.md`](../PROJECT_STATUS.md)  
3. [`../WHITE_LABEL.md`](../WHITE_LABEL.md)  
4. [`../DISCLOSURE.md`](../DISCLOSURE.md)  
5. [`../../BACKEND_API.md`](../../BACKEND_API.md) — integrations (webhooks, API keys)

---

## Deploy commands (reference)

```bash
cd PraxiumLaw/frontend && npm run deploy:prod
cd PraxiumLaw/backend && bash scripts/deploy-vercel.sh
npm run praxium:smoke   # from workspace root
```
