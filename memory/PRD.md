# Praxium Suite — PRD

## Original problem statement
"Can you build something as capable as Filevine?" — user then scoped extensively through multi-round Q&A:
- All-inclusive law-firm OS (Filevine + RingCentral + DocuSign + Mailchimp + ChartSwap + Slack + Calendly replacement)
- Native telephony, SMS, email, video, fax, e-sign
- Medical records hub w/ doctor portal, per-matter aliases, patient IDs, magic links, AI MedChron
- PACER pulls + filing prep
- Marketplace (LawMatch) — consumer triage → vetted partner-attorney network on subscription tiers
- Consumer self-help app (Praxa / praxahq.com) — pro-se insurance coaching, symptom journal, doctor referral network
- ElevenLabs voice cloning for personalized voicemails / AI receptionist
- 30-day free, 90-day money-back, free migration from Filevine
- Pricing $99/$199/$299/$499 tiers

## Brand architecture
- **Praxium Suite** — B2B law firm OS — `praxiumlaw.com` (primary) + `praxiumsuite.com` (defensive)
- **Praxa** — B2C consumer pro-se app — `praxahq.com`
- Hidden connection: shared "Prax-" Greek root + π glyph in both logos
- GitHub repo: https://github.com/moshbenav-commits/PraxiumLaw

## User personas
1. **Attorney / Paralegal / Staff** — operates the firm OS
2. **Firm Admin** — owner/managing attorney; setup, billing, team
3. **Client** — uses Client Portal to track their matter
4. **Praxa consumer** — injured person, may not yet have an attorney; uses Praxa for journaling, coaching, doctor network
5. **Partner attorney** — receives marketplace leads via PartnerHub (Phase 2 build)
6. **Doctor / Provider** — uses Doctor Portal to upload records (Phase 2 build)
7. **Vendor (tow / body shop)** — scoped portal access (Phase 2 build)

## Architecture
- **Backend**: FastAPI + MongoDB (motor async). JWT auth (30d). bcrypt password hashing.
- **AI**: Claude Sonnet 4.5 via Emergent Universal Key (streaming SSE).
- **Storage**: base64 in MongoDB for Phase 1 (25 MB/file limit). Emergent object storage to be wired Phase 2.
- **Frontend**: React 19 + Tailwind 3 + Shadcn + Lucide + Recharts + Sonner.
- **Fonts**: Cabinet Grotesk (display), IBM Plex Sans (body), Geist Mono (data), Outfit (Praxa consumer).
- **Routing**: react-router-dom v7 (browser router).
- **Design system**: Swiss/high-contrast for B2B (oxblood/cream/charcoal). Organic earthy for Praxa (sage/clay/cream).

## Phase 1 — Implemented (June 2026)
### Backend endpoints (`/api/*`)
- `auth/signup`, `auth/login`, `auth/me` — JWT
- `matters` CRUD + status update + pipeline counts
- `contacts` CRUD + search + patient-ID auto-generation for clients
- `tasks` CRUD + status toggle
- `notes` CRUD per matter
- `documents` upload (multipart, base64-stored) + list + download
- `activities` (auto-logged on matter create, doc upload)
- `chat/messages` post + list (per-matter + global channels)
- `ai/chat` — streaming Claude Sonnet 4.5 with per-matter context + session history
- `praxa/signup`, `praxa/journal`, `praxa/ai-coach` (consumer streaming AI w/ different system prompt + guardrails)
- `providers` (medical) CRUD, `treatments` CRUD, `medconnect/magic-link`
- `intake` (public form submission with AI lead scoring)
- `leads` list + claim + convert (lead → contact + matter)
- `filings` CRUD (CourtFile basics)
- `partners/inquiry` (partner network signup)
- `dashboard` aggregates + `search` global
- `team` list

### Frontend pages
- **Public**: Landing (with stack-comparison + pricing tiers), Login, Signup, IntakeForm (`/intake/:firmSlug`), PraxaLanding, PraxaSignup
- **Firm OS** (authenticated, Shell layout): Dashboard, Matters (kanban + list), MatterDetail (7 tabs), NewMatter, Contacts, ContactDetail, NewContact, Tasks, Calendar, Documents, Chat, MedConnect, CourtConnect, NativeSign, VoxLine, Inbox, Marketplace, Reports, Settings
- **Praxa Consumer**: PraxaApp (home / journal / AI coach / providers tabs, mobile-first)
- **Global**: Sidebar (14 nav items), TopBar (breadcrumb + ⌘K search + AI toggle + notifications), CommandPalette (⌘K with live search), CoCounselSidebar (⌘J — Claude streaming chat with per-matter context)

### Working features
- ✅ Full JWT auth with multi-tenant (firm-scoped data)
- ✅ Matters w/ Kanban pipeline (7 status columns) + custom case numbers + practice areas
- ✅ Contacts w/ auto-generated patient IDs for clients
- ✅ Tasks w/ priority + due dates + status toggle
- ✅ Notes per matter
- ✅ Documents upload (multipart) + list per matter + global
- ✅ Activity timeline auto-populated
- ✅ Per-matter team chat
- ✅ **CoCounsel AI sidebar** — real Claude Sonnet 4.5 streaming with matter context
- ✅ **Praxa AI Coach** — different streaming Claude session with insurance-coach system prompt + UPL guardrails
- ✅ Public intake form → AI-scored lead → claim → convert to matter
- ✅ Calendar month view with task + SOL date events
- ✅ Reports with pipeline bar chart + KPIs
- ✅ Global search (⌘K command palette across matters, contacts, notes)
- ✅ Landing page with Praxium-vs-stack comparison + pricing tiers
- ✅ Praxa consumer PWA with symptom journal (1-10 pain) + AI coach + doctor network
- ✅ MedConnect provider directory + treatment tracking + magic-link generation
- ✅ LawMatch marketplace lead pipeline

### Phase 1 mocked / scaffolded (UI works, real backend wired Phase 2)
- VoxLine telephony — needs Telnyx (path B self-hosted FreeSWITCH planned)
- TextLine SMS — needs Twilio/Telnyx
- MailEngine bulk email — needs SendGrid/Resend
- Inbound email parsing for MedConnect aliases — needs SendGrid Inbound
- Video meetings — needs Daily.co or LiveKit
- eFax — needs Telnyx Fax
- CourtConnect PACER pulls — needs CourtListener API token
- CourtFile real submission — needs InfoTrack partnership
- Uber Health transport — needs Uber Health API
- ElevenLabs voice cloning — Phase 2 add
- Stripe billing — test key in env, BillingDesk UI Phase 2
- EMR pulls (Epic/Cerner) — Phase 3

## Phase 2 (priority backlog)
- P0: Wire ElevenLabs voice cloning + Telnyx SMS/Voice
- P0: SendGrid inbound parse → MedConnect alias routing
- P0: Real PACER pulls via CourtListener
- P0: Stripe live billing with subscription tier gating
- P0: Switch Concierge migration importers (Clio, Filevine, MyCase CSV parsers)
- P1: Workflow builder (Zapier-style triggers/actions)
- P1: Settlement Comparables DB (network effect)
- P1: Subrogation engine
- P1: Trust accounting / IOLTA 3-way recon
- P1: Doctor Portal full build (HIPAA-scoped)
- P1: Vendor (tow/body shop) Portal
- P2: NL report builder (claude → query → chart)
- P2: Mass tort module
- P2: Co-counsel collaboration mode
- P2: Multi-language (Spanish baseline)

## Phase 3
- InfoTrack/Tyler e-filing partnerships
- EMR FHIR integrations
- Mobile native (React Native iOS/Android)
- HIPAA infrastructure hardening + SOC2
- Multi-tenant white-label

## Tech debt / known issues
- Documents stored as base64 in MongoDB (25MB cap) — migrate to Emergent object storage Phase 2
- No file preview yet; users download
- E-sign envelope flow is UI scaffolding only
- VoxLine UI shows demo state until carrier wired
- No real-time chat (poll-based currently)
- CommandPalette ⌘K detection relies on browser; some Linux distros may need adjustment

## Decision log
- **Telephony path**: B — self-hosted FreeSWITCH + wholesale carrier (Phase 2). Phase 1 mocked.
- **AI model**: Claude Sonnet 4.5 via Emergent Universal Key (locked).
- **Auth**: JWT custom (no OAuth for Phase 1).
- **Storage Phase 1**: base64 in Mongo (simple). Phase 2 swap to Emergent object storage.
- **Brand**: Praxium Suite (parent), Praxa (consumer sibling), shared π glyph & "Prax-" root.
