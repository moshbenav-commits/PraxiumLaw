# PraxHQ — the Personal Injury Helper

**PraxHQ is the personal injury helper: the customer-communication tool at the center of the client relationship.** Its core job is to **talk to the injured customer** — guide them, answer "what happens next," remind them of appointments, get them to treatment, and keep them connected to Praxium Law throughout their case. It grows from that communication core into a full PI companion that also connects the client's **doctors** and **towing/roadside vendors**, and threads into the [PI Case OS](../pi-case-os/) procedures behind the scenes.

Think of it as: **the client's phone-side helper** ↔ **the firm's direct line to the client** — one app, one relationship, from crash to close.

*"Helper" and "companion" are deliberate:* PraxHQ **guides and communicates**; it does **not** give legal advice or practice law (see guardrails below). That framing is both the product vision and the compliance line.

> **Read first:** [`LEGAL_REGULATORY_RESEARCH.md`](./LEGAL_REGULATORY_RESEARCH.md). PraxHQ operates in heavily regulated territory (legal-ethics, anti-capping, anti-kickback, HIPAA). The **compliant-by-design** rules below are not optional — they keep PraxHQ a *technology & administrative* platform, not an unlicensed practice of law or a referral-for-fee scheme.

## What PraxHQ does (compliant scope)

| For the… | PraxHQ provides |
|----------|-----------------|
| **Consumer / client** | One app to track their case status, get appointment reminders, receive directions/rides (if the firm offers them), request towing, upload documents/photos, and message the firm's team |
| **Doctors / clinics** | A connected portal to receive records requests, share updates, and coordinate appointments (under a HIPAA BAA) |
| **Towing / roadside** | A vendor app to receive and confirm tow/roadside requests |
| **Praxium Law (firm)** | A direct, logged communication channel with clients, tied to the case file in the [case-management system](../pi-case-os/articles/36-case-management-system-setup.md) |

## Compliance guardrails (the whole product depends on these)

1. **Not legal advice / not a lawyer.** PraxHQ never advises on legal rights, values claims, or negotiates. Every legal decision stays with the **licensed attorney** (mirrors the attorney gates in every SOP article). The app shows a persistent "PraxHQ is a coordination tool, not a law firm and not legal advice" disclosure with first-use acknowledgment.
2. **No steering for a fee.** PraxHQ does not pay or receive per-client or per-patient referral compensation (Nevada **NRS 7.045** capping; anti-kickback / patient-brokering). Clients self-select; providers are shown neutrally.
3. **Flat, fair-market fees only.** Revenue is **SaaS/subscription/administrative** fees to the firm and/or vendors — never a percentage of settlement or legal fees (**Rule 5.4**).
4. **Money stays in trust.** Settlement funds flow through the **attorney IOLTA trust account** and attorney-supervised [disbursement](../pi-case-os/articles/27-settlement-and-disbursement-workflow.md) — not a PraxHQ-controlled fund.
5. **HIPAA by design.** Any health data means BAAs + Security Rule controls — see [`HIPAA_COMPLIANCE.md`](./HIPAA_COMPLIANCE.md).

## Docs in this folder

| Doc | Purpose |
|-----|---------|
| [`CUSTOMER_JOURNEY.md`](./CUSTOMER_JOURNEY.md) | The client's experience, crash-to-close (the PI helper, screen by screen) |
| [`PROVIDER_PORTAL.md`](./PROVIDER_PORTAL.md) | The doctor/clinic side: free comms → scheduling → billing/records/doc-gen |
| [`PROVIDER_PORTAL_SPEC.md`](./PROVIDER_PORTAL_SPEC.md) | Provider portal **data model + tab layout** (build sketch) |
| [`SCHEDULING_MODULE.md`](./SCHEDULING_MODULE.md) | **Unified scheduler** for firm + providers (court dates, calls, appointments; calendar interop) |
| [`LIVE_SESSION_AND_ESIGN.md`](./LIVE_SESSION_AND_ESIGN.md) | **PraxHQ Live**: in-app call + document co-browse + live mobile e-sign + invite-code onboarding |
| [`INTEGRATION_MAP.md`](./INTEGRATION_MAP.md) | How PraxHQ threads into each case-lifecycle phase and SOP article |
| [`LEGAL_REGULATORY_RESEARCH.md`](./LEGAL_REGULATORY_RESEARCH.md) | Legal landscape + compliant reference architecture (**take to counsel before build**) |
| [`HIPAA_COMPLIANCE.md`](./HIPAA_COMPLIANCE.md) | HIPAA requirements for the app and integrations |

## Long-term vision (with the legal caveat)

**North star:** PraxHQ becomes *the* personal injury helper — the trusted app every injured client uses to get through their case, and the firm's direct communication channel to them. Own that relationship well and everything else follows: better treatment compliance, fewer dropped balls, happier clients, and a rich data trail.

That data is what enables the next step — using it to streamline routine work and reduce cost. That is viable **as technology and administration**. It is **not** viable as a non-lawyer entity "taking over cases" — that is UPL outside an **Arizona ABS**. The compliant version: PraxHQ automates communication and logistics so attorneys spend time only where legal judgment is required, while the attorney remains counsel of record. See the [research memo](./LEGAL_REGULATORY_RESEARCH.md) for the ABS option.
