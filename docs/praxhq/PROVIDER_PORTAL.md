# PraxHQ — Provider (Doctor) Portal

The doctor/clinic side of PraxHQ. Strategy is **land free, expand into value**: give providers a **free** way to communicate with firms that use Praxium Law, then earn their business with **scheduling, billing, records, and document tools** they'll actually want to pay for. Inspired by care-coordination/scheduling platforms like **WellSky**. ([WellSky patient scheduling](https://wellsky.com/patient-scheduling-software/))

> **Compliance first (non-negotiable):** every tier below is either **free** or a **flat, fair-market SaaS fee**. PraxHQ **never** pays providers for referrals and **never** ties fees to patient volume steered to the firm — that would be a kickback/patient-brokering violation. Any tier that touches health data requires a **HIPAA BAA** and Security Rule controls. See [`LEGAL_REGULATORY_RESEARCH.md`](./LEGAL_REGULATORY_RESEARCH.md) and [`HIPAA_COMPLIANCE.md`](./HIPAA_COMPLIANCE.md).

## Tier 0 — Communicate & submit (FREE)

The wedge: a provider whose patient is represented by a Praxium Law firm can log in and work with the firm at **no cost**.

- **Log in** (provider account) and see that firm's requests for their patients.
- **Submit** records, bills, certificates of records, and futures estimates directly into the case file — replaces fax/mail. Ties to [Medical LOR workflow](../pi-case-os/articles/21-medical-lor-workflow.md), [Certificate of records](../pi-case-os/articles/20-certificate-of-records.md), [Medical documents](../pi-case-os/articles/24-medical-documents-reference.md).
- **Connect email** so correspondence threads into the file automatically ([correspondence SOP](../pi-case-os/articles/34-correspondence-and-communications.md)).
- **Message** the firm's team; see request status.

*Why free:* it removes friction for the firm and builds the provider relationship. Free also keeps this tier clean of any "payment for referrals" question. **BAA still required** — this tier handles PHI.

## Tier 1 — Scheduling (paid SaaS · the WellSky-style value)

Once providers are in, give them scheduling good enough that they say *"this is actually pretty good."* Target feature set (mirrors WellSky):

- **Drag-and-drop calendar** with **block/template scheduling** (per provider, room, resource).
- **Recurring & multi-step appointments**; **waitlist** auto-fill and rearrange on cancellation.
- **Provider + staff schedules** and timesheets; multi-site/centralized scheduling.
- **Automated reminders** (text / email / phone) to cut no-shows — which also helps the firm's [treatment-compliance](../pi-case-os/articles/16-treatment-compliance-coaching.md) goals.
- **Intake forms + e-sign + pre-visit info** capture.
- Customizable labels per specialty. ([WellSky scheduling overview](https://www.softwareadvice.com/medical/wellsky-scheduling-profile/))

**Calendar interoperability (build to open standards so it "exports into theirs"):**

- **iCalendar / ICS (RFC 5545)** export & subscribe feeds; **CalDAV** sync.
- One-click export to **Google Calendar / Outlook / Apple Calendar**.
- Import their existing calendar so they can **build the itinerary in PraxHQ and push it to their own system** (and vice-versa).
- For clinical data exchange, plan on **HL7 FHIR** so PraxHQ can interoperate with EHRs later.

## Tier 2 — Practice tools (paid SaaS · leverage what Praxium already has)

Providers "are doing billing and medical stuff and need documents" — Praxium already has document-generation and case tooling, so extend it with a few provider tabs:

- **Billing tab** — generate itemized bills/statements, track balances and lien/LOP status, produce reduction/settlement-ready ledgers. Ties to [disbursement](../pi-case-os/articles/25-disbursement-sheet-preparation.md) and [subrogation](../pi-case-os/articles/29-health-insurance-subrogation.md) on the firm side.
- **Medical/records tab** — organize records by patient/date-of-service; respond to records requests; attach certificates of records.
- **Document generator** — reuse Praxium's existing doc-gen for provider letters, LOPs, records cover sheets, billing statements (provider-branded).

*These are the "couple more tabs" that turn PraxHQ into a real practice tool for the clinic — sold as flat-fee SaaS modules.*

## Tiering & pricing (compliant model)

| Tier | For | Fee | Data |
|------|-----|-----|------|
| 0 · Communicate & submit | Any provider working with a Praxium Law firm | **Free** | PHI → **BAA required** |
| 1 · Scheduling | Clinics wanting scheduling efficiency | **Flat SaaS** (e.g., concurrent-user or per-site) | PHI → BAA + Security Rule |
| 2 · Billing / records / doc-gen | Clinics wanting practice tools | **Flat SaaS module fees** | PHI → BAA + Security Rule |

Pricing basis should be **fair-market and volume-neutral** (mirrors WellSky's concurrent-user model and the MSO fair-market-fee principle) — explicitly **not** a share of the clinic's revenue tied to firm-referred patients.

## Data segregation & security

- A provider sees **only their own patients'** requests and data (minimum necessary).
- Scheduling/billing PHI is encrypted, access-controlled, and audit-logged per [`HIPAA_COMPLIANCE.md`](./HIPAA_COMPLIANCE.md).
- Legal strategy and other clients are never exposed to providers.

## Guardrails specific to this portal (take to counsel)

1. **No referral compensation** in any direction — fees are for software, period.
2. **BAA before any PHI** flows, including the free tier.
3. **"Scheduling patients for us" stays neutral** — the tool coordinates appointments; it does not create a paid steering arrangement between the clinic and the firm.
4. Provider software fees must be **decoupled from patient/referral volume** to avoid kickback/fee-splitting exposure.
5. Confirm the model with **healthcare-regulatory counsel** (CPOM, anti-kickback, state fee-splitting) before launch.

## Where this sits

Provider portal ↔ [firm integration map](./INTEGRATION_MAP.md) ↔ [client journey](./CUSTOMER_JOURNEY.md). Together they make PraxHQ the shared surface for **client ↔ firm ↔ doctor** — the personal injury helper for everyone in the case.
