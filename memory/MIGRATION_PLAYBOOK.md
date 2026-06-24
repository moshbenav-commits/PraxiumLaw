# Filevine → Praxium Migration Playbook
*"Switch Concierge" runbook. The script our team follows when a firm signs up to migrate.*

---

## OVERVIEW

**Goal**: Move a law firm from Filevine to Praxium with zero data loss, zero downtime, and "productive on day one."

**Timeline**: 14 days from signed agreement to full cutover. 30 days of parallel "Mirror Mode" before the firm officially cancels Filevine.

**Roles needed**:
- 1× Praxium Switch Concierge (project lead)
- 1× Migration Engineer (data parsing + import)
- 1× Onboarding Specialist (training + adoption)
- 1× firm-side contact (typically office manager or paralegal lead)

**Cost to firm**: $0. We absorb migration cost as customer acquisition.

---

## DAY -3 to DAY 0 — Pre-Migration

### Day -3: Discovery Call (60 minutes)

**Agenda**:
- [ ] Review firm's current Filevine usage (modules turned on, add-ons paid for)
- [ ] Inventory other tools (RingCentral, DocuSign, Mailchimp, ChartSwap, etc.)
- [ ] Count users, matters, contacts, documents, time entries, trust account history
- [ ] Identify custom Filevine fields and workflows
- [ ] List integrations the firm CANNOT live without
- [ ] Identify migration champion at the firm (single point of contact)
- [ ] Schedule the migration call (Day 0)

**Deliverable**: Migration plan PDF emailed within 24 hours.

### Day -2: Filevine Data Export Setup

**Action steps** (firm-side, with our guidance):
1. Filevine admin logs in → Settings → Data Export
2. Generates full firm export (matters, contacts, custom fields, activities, documents, time entries)
3. Export downloads as `.zip` of CSV files + document blobs
4. Firm uploads to our secure transfer endpoint: `https://praxiumlaw.com/migrate/upload`

**Common issues** (and our pre-built fixes):
- *Filevine export missing custom fields*: We have a separate API-based pull using their access token
- *Documents not included in CSV export*: We have a Filevine doc-pull script that runs overnight
- *Activity/notes are HTML-encoded*: Our parser handles that

### Day -1: Praxium Workspace Setup

**We do this**:
- Create firm's Praxium account with subscription tier locked
- Provision firm slug: e.g., `chen-law-group.praxiumlaw.com`
- Set up per-firm patient ID prefix
- Set up Praxium intake form URL: `praxiumlaw.com/intake/chen-law-group`
- Generate user accounts for each attorney/staff (pre-loaded, not yet activated)
- Apply matching practice-area packs (PI / Family / Criminal / etc.)

**Firm-side action**:
- Email everyone: "Praxium is coming on [date]. Don't worry — you'll keep Filevine access for 30 more days. Watch for a training invite."

---

## DAY 0 — Migration Day

### Hour 0–2: Data Import
- Engineer runs parser scripts against Filevine export
- Maps Filevine fields → Praxium schema (we have a tested mapping table)
- Imports matters (with case_numbers preserved if possible)
- Imports contacts (auto-generates patient IDs for clients)
- Imports custom fields as Praxium custom_fields
- Imports activities with original timestamps
- Imports notes (preserves author + timestamp)
- Imports tasks (open + completed for history)
- Imports time entries
- Imports documents (uploads to Emergent storage, links to matters)
- Imports trust account ledger entries

### Hour 2–3: Validation
- **Engineer runs validation report**:
  - Total Filevine matters: X — Total Praxium matters: X ✓
  - Total contacts: X = X ✓
  - Total documents: X = X ✓
  - Custom fields preserved: X/X ✓
  - Failed imports flagged for manual review (typically <0.1%)
- **Switch Concierge reviews flagged items** with firm contact (15 min)
- Decisions: import-as-is, fix, or skip + log

### Hour 3–5: Configuration
- Apply firm's letterhead + logo to DocGen templates
- Configure intake form fields (mirror Filevine intake)
- Set up team roles (Admin / Attorney / Paralegal / Staff)
- Configure email signatures
- Set timezone, working hours, calendar defaults
- Connect Stripe (test mode → live when ready)
- Configure billing rates per attorney

### Hour 5–6: Pre-Launch Test
- Switch Concierge logs in as each user role
- Opens 3 random migrated matters → verifies everything looks right
- Tests CoCounsel AI on a real matter (confirms it has context)
- Tests document upload + download
- Tests creating a task, note, time entry

### Hour 6–8: Mirror Mode Setup
- Configure nightly sync: Filevine → Praxium (read-only delta sync)
- For the next 30 days, anything new in Filevine auto-flows to Praxium
- This allows the firm to test confidently without fearing data loss

### Hour 8: Day-1 Kickoff Email
- We send a beautiful onboarding email to the firm:
  - "Praxium is live for [Firm Name]."
  - 5-minute getting-started video (firm-specific, using their actual data)
  - Direct line to Switch Concierge
  - First-week training schedule

---

## DAY 1–7 — Adoption Sprint

### Day 1: Group Onboarding (90 minutes, all hands)
- Brief tour (15 min)
- ⌘K command palette (5 min — this gets the "wow")
- Walking through a real migrated matter (15 min)
- CoCounsel AI demo on a real case (15 min)
- Marketplace + Praxa (10 min)
- Q&A (30 min)

### Days 2–3: Role-Specific 1:1s (30 minutes each)
- **Attorney 1:1**: matter workflow, AI usage, billing
- **Paralegal 1:1**: documents, records, scheduling, MedConnect
- **Office manager 1:1**: reports, billing, team management, trust accounting
- **Admin 1:1**: settings, custom fields, workflow automation

### Days 4–7: Live Support
- Slack channel created with firm + Switch Concierge
- Same-business-day reply guarantee
- Daily 15-min check-in calls if needed

---

## DAY 7–30 — Mirror Mode Period

### What's happening
- Firm uses Praxium for new matters/tasks/notes
- Filevine remains accessible (read-only mode, ideally)
- Nightly sync runs (Filevine → Praxium) to catch any straggler updates
- Praxium audits the sync every 3 days to confirm parity

### Weekly check-ins
- Week 1: "Anything missing?" call
- Week 2: "Anything frustrating?" call
- Week 3: "Ready to cut over?" call

### Common Week-2 issues (and fixes)
| Issue | Fix |
|---|---|
| "I can't find [feature X]" | Quick screen-share, show it (90% of the time it's keyboard-shortcut driven) |
| "The custom field for [Y] isn't behaving" | We re-map and re-import (under 2 hours) |
| "Reports aren't matching" | We rebuild the report in Report Studio (or replicate via NL query) |
| "Email integration not working" | Phase 2 wire — confirm timeline + interim manual workflow |

---

## DAY 30 — Cutover & Celebration

### Final cutover
- [ ] Last data sync from Filevine (Day 29 EOD)
- [ ] Verify parity (engineer + firm contact sign off)
- [ ] Firm cancels Filevine subscription
- [ ] Issue the **last-2-months Filevine credit** ($X applied to Praxium account)
- [ ] Filevine data archive zipped and stored in firm's Praxium Knowledge Base (forever access)
- [ ] Public announcement (firm's choice): LinkedIn post, blog, internal email

### Celebration kit
We send the firm:
- 🎉 A printed canvas: "Migrated from Filevine — [Date]"
- 🥂 Bottle of champagne (or non-alcoholic equivalent) for the office
- 🎁 Praxium-branded swag (notebooks, pens, t-shirts for the team)
- ✍️ Hand-written thank-you note from Praxium founder

### Final touch: case study request
- Ask firm to record a 2-min video testimonial
- Ask for permission to use them in marketing
- 30% of switched firms agree → fuels the cold-outreach machine

---

## DAY 31+ — Ongoing Care

### Account health checklist (monthly)
- [ ] Usage > 70% of active users at least weekly
- [ ] AI sessions running (>5/user/week)
- [ ] Marketplace lead conversion (if Marketplace tier) > 15%
- [ ] No support tickets older than 48 hours
- [ ] NPS pulse survey (quarterly)

### Quarterly business review (QBR)
60-minute call with firm leadership:
- Usage metrics
- Time saved (calculated)
- Cost vs. previous stack (running tally)
- New features rolling out
- Roadmap input from firm

---

## MIGRATION TOOLING — what we built / what we license

### Built in-house
- **Filevine CSV parser** — handles all standard exports
- **Filevine API puller** — backup when CSV is incomplete (uses firm's API token)
- **Field mapping table** — Filevine schema ↔ Praxium schema (community-maintained)
- **Document migrator** — pulls from Filevine → uploads to Emergent storage
- **Validation report generator** — counts + parity check
- **Mirror Mode sync engine** — nightly delta sync during transition

### Licensed / 3rd-party
- **Praxium will integrate with**: Clio (API), MyCase (CSV), PracticePanther (CSV), Smokeball (DB), NextChapter (CSV), Litify (Salesforce export)

### Out-of-scope (handle manually with concierge)
- AbacusLaw (proprietary DB — case-by-case)
- ProLaw (very old; reach out separately)
- Time Matters / Worldox (legacy — quote separately)

---

## SECURITY & COMPLIANCE NOTES

- All migration data transferred via TLS 1.3 endpoints
- Documents encrypted at rest in Emergent storage
- Filevine export files purged from our servers within 30 days of cutover
- BAA available for firms requiring HIPAA-compliant migration (PI firms with medical records)
- Trust account data migration logged with audit trail; readable by state bar examiners
- All migration engineers sign NDA + complete annual security training

---

## INTERNAL METRICS

### Switch Concierge KPIs
- Average migration time: <14 days
- Data parity: >99.9%
- Day-30 cutover rate (firms who don't go back to Filevine): >95%
- Day-90 retention: >97%
- NPS at Day-30: >60

### What we count as a "successful migration"
1. All data imported with <0.1% manual review needed
2. Firm using Praxium daily by Day 7
3. CoCounsel AI used >5x by Day 14
4. Cutover happens on or before Day 30
5. Firm gives us testimonial (bonus)

---

## TEMPLATE EMAILS

### Day -1: Welcome
**Subject**: Tomorrow is migration day — here's what to expect

[Firm contact],

Tomorrow we move your firm to Praxium. Here's what to expect:

📅 **8 AM**: Our engineer kicks off the import
📅 **2 PM**: Validation report shared with you
📅 **4 PM**: Configuration call (30 min — we just confirm a few firm-specific settings)
📅 **5 PM**: Praxium is LIVE for your firm

You don't need to do anything. Just keep using Filevine as normal. Tomorrow's import is in the background.

Day-2: First training session at [time]. Calendar invite is in your inbox.

Questions overnight? Text me direct: [phone].

[Switch Concierge name]
Praxium Suite

### Day 1: "It's Live"
**Subject**: Praxium is live for [Firm Name] 🎉

[Firm contact],

We're live. Login: praxiumlaw.com  
Your firm: [Firm Name]  
Your username: [email]

Custom video walkthrough (uses YOUR actual data): [video link]

⌘K from anywhere = your new superpower.

Daily check-in calls this week at [time]. Direct line: [phone].

[Switch Concierge name]
Praxium

---

*This playbook gets updated every quarter based on what we learn from each migration. Latest version: praxium.law/switch-concierge-playbook (internal-only).*
