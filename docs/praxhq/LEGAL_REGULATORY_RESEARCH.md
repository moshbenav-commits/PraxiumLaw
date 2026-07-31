# PraxHQ — Legal & Regulatory Research (Working Memo)

**Status:** Internal research / issue-spotting. **This is not legal advice.** It is a map of the legal landscape to take to qualified counsel **before building or launching**. Every item below needs review by (a) **Nevada legal-ethics counsel** and (b) **healthcare-regulatory counsel** in each operating state. Rules change; this reflects public sources as of 2026-07-10.

---

## What PraxHQ is being asked to do (as described)

A consumer app that would: charge an initial consumer fee; connect the injured consumer to doctors; act as "case manager"; route the consumer to Praxium Law; help coordinate towing, rides, and appointments; take a portion of the eventual insurance settlement (via disbursement); and, longer term, "take over cases" and reduce reliance on attorneys.

**Bottom line up front:** the *most literal* version of this design collides with several bright-line, criminal-exposure rules. The good news: nearly every valuable function can be delivered through a **compliant structure** (technology + administrative SaaS, flat fees, neutral routing, attorney-controlled trust disbursement, and an MSO/PC split on the medical side). The sections below separate the **red lines** from the **green paths**.

---

## 1. Sharing the settlement / legal fees with a non-lawyer (Rule 5.4) — ⛔ red line

- ABA **Model Rule 5.4** prohibits a lawyer or firm from **sharing legal fees with a non-lawyer** and from non-lawyer ownership of a law practice. Nevada follows this. ([ABA Rule 5.4](https://www.americanbar.org/groups/professional_responsibility/publications/model_rules_of_professional_conduct/rule_5_4_professional_independence_of_a_lawyer/))
- **Only two states** currently allow non-lawyer ownership/fee-sharing: **Arizona** (repealed 5.4; licenses "Alternative Business Structures" — 136 as of 4/2025) and **Utah** (a shrinking regulatory sandbox that expires **2027**). ([Stanford: 5 years of AZ/UT data](https://law.stanford.edu/2025/06/02/regulatory-innovation-at-the-crossroads-five-years-of-data-on-entity-regulation-reform-in-arizona-and-utah/), [Dentons](https://www.dentons.com/en/insights/newsletters/2025/august/25/practice-tips-for-lawyers/nonlawyer-ownership-in-law-firms))
- **Implication:** PraxHQ taking a **percentage of the settlement or of the firm's fee** is a 5.4 violation in Nevada. Do not design the consumer's payment to come "part here, part to us" out of legal-fee/settlement money.
- **Green path:** If non-lawyer ownership of the *legal* business is a real goal, the only current route is an **Arizona ABS**. Otherwise, keep PraxHQ's revenue as **flat/subscription technology & administrative fees** billed to the firm and/or providers (fair-market value for real services), never a cut of recovery.

## 2. Steering accident victims to the firm for a fee — ⛔ red line in Nevada ("capping")

- Nevada **NRS 7.045** criminalizes **unlawful solicitation of legal business**. Paying a non-lawyer ("runner"/"capper") for client referrals, or steering accident victims to a particular attorney, is illegal — and a client solicited this way can **void the contingency-fee agreement for three years**. ([Nevada Lawyer: Unlawful Solicitation](https://nvbar.org/wp-content/uploads/NevadaLawyer_Sept2022_Unlawful-Solictation.pdf), [NRS 7.045](https://law.justia.com/codes/nevada/2013/chapter-7/statute-7.045))
- **Implication:** An app that funnels injured people to Praxium Law — especially for a fee, or right after a crash — is squarely in **capping** territory.
- **Green path:** PraxHQ must be a **neutral tool the client already chose**, not a paid feeder. Don't pay/receive per-client referral compensation. If the firm offers the app, it's offered **to existing/prospective clients who initiate contact**, with clear "this is not solicitation" framing and compliance with Nevada advertising rules.

## 3. Doctor ⇄ lawyer patient steering — ⛔ red line (kickbacks / patient brokering / fee-splitting)

- Paying or receiving anything of value **for patient referrals** between providers and lawyers is broadly illegal: state **medical-practice fee-splitting** bans (apply to *all* patients, not just insured), **anti-kickback** statutes, and **patient-brokering** acts (e.g., Florida's is a **felony**, $50k–$500k). Federal **AKS/Stark** attach if any federal healthcare dollars are involved. ([Is Patient Brokering a Kickback?](https://cohenhealthcarelaw.com/is-patient-brokering-fee-splitting-or-a-kickback/), [Illinois fee-splitting](https://ilchiro.org/the-fee-splitting-prohibition-in-illinois/))
- **Implication:** PraxHQ "connecting the consumer to doctors" **for a fee**, or taking a cut tied to medical volume, risks kickback/brokering liability for PraxHQ **and** the doctors and firm.
- **Green path:** Provide a **neutral directory / logistics tool**; let the patient choose. Charge providers **flat fair-market SaaS/admin fees** for using the platform — never per-patient or per-referral compensation.

## 4. "Case manager" / "take over cases" / "eliminate attorneys" — ⛔ UPL

- A non-lawyer entity giving legal advice, exercising legal judgment, or handling claims *as the representative* is **Unauthorized Practice of Law** (Rule 5.5). The **TIKD** app was found to be practicing law for forwarding clients to attorneys and managing the matter for a percentage. ([UPL app ruling](https://abovethelaw.com/2021/10/phone-app-found-to-be-engaged-in-the-unauthorized-practice-of-law/), [UPL risk mitigation](https://abovethelaw.com/2024/01/unauthorized-practice-of-law-risk-mitigation-strategies-for-legal-tech-entrepreneurs/))
- **Implication:** "PraxHQ takes over cases and reduces attorneys" is UPL unless done through an **Arizona ABS** (a licensed law entity). Non-lawyer "case management" must be **administrative/logistical only** and must not advise on legal rights, value claims, or negotiate.
- **Green path:** PraxHQ handles **scheduling, reminders, logistics, document intake, and status relay**; all legal advice, valuation, negotiation, and settlement decisions stay with the **licensed attorney** (this matches the "attorney gate" pattern already in every SOP article). Put an explicit **"PraxHQ does not provide legal advice"** disclosure and acknowledgment in the app.

## 5. The "fund that pays doctors, then releases to the customer" — ⚠️ heavily regulated

This describes some blend of **medical-lien funding**, **settlement funding**, and **escrow/disbursement** — all regulated:

- **Litigation / pre-settlement funding** is legal in most states but increasingly regulated; **Nevada requires commercial funders to register (NRS Chapter 604C)**, and a national wave of 2026 laws (NY, GA, etc.) is tightening disclosure and debating whether advances are "loans." ([Overview of litigation funding](https://iclg.com/practice-areas/lending-and-secured-finance-laws-and-regulations/21-an-overview-of-litigation-funding), [funding regulations](https://bakerstreetfunding.com/lawsuit-loans/lawsuit-funding-regulations/))
- **Champerty/maintenance** doctrines still constrain third parties taking a share of recovery in some states. ([Champerty overview](https://expresslegalfunding.com/vocabulary/champerty-and-maintenance/))
- **Holding & disbursing settlement money:** the proper vehicle is the **attorney trust account (IOLTA)** under **Model Rule 1.15**, with attorney-supervised disbursement (already our [article 27](../pi-case-os/articles/27-settlement-and-disbursement-workflow.md)). A non-lawyer app controlling a settlement "fund" raises **escrow-agent** and possibly **money-transmitter** licensing questions — though FinCEN treats transmission that is *integral to escrow* as not a standalone money-transmitter service, that is fact-specific. ([FinCEN escrow ruling](https://www.fincen.gov/resources/statutes-regulations/administrative-rulings/application-money-services-business-1), [holding settlement funds in trust](https://www.leanlaw.co/blog/the-rules-for-holding-settlement-funds-in-trust-when-there-are-third-party-medical-or-medicare-liens-a-complete-guide-for-law-firms/))
- **Green path:** Keep settlement disbursement in the **firm's trust account under attorney control**. If a funding/lien product is genuinely wanted, run it through a **separately capitalized, licensed/registered entity** (NRS 604C where applicable) with its own counsel — **not** commingled with PraxHQ's app fees or the firm's fees.

## 6. HIPAA — required if the app touches health information (see companion doc)

Connecting patients and providers almost certainly makes PraxHQ a **HIPAA Business Associate** (or handler of PHI): it must sign **BAAs** with every provider, implement the **Security Rule** (encryption in transit/at rest, access controls, audit logs, minimum-necessary), and obtain patient authorizations. OCR collected **$9.9M across 22 actions in 2024**, with BAA gaps a common factor. Details in [`HIPAA_COMPLIANCE.md`](./HIPAA_COMPLIANCE.md). ([HHS Business Associates](https://www.hhs.gov/hipaa/for-professionals/faq/business-associates/index.html), [HIPAA app compliance](https://www.paubox.com/blog/hipaa-compliance-when-using-mobile-apps-with-your-patients))

## 7. The medical side — the compliant pattern is MSO / "friendly PC"

If Praxium wants to own/operate the *medical-coordination* business without violating the **Corporate Practice of Medicine (CPOM)**, the standard structure is an **MSO** (non-clinical admin services, can be non-physician-owned) contracting with a **physician-owned PC** via a **management services agreement**, with **fair-market (often flat) fees** — percentage-of-revenue fees are risky/prohibited in some states. ([MSO-PC model](https://www.lbmc.com/blog/mso-pc-model-medical-practices/), [Non-physician's guide to MSOs](https://www.hchlawyers.com/blog/2021/october/the-non-physician-s-guide-to-management-services/))

---

## Compliant reference architecture (take this to counsel)

| Layer | Compliant form | Avoid |
|-------|----------------|-------|
| **PraxHQ revenue** | Flat/subscription **SaaS + admin fees** to firm and/or providers (fair-market) | % of settlement, % of legal fee, per-referral pay |
| **Consumer fee** | Clearly-disclosed fee for **real non-legal services** (logistics, reminders, coordination) | Fee contingent on, or disguised as, legal recovery or referral |
| **Client acquisition** | Neutral tool for clients who **self-initiate**; no steering | Feeding accident victims to the firm (NV capping) |
| **Doctor connection** | Neutral directory + logistics; patient chooses | Paying/taking value for patient referrals |
| **Legal work** | Attorney-gated (matches every SOP article) | App advising, valuing, negotiating, "taking over" |
| **Settlement money** | Firm **IOLTA trust**, attorney-supervised disbursement (art. 27) | App-controlled settlement "fund" |
| **Funding product (if any)** | Separate **licensed/registered** entity (NRS 604C), own counsel | Commingling with app/firm fees |
| **Medical business** | **MSO ↔ friendly-PC** with fair-market MSA | CPOM violation; % fees where barred |
| **Health data** | HIPAA BAAs + Security Rule | PHI handling without BAAs/safeguards |

## Open questions for counsel (checklist)

1. In which states will PraxHQ operate first? (Rules are **state-specific**; Nevada is strict on capping.)
2. Is an **Arizona ABS** worth pursuing to enable any non-lawyer ownership of the legal side?
3. Exact **consumer fee** description — what services, disclosed how, decoupled from recovery and referral?
4. Provider fees — flat SaaS only? Any structure that could be read as per-referral?
5. Trust/disbursement — confirm all settlement money stays in **attorney IOLTA**; no PraxHQ-controlled fund unless separately licensed.
6. HIPAA posture — BA vs. conduit vs. covered-entity-adjacent; BAAs; Security Rule build requirements.
7. MSO/PC structure for the medical-coordination business and the MSA fee basis.
8. Advertising/solicitation compliance for any consumer-facing acquisition.

---

*Sources are linked inline. This memo is issue-spotting for counsel, not an opinion that any structure is lawful. Do not launch any fee, referral, funding, or data flow described here without written sign-off from qualified Nevada legal-ethics and healthcare-regulatory counsel.*
