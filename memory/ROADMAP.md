# PRAXIUM SUITE — Master Roadmap & Vision Document
*Last updated: June 2026*

---

## 🎯 Vision

Build the operating system for the modern law firm. Replace **Filevine + RingCentral + DocuSign + Mailchimp + ChartSwap + Slack + Zoom + Calendly + LeanLaw + IT consultants** with one all-inclusive platform that costs 70% less and ships with features the incumbents don't have.

Pair it with **Praxa**, a consumer self-help app for injured people, that triages cases and routes them either to our paying firm subscribers or a vetted partner attorney network — turning every consumer touchpoint into a revenue channel.

---

## 🏛️ Brand Architecture

```
┌─────────────────────────────────────────────────┐
│  PRAXIUM SUITE         (B2B law-firm OS)        │
│  praxiumlaw.com  +  praxiumsuite.com (owned)    │
│                                                 │
│       ↓ shared π glyph + "Prax-" Greek root     │
│                                                 │
│  PRAXA                 (B2C consumer app)       │
│  praxahq.com (owned)                            │
└─────────────────────────────────────────────────┘
```

- **Praxium** = πρᾶξις (action/practice). The platform from which the firm acts.
- **Praxa** = same root. The consumer's tool for taking pragmatic action against insurance.
- **Connection**: invisible to most. Only Greek-literate / philosophy-aware audiences notice. Insider delight.
- **Logo**: lowercase π Greek letter appears in both wordmarks.
- **GitHub repo**: `github.com/moshbenav-commits/PraxiumLaw`

---

## 🎨 Design System

| Surface | Theme | Fonts | Palette | Mood |
|---|---|---|---|---|
| **Praxium (B2B)** | Light dominant w/ dark sidebar | Cabinet Grotesk (display), IBM Plex Sans (body), Geist Mono (data) | Oxblood-orange #E85D04 + cream #F9F8F6 + charcoal #121212 | Authority, density, keyboard-first |
| **Praxa (B2C)** | Light, warm | Outfit | Sage #8A9A86 + clay #D4A373 + cream #FDFBF7 | Warmth, calm, trust, mobile-first |
| **Partner Hub** (Phase 2) | Dark premium | Cabinet Grotesk + Geist Mono | Deep navy + emerald accent | Exclusive, "you're in the network" |
| **Doctor Portal** (Phase 2) | Clinical white | IBM Plex Sans | Clean medical blue + white | Professional, no-friction |
| **Vendor Portal** (Phase 2) | Utility | IBM Plex Mono + Sans | Industrial gray + safety orange | Fast, scoped, transactional |

---

## 💰 Pricing Tiers (Locked)

| Tier | Price | Target | Includes |
|---|---|---|---|
| **Solo** | $49/u/mo | Solo practitioners | Core firm OS (matters, contacts, docs, tasks, calendar, basic AI) |
| **Starter** | $99/u/mo | Small firms (1-5 attys) | + CaseChat, NativeSign, Reports, DocGen, Intake, Client Portal, Conflict Checker |
| **Pro** | $199/u/mo | Growing firms (5-25 attys) | + CourtConnect, CourtFile, MedConnect, DocScheduler, Vendor Portal, Voice Cloning (1 voice), Client Mobile App, Smart Folders, Universal Inbox, Glass-Box AI |
| **Marketplace** ⭐ | $299/u/mo + per-lead | Lead-hungry firms | + **LawMatch lead delivery**, AI MedChron, Subrogation Engine, Settlement Comparables DB, Co-Counsel Mode, AI-learn-your-voice, voice cloning (3 voices), priority support |
| **Enterprise** | $499+/u/mo | Multi-office firms | + Multi-office, white-label client portal, dedicated CSM, custom integrations, SLA, advanced analytics, MSA module, mass tort tools, EMR integrations |

### Per-lead pricing (Marketplace tier add-on)
| Case type | Lead fee |
|---|---|
| Slip & fall / minor MVA | $50 |
| Standard PI / soft tissue | $150 |
| Catastrophic injury / wrongful death | $500 |
| Mass tort qualifier | $1,000 |

### Consumer pricing (Praxa)
- **Free**: education, journal, document locker, basic AI coach
- **Premium**: $9.99/mo — full AI insurance coach, settlement estimator, priority attorney match
- **One-time**: $99 — second-opinion document review by partner attorney

### Math story (the killer sales argument)
**15-attorney PI firm today: ~$10,150/mo across 8+ tools**  
**Same firm on Praxium Pro: $2,985/mo. Save $7,165/mo = $85,980/yr. With MORE features.**

---

## 🗓️ Phased Roadmap

---

### ✅ **PHASE 1 — MVP** *(Shipped June 2026)*
Goal: Functional firm OS replacing Filevine's core, with consumer app shell + marketplace foundation.

**Modules built (45 total — all fully working unless noted):**

#### Firm OS — Core (real backend + frontend)
1. Auth + JWT + roles (Admin / Attorney / Paralegal / Staff)
2. Multi-tenant firm scoping
3. Matters w/ Kanban pipeline (7 statuses) + custom fields + auto case numbers
4. Practice-area templates (PI, Family, Criminal, Bankruptcy, Immigration, Estate, etc.)
5. Contacts w/ 8 types + auto patient-ID generation for clients
6. Documents (multipart upload, folders, version, in-matter)
7. Tasks w/ priority + due dates + status toggle
8. Calendar (month view w/ tasks + SOL dates)
9. Notes (per-matter, rich text-ready)
10. Activity timeline (auto-logged)
11. CaseChat (per-matter team channels + #general)
12. CaseMail (internal email scaffold)
13. NativeSign UI (e-signature flow)
14. Report Studio (pipeline distribution + KPIs)
15. DocGen scaffolding (Phase 2 full)
16. Intake Hub (public form → AI-scored lead → claim → convert)
17. **CoCounsel AI Sidebar** (Claude Sonnet 4.5 streaming + per-matter context + ⌘J)
18. CourtConnect UI (PACER pull — mocked)
19. CourtFile UI (filing prep + tracker — mocked submission)
20. MedConnect (provider directory + treatment tracking)
21. Patient-ID code system (auto-generated, included in intake)
22. Magic-link upload tokens (for doctor offices)
23. Client Portal scaffold
24. **MyCase Companion (PWA mobile)** scaffold
25. Medical appointment hub UI
26. Uber Health UI (mocked)
27. Tow/Body Shop Vendor Portal UI
28. Firm Dashboard w/ metrics strip + pipeline
29. **⌘K Command Palette** (global search across matters, contacts, notes + quick actions)
30. BillingDesk scaffold (Stripe test key in env)
31. TimeKeeper scaffold (manual entries)
32. Conflict Checker scaffold
33. Knowledge Base scaffold
34. Lead Source Attribution (compliant version)
35. Universal Inbox (leads + chat + email + SMS feed)
36. Response SLA Engine scaffold
37. Smart Folders concept
38. Glass-Box AI (transparency layer foundation)
39. Settings (firm info, team, logout)

#### Praxa Consumer App
40. PraxaLanding (warm earthy "Be accurate. Not strong." hero)
41. PraxaSignup (separate auth + token)
42. PraxaApp (4-tab mobile-first PWA: Home / Journal / Coach / Doctors)
43. **Symptom Journal** (1-10 pain log + notes + entries history)
44. **Insurance Coach AI** (separate Claude streaming session + UPL-safe system prompt + "talk to a licensed attorney" footer)
45. Doctor Network listings w/ LOP markers

#### Hidden infrastructure
- Public intake form per firm slug (`/intake/<firm-slug>`)
- AI lead scoring (keyword-weighted; Phase 2 = real LLM)
- Lead claim/convert workflow → auto-creates contact + matter
- Global search API
- Dashboard aggregates API
- Activity auto-logging
- Glass-Box AI session persistence

#### MOCKED in Phase 1 (UI works, labeled "MOCKED")
- VoxLine telephony
- TextLine SMS send/receive
- MailEngine bulk external email
- SendGrid Inbound for MedConnect aliases
- MeetRoom video
- eFax
- CourtListener PACER reads
- InfoTrack/Tyler e-filing submission
- Uber Health API
- ElevenLabs voice cloning
- State bar verification

#### Test results
- Backend: **100% (28/28 pytest)** — auth, all CRUD, AI streaming both surfaces
- Frontend: **85%** (Playwright selector edge; not real app bugs)

---

### 🚧 **PHASE 2 — Activate External Comms + Marketplace Live**

Goal: Wire the real third-party integrations behind the Phase-1 UI. Activate the marketplace and start booking revenue.

**Modules**:
- 🟢 **TextLine** — Twilio or Telnyx SMS, MMS, 2-way, drip campaigns, TCPA opt-in tracking
- 🟢 **VoxLine** — self-hosted FreeSWITCH cluster + wholesale carrier (Bandwidth.com or Telnyx) for voice. IVR, click-to-call, recording, Whisper transcription
- 🟢 **VoiceID** — ElevenLabs Professional voice cloning, personalized voicemails, mass voicemail blasts, AI receptionist, multilingual (English voice → Spanish)
- 🟢 **MailEngine** — SendGrid/Resend for transactional + bulk marketing email, segments, A/B, open tracking
- 🟢 **Inbound email parse** — SendGrid Inbound Parse on records.<firm-domain> → MedConnect aliases route to matters
- 🟢 **MeetRoom** — Daily.co or LiveKit video, screen share, AI-transcribed meetings
- 🟢 **eFax** — Telnyx Fax inbound + outbound + OCR + auto-file
- 🟢 **CourtConnect live** — real CourtListener API for federal docket pulls + daily sync
- 🟢 **Stripe live billing** with subscription tier gating (Marketplace tier = lead delivery)
- 🟢 **Switch Concierge** — Filevine / Clio / MyCase / Smokeball CSV import wizards with Mirror Mode (parallel sync during transition)
- 🟢 **Doctor Portal** full build (HIPAA-scoped per-firm patient roster, drag-drop records upload, invoice submission, in-app chat)
- 🟢 **Vendor (Tow/Body Shop) Portal** full build
- 🟢 **Workflow Builder** — Zapier-style triggers + actions canvas in-app
- 🟢 **Trust Accounting (IOLTA)** — three-way reconciliation, audit-ready reports
- 🟢 **Passive Time AI** — scans firm activity, suggests time entries at day-end
- 🟢 **Subrogation Engine** — auto-files ERISA reduction requests, lien-negotiation marketplace
- 🟢 **Settlement Comparables Database** — anonymized closed-case data feeds national settlement intelligence
- 🟢 **Insurance Carrier Intelligence** — settlement patterns per carrier per state
- 🟢 **Disbursement Automation** — settlement check → auto-allocate → auto-distribute
- 🟢 **Bates Stamping + Auto-Indexing** for documents
- 🟢 **MedChron AI** — full medical record auto-summarization
- 🟢 **Demand Package Generator** — assembles AI summary + indexed records + bills + lien chart
- 🟢 **Multi-language portal** (Spanish baseline; Vietnamese, Mandarin, Arabic)
- 🟢 **Smart Folders** — full saved-search engine
- 🟢 **Live collaborative editing** (Yjs CRDT on notes + matters)
- 🟢 **Response SLA Engine** — fully live with timer escalation
- 🟢 **Flat-Fee Profitability Engine** — true ROI tracking
- 🟢 **Review Engine** — auto-text/email post-settlement → Google review prompt
- 🟢 **Case Result Wall** — public anonymized settlements showcase, SEO-tuned
- 🟢 **Multi-tenant SaaS** infrastructure (multiple firms per instance, white-label)

**Praxa Phase 2**:
- 🟢 Premium tier billing (Stripe)
- 🟢 Settlement estimator (live data from comparables DB)
- 🟢 Direct EMR pulls via consumer FHIR (where available)
- 🟢 Document Locker w/ encrypted file storage
- 🟢 Lost wages tracker
- 🟢 Adjuster communication coach with recorded statement scripts
- 🟢 "Should I sign this?" AI clause-flagger
- 🟢 Provider booking with real network APIs

---

### 🌍 **PHASE 3 — Litigation Deep + Healthcare Integrations**

Goal: True end-to-end automation. Become the standard PI / litigation platform.

**Modules**:
- 🔴 **InfoTrack partnership** — real e-filing submission for CA + 50 states
- 🔴 **Tyler Odyssey API** — IL, TX, IN, etc.
- 🔴 **Direct PACER API** (paid per-page) for real-time federal docket
- 🔴 **EMR direct pulls** — Epic MyChart, Cerner, Athenahealth via HL7 FHIR
- 🔴 **MRO / ChartSwap / DocuVan** integrations as redundant pull sources
- 🔴 **State court rule packs** — CA, TX, NY, FL full local-rule validation
- 🔴 **AI Voice Agent** — "Records Concierge" autonomously calls clinics until records arrive
- 🔴 **Settlement Value Predictor** — ML trained on closed comparables DB
- 🔴 **Mobile native apps** (React Native iOS + Android)
- 🔴 **HIPAA-grade infrastructure hardening** + SOC2 audit
- 🔴 **Mass Tort / MDL module** — bellwether selection, common-evidence library, settlement matrix
- 🔴 **Class Action Manager** — notice administration, claim filing
- 🔴 **Discovery Manager** — interrogatories, RFAs, RFPs, privilege logs
- 🔴 **Deposition Studio** — schedule, prep AI, exhibit binder, transcript ingestion
- 🔴 **E-Discovery Lite** — upload ESI, dedupe, search, tag, produce
- 🔴 **Litigation Hold Manager** — custodian notices, preservation chain
- 🔴 **Brief Generator + Citation Checker** — AI drafts briefs, validates citations against CourtListener (anti-*Mata v. Avianca* hallucination check)
- 🔴 **Trial War Room** — live exhibit display, witness order, voir dire tracker, AI fact-checker
- 🔴 **Jury Selection Helper** — voir dire library, juror profile cards
- 🔴 **Expert Witness Directory** — firm + national marketplace
- 🔴 **Process Server Marketplace**
- 🔴 **Court Reporter Marketplace** w/ real-time transcription
- 🔴 **Accident Reconstructionist Network**
- 🔴 **Skip Tracing** (TLO/IRBSearch integration)
- 🔴 **Public Records Search** (property, criminal, SOS)
- 🔴 **Online Notary (RON)** — built-in remote online notarization
- 🔴 **Voice Biometric Client ID**
- 🔴 **Multi-Office** + white-label client portal

**Marketplace Phase 3**:
- 🔴 **PartnerHub** lite portal (free for partners receiving leads)
- 🔴 **Bar # auto-verification** per state
- 🔴 **Background check + reference check** for partner onboarding
- 🔴 **Verified Partner badges**
- 🔴 **Pro bono auto-routing** to legal aid orgs
- 🔴 **Public-defender overflow** marketplace
- 🔴 **"Second Opinion" $99 service** — partner reviews docs
- 🔴 **Document review marketplace** — $199 contract reviews
- 🔴 **Translation marketplace** — court-certified translators on demand

---

### 🚀 **PHASE 4 — Marketplace, AI Agents, Network Effects**

Goal: Platform-of-platforms. Become the underlying infrastructure of legal tech.

**Modules**:
- 🔴 **Plugin marketplace** — 3rd-party devs build on Praxium
- 🔴 **Public API + webhooks**
- 🔴 **Agentic AI**:
  - Autonomous Intake Agent (website chat → qualify → book consult)
  - Records Chase Agent (auto-calls/emails until records arrive)
  - Demand Draft Agent (assembles complete demand package autonomously)
  - Calendar Agent (schedules multi-party depositions)
- 🔴 **White-label SaaS resale** (sell Praxium to other software companies)
- 🔴 **AI Brief Generator** with firm-voice learning
- 🔴 **Witness Prep Studio** — practice depo with AI opposing counsel + video
- 🔴 **Voice-first command** — "Hey CoCounsel, status of Smith?"
- 🔴 **Apple Vision Pro / Spatial UI** — 3D document review, immersive timelines
- 🔴 **Wearables integration** (Apple Watch / Fitbit) — objective ongoing-injury data
- 🔴 **Drone footage / 360 scene photos** evidence manager
- 🔴 **Day-in-the-Life video coordinator**
- 🔴 **Damages Visualization** — animated injury/treatment/cost infographics
- 🔴 **Blockchain document timestamping** — tamper-evident evidence chain
- 🔴 **Cap Table for fee splits** across co-counsel, referrers, lien holders
- 🔴 **CLE Tracker** w/ state-specific tracking
- 🔴 **HR / Team OS** — PTO, performance reviews, payroll exports

---

## 🛡️ Compliance & Ethical Guardrails

### Hard rules baked into the platform
1. **No solicitation circumvention tooling.** ABA Model Rule 7.3 is honored. Relationship-tracking is legal; deliberate audit-evasion is not — we don't build it.
2. **State-by-state solicitation blackouts** automatically enforced (FL 30-day, NY 30-day, NJ strict lead-gen rules, TX barratry guards, CA SB 94 disclosures).
3. **UPL guardrails** on Praxa — every AI response includes "For specific legal advice, talk to a licensed attorney in your state."
4. **Fee-splitting model**: only flat marketing fee (Rule 7.2 safe) or proper co-counsel arrangement (Rule 1.5(e) — written client consent + reasonable total). Never % of recovery without co-counsel.
5. **TCPA compliance** on TextLine — explicit opt-in tracking, suppression lists, $500-1500/violation prevention.
6. **CAN-SPAM** auto-injected on MailEngine — unsubscribe + sender ID + physical address.
7. **HIPAA-ready** infrastructure (Phase 3 hardening) — BAAs with all subprocessors, audit logs, encrypted at rest + in transit.
8. **Three-way IOLTA reconciliation** — audit-ready trust account reporting.

### Praxa consumer disclaimers
- Clear "legal information, not legal advice" on every screen
- AI responses end with "Talk to a licensed attorney."
- Settlement estimator includes "estimate only, not guarantee" disclaimer
- ToS includes UPL protections + arbitration

---

## 🥇 Competitive Moats (Why Filevine Can't Catch Up)

| Moat | What it is | Why it's hard to copy |
|---|---|---|
| **Network Effects** | Settlement Comparables DB + Carrier Intelligence + Partner Network grow with every user | Compounds — late entrants start with empty data |
| **All-Inclusive Pricing** | $199/user gets EVERYTHING (no add-ons) | Filevine's revenue model depends on add-ons. Can't undercut without cannibalizing |
| **Native Telephony** | We own VoxLine top-to-bottom | Filevine is a SaaS-only company; would need years to become carrier-adjacent |
| **Consumer Funnel (Praxa)** | Two-sided marketplace where consumers come to US first | Filevine has no consumer surface, no brand recognition with end-users |
| **AI Glass-Box** | Every AI action is auditable | Most legal AI is black-box; we're transparent by design |
| **Implementation Speed** | 30 seconds vs 3 months | Filevine has $25k+ implementation fees built into business model |
| **Voice Cloning** | Per-attorney ElevenLabs clones for personalized client outreach | Patent-able UX combination, novel in legal-tech |
| **Migration Concierge** | Free, white-glove, with reverse-migration insurance | Switching cost is Filevine's only retention lever; we obliterate it |
| **Lock-in (good kind)** | Marketplace leads tied to subscription tier | Customers churn LESS because leaving = losing revenue stream |

---

## 📊 Business Model Math

### Year 1 (modest, single firm + early marketplace)
- 100 firms on Pro tier × $199 × 15 avg users = **$298,500/mo** = **$3.58M ARR**
- Praxa premium subs: 2,000 × $9.99 = **$240K ARR**
- Marketplace lead fees: 525 cases/mo × $400 avg = **$2.5M ARR**
- **Total Year 1 projection: ~$6.3M ARR**

### Year 3 (at scale)
- 2,000 firms × Pro tier × 15 users = **$71.6M ARR**
- 50,000 Praxa premium users × $9.99 = **$6M ARR**
- Marketplace at scale: **$30M+ ARR**
- **Year 3 projection: $100M+ ARR** (Avvo/LegalMatch/Justia category-defining revenue)

---

## 🎯 The Filevine-Killer Story (One Paragraph)

> *"Your firm pays $10,000 a month for Filevine plus seven other tools that don't talk to each other. You spent $25,000 on consultants and three months getting it set up. The AI under-delivers. The phones are RingCentral. The records take 90 days. The reports are rigid. Then we showed up. **$3,000 a month. Migration is on us. Everything's bundled. Productive on day one. Our AI is glass-box transparent. The phones, the records, the marketing, the e-sign, the marketplace — all native. Save $85,000 a year. Get features Filevine doesn't have. And when you have leads you can't take, our marketplace gives them to vetted attorneys who pay you for the handoff."*** That's the pitch.

---

## 📞 Domain Portfolio (Owned)

✅ `praxiumlaw.com` — Primary B2B  
✅ `praxiumsuite.com` — Defensive / product line  
✅ `praxahq.com` — Primary B2C  

Future defensive grabs (Phase 2 budget):
- `getpraxium.com`, `usepraxium.com`, `praxiumapp.com`
- `praxa.app` (if it drops), `praxa.health`, `praxa.law`
- `praxium.com` (if priced reasonably)

---

## 🤝 Decisions Locked

- ✅ Parent brand: **Praxium** (use "Praxium Suite" for the product offering)
- ✅ Primary domain: **praxiumlaw.com**
- ✅ Consumer brand: **Praxa** at **praxahq.com**
- ✅ Hidden connection: shared "Prax-" root + Greek π glyph in both logos
- ✅ Auth: JWT custom (Phase 1) — OAuth + SSO Phase 2
- ✅ AI model: Claude Sonnet 4.5 via Emergent Universal Key
- ✅ Telephony path: **B** — self-hosted FreeSWITCH + wholesale carrier (Phase 2 activation)
- ✅ Voice cloning: ElevenLabs Professional (Phase 2 activation)
- ✅ Stripe test mode pre-loaded for billing dev
- ✅ Object storage: Emergent (Phase 1 = base64 in Mongo, Phase 2 swap)
- ✅ Design: Light dominant w/ dark sidebar for B2B (oxblood-orange accent); warm earthy for B2C
- ✅ Pricing: $49/$99/$199/$299/$499 tiers
- ✅ Marketplace lead access GATED behind Marketplace tier subscription
- ✅ Migration: 30 days free + 90-day money-back + free Switch Concierge + we credit last 2 months of Filevine
- ✅ No under-the-table solicitation tracking (would build the compliant version only)
- ✅ Praxa consumer mode legal — info not advice, UPL guardrails baked in

---

*This document grows over time. Update as new modules ship and decisions evolve.*
