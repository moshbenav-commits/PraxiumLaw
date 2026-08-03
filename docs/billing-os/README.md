# PraxiumLaw Billing OS — Billing-Department Automation

Automates the injury firm's **billing department**: every medical bill, lien, subrogation claim, reduction, fee, cost, and disbursement — captured once, reconciled continuously, negotiated systematically, and paid out through attorney-gated workflows. The manual SOPs it automates already exist as articles [25](../pi-case-os/articles/25-disbursement-sheet-preparation.md)–[29](../pi-case-os/articles/29-health-insurance-subrogation.md), [45](../pi-case-os/articles/45-trust-accounting-and-reconciliation.md), [48](../pi-case-os/articles/48-medicare-set-aside-and-future-medicals.md), [53](../pi-case-os/articles/53-non-medical-liens-and-claims.md) — Billing OS is those procedures as software.

**Status:** spec only. See [`AUTOMATION_SPEC.md`](./AUTOMATION_SPEC.md).

## What it replaces

The typical billing department's manual work: keying bills off PDFs, chasing balance confirmations by phone/fax, maintaining lien spreadsheets, drafting reduction letters one at a time, building disbursement sheets in Excel, and reconciling trust by hand. Each of those becomes an automated flow with a human/attorney gate only where judgment or ethics requires one.

## Hard rules (non-negotiable)

- **Trust money is sacred.** Nothing moves in or out of IOLTA without attorney approval; the system prepares, records, and reconciles — a human authorizes. Three-way reconciliation (bank / ledger / per-client) runs continuously, not monthly ([45](../pi-case-os/articles/45-trust-accounting-and-reconciliation.md)).
- **Attorney gates** on: reduction offers, lien settlements, disbursement sheet approval, any client payout ([product rules](../pi-case-os/README.md#product-rules)).
- **No balance is "final" until verified in writing** from the provider/lienholder — automation chases the writing; it never assumes.
- Medicare/Medicaid/ERISA obligations are compliance-critical paths, not optional integrations ([29](../pi-case-os/articles/29-health-insurance-subrogation.md), [48](../pi-case-os/articles/48-medicare-set-aside-and-future-medicals.md)).
