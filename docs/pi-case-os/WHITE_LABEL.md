# PraxiumLaw PI Case OS — White-Label Rules

PraxiumLaw is built so **any personal-injury law firm** can adopt the system. Default product language and templates must not lock to a single firm.

## Placeholders (use these in all shippable templates)

| Placeholder | Meaning |
|-------------|---------|
| `{{FIRM_NAME}}` | Law firm legal name |
| `{{FIRM_DBA}}` | Public brand name (if different) |
| `{{ATTORNEY_NAME}}` | Supervising attorney |
| `{{ATTORNEY_BAR}}` | Bar number + state |
| `{{CASE_MANAGER}}` | Assigned case manager |
| `{{FIRM_ADDRESS}}` | Mailing address |
| `{{FIRM_PHONE}}` | Main phone |
| `{{FIRM_FAX}}` | Fax (if used) |
| `{{FIRM_EMAIL}}` | Matter email |
| `{{TRUST_ACCOUNT}}` | Trust account language per jurisdiction |
| `{{FEE_CONTINGENT}}` | Contingent fee % (pre-lit / lit) — **firm-specific** |
| `{{JURISDICTION}}` | Primary state(s) of practice |
| `{{SOL_YEARS}}` | Statute of limitations (do not hardcode NV-only) |

## Never ship in default product copy

- Named law firms, attorneys, or staff from training sources  
- Specific phone numbers, emails, or addresses from training sources  
- historical firm brand marks or third-party case-system vendor names as required branding  
- Jurisdiction-specific statutes presented as universal law  

Raw historical files may remain under `sources/` for internal derivation only. **Anything added to the site, app, exports, or client-facing kits must be white-labeled.**

## Template packs

Letter and form types available as white-label patterns (source files under `sources/docs/…/templates/` — customize before use):

- Intake questionnaire / needs list  
- Contingency fee agreement (jurisdiction-specific counsel draft required)  
- HIPAA / authorizations  
- 1P / 3P Letter of Representation  
- Letter of Protection / provider referral  
- Medical LOR / records request / High-Tech request  
- MedPay request letters  
- Demand / counter / supplement / last-chance  
- Lien verification / short & long reduction  
- Drop letters / attorney lien notices  
- Disbursement letter / settlement calc exhibits  
- Preservation letter (commercial / rideshare)  

See [`DISCLOSURE.md`](./DISCLOSURE.md): firms **must edit** documents and have **counsel review** language before use.

## Site / app checklist (every release)

- [ ] No firm-specific names in default UI strings  
- [ ] Templates use `{{PLACEHOLDERS}}` only  
- [ ] Disclosure shown on first login and on template download  
- [ ] Acknowledgment checkbox: “I will edit documents and have counsel review language before use”  
- [ ] Jurisdiction fields required before generating SOL or lien notices  
- [ ] Attorney role required for demand send, reductions, and disbursement  
