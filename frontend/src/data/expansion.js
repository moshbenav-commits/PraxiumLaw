import { Scale, Mail, CalendarClock, Receipt, Bot } from "lucide-react";

// Wave-2 expansion content. Source of truth: docs/practice-areas/, docs/citation-os/,
// docs/praxhq/BOOKING_SYSTEM_SPEC.md, docs/billing-os/, docs/automation/.
// Honesty rule (docs/EXPANSION_GAP_REPORT.md): only "available" for shipped app features.

export const STATUS_LABEL = {
  available: "Available",
  rolling_out: "Rolling out",
  early_access: "Early access",
};

export const PRACTICE_AREA_PAGES = [
  {
    slug: "personal-injury",
    name: "Personal injury",
    icon: Scale,
    status: "available",
    tag: "The reference implementation — intake to disbursement.",
    summary:
      "The full pre-litigation PI operating system: phase pipeline, Needs List intake, 3P/1P insurance tracking, meds ledger, demand builder with attorney review queue, settlement scenarios, property damage, and document taxonomy — backed by a 54-article knowledge base and role training guides in the app.",
    capabilities: [
      "PI phase pipeline with kanban and case-audit views",
      "Needs List intake packet + conflict checks",
      "Third-party and first-party claim panels, policy limits, LORs",
      "Meds ledger with treatment-gap awareness",
      "Demand builder gated behind attorney approval",
      "Settlement calculator, reductions, disbursement prep",
      "54 knowledge articles + 8 role training guides, in-app",
    ],
    edge: "Firms onboard in minutes and staff train inside the product — the training hub is the SOP manual.",
  },
  // Additional practice-area verticals (premises liability, dog bite, workers' comp,
  // medical malpractice, product liability, mass tort, nursing home abuse, wrongful
  // death) are deferred from public marketing until other firms sign up as clients —
  // see docs/PRAXIUMLAW_BIBLE.md 2026-08-02 entry. Full copy lives in git history on
  // claude/praxium-expansion-systems (backend/practice_modules.py MODULE_CATALOG still
  // ships, inert-by-default, for the authenticated Settings > practice areas toggle).
];

export const SOLUTIONS = [
  {
    slug: "citation-os",
    name: "Citation OS",
    icon: Mail,
    status: "early_access",
    kicker: "// tickets // citations // municipal notices",
    headline: "A ticket arrives in the mail. The system takes it from there.",
    sub: "Citation OS watches the intake mailbox, extracts the citation, calendars the deadline, generates the filings your attorney approves, keeps the correspondence loop alive, and drives the fine down rung by rung.",
    flow: [
      { t: "Detect", b: "Monitored mailbox + client uploads + court-portal watch. OCR extracts citation number, violation, court, and the response deadline — every field confidence-scored and verified." },
      { t: "Engage", b: "Jurisdiction lookup, options memo, flat-fee engagement with e-sign. The attorney picks the strategy — always." },
      { t: "File", b: "The right documents for that court, generated from attorney-certified templates and submitted with proof — e-file, certified mail, or a calendared filing task." },
      { t: "Persist", b: "Every letter sets an expected-response timer. Silence triggers the next letter automatically. Court responses advance the case the moment they arrive." },
      { t: "Negotiate", b: "An ask ladder per jurisdiction — dismissal, non-moving amendment, deferral, reduction, payment plan — with a mitigation pack assembled before the first ask." },
      { t: "Resolve", b: "Client-approved disposition, compliance verified against court records, closing letter out, file archived." },
    ],
    features: [
      { t: "Deadline-proof", b: "Response dates land on the SOL-grade calendar with buffers. A matter approaching deadline with no next action pages a human — default by system inaction is not a state that can exist." },
      { t: "Attorney-gated", b: "Strategy, filings on first use, every negotiation rung, every acceptance. Automation drafts and tracks; licensed judgment decides." },
      { t: "Jurisdiction-aware", b: "Courts differ on everything — response methods, dispositions, traffic school, appearance rules. Each court is configured and verified before the pipeline runs there." },
    ],
    kpis: ["Detect-to-resolve cycle time", "Average fine reduction", "% resolved without appearance", "Deadline incidents: zero"],
    guardrail: "Selecting a plea and negotiating with a prosecutor are the practice of law. Citation OS drafts, calendars, tracks, and submits what a licensed attorney approves — it never decides the defense.",
  },
  {
    slug: "booking",
    name: "PraxHQ Booking",
    icon: CalendarClock,
    status: "early_access",
    kicker: "// scheduling // clinics + firms + clients",
    headline: "Scheduling that knows there's a case attached.",
    sub: "Medical schedulers manage one clinic's calendar. PraxHQ Booking coordinates the whole injury ecosystem — clinic, law firm, client, and transport — with the case as the organizing object.",
    flow: [
      { t: "Book", b: "Provider blocks, recurring visits, waitlists, multi-location resources — the table stakes, done properly with ICS/CalDAV and Google/Outlook/Apple sync." },
      { t: "Connect", b: "The firm requests a slot, the clinic confirms, the client sees it instantly — three calendars, one event, zero phone tag." },
      { t: "Remind", b: "A reminder ladder (confirm at 72h, remind at 24h, nudge with directions and a ride link at 2h) plus one-tap reschedule instead of a silent no-show." },
      { t: "React", b: "A missed visit isn't a blank on a calendar — it triggers client outreach, a case-manager task, and a reschedule offer automatically." },
    ],
    features: [
      { t: "Case-linked", b: "Appointments carry the matter. Treatment gaps surface on the firm dashboard in real time — the metric that decides case value." },
      { t: "Transport-aware", b: "Rides book as a linked resource with zero medical detail shared — removing the #1 no-show cause for injury clients." },
      { t: "Care-plan smart", b: "Slots offered to fit the prescribed frequency; cancellations backfill from the waitlist in minutes." },
      { t: "Live sessions", b: "Any booking can open as an in-app video session with document co-browse and e-sign — signings happen on the client's phone." },
    ],
    kpis: ["No-show rate vs. clinic baseline", "Slot fill rate", "Waitlist backfill latency", "Treatment-gap days per case"],
    guardrail: "Scheduling is a neutral efficiency tool. Minimum-necessary PHI between organizations, HIPAA BAAs throughout, and no steering or pay-for-referral mechanics — ever.",
  },
  {
    slug: "billing-os",
    name: "Billing OS",
    icon: Receipt,
    status: "early_access",
    kicker: "// bills // liens // reductions // trust",
    headline: "Your billing department, as software.",
    sub: "Every bill, lien, reduction, and disbursement — captured once into a per-case financial ledger, verified in writing, negotiated systematically, and paid out through attorney-gated workflows with continuous trust reconciliation.",
    flow: [
      { t: "Capture", b: "Bills and EOBs parse straight into the ledger. Treatment visits without bills trigger provider requests automatically — nothing is keyed twice, nothing goes missing." },
      { t: "Verify", b: "Written balance confirmations before demand and again before disbursement. Non-responses re-letter on a timer. No balance is final until it's confirmed in writing." },
      { t: "Track", b: "Every lien runs a state machine that only closes on a written release. Medicare conditional payments and final demands block disbursement until resolved." },
      { t: "Negotiate", b: "Reduction asks generated per lienholder with the legal doctrines that apply, every counter logged, portfolio-level leverage surfaced across cases — attorney approves every ask and every acceptance." },
      { t: "Disburse", b: "The disbursement sheet assembles itself from the ledger — every line linked to its verification document. Attorney approves, client e-signs, trust moves only on human authorization." },
      { t: "Reconcile", b: "Three-way trust reconciliation runs continuously, not monthly. Any unreconciled delta pages a human the same day." },
    ],
    features: [
      { t: "One ledger", b: "The damages worksheet, the demand's specials, and the disbursement sheet all read from the same append-only ledger. Change a number once, it's right everywhere." },
      { t: "Release-in-hand", b: "A paid lien without a written release stays open. The chase is automatic; the standard is absolute." },
      { t: "Trust-sacred", b: "The system prepares and records; only human signatories move money. Every movement is audit-trailed." },
    ],
    kpis: ["Billing hours per case", "Average reduction % by lienholder type", "Release-in-hand rate at closeout: 100%", "Reconciliation exceptions: zero"],
    guardrail: "Reductions, disbursements, and trust movements are attorney-gated by design. Automation does the clerical work; ethics rules keep the judgment where it belongs.",
  },
  {
    slug: "automation",
    name: "Workforce Automation",
    icon: Bot,
    status: "early_access",
    kicker: "// the va replacement math",
    headline: "The clerical layer, retired — permanently.",
    sub: "Most injury firms run on offshore virtual assistants chasing records, keying bills, and sending reminders. Praxium automates that layer role by role — measured at every step, with quality gates that keep it retired.",
    flow: [
      { t: "Instrument", b: "Two weeks of task logging establishes the baseline: volumes, error rates, cycle times, true cost per role." },
      { t: "Assist", b: "Automation drafts and prepares; your team reviews and sends. It graduates only when it beats human quality on 95%+ of volume for four straight weeks." },
      { t: "Supervise", b: "Automation executes; humans handle only the exception queue — typically one person covering what several did." },
      { t: "Retire", b: "Exceptions absorb into normal case-manager work. The role closes. A regression reopens the exception queue — never the role." },
    ],
    features: [
      { t: "Role by role", b: "Intake, records chasing, status updates, medical scheduling, bill keying, demand assembly, mailbox triage — each with its own automation map and exit criteria." },
      { t: "Judgment stays", b: "This retires clerical roles, not legal ones. Strategy, negotiation decisions, and legal advice are permanently out of scope." },
      { t: "Quality-watched", b: "Post-retirement monitoring catches silent decay — the failure mode that makes firms quietly re-hire." },
    ],
    kpis: ["VA payroll eliminated per month", "Automation vs. human error rate", "Exception-queue volume (trending down)", "Client response latency"],
    guardrail: "The ROI is stated plainly: payroll replaced versus platform subscription. Transition timelines respect contracts and applicable employment law — your counsel owns that piece; we own the automation.",
  },
];

export const getPracticeArea = (slug) => PRACTICE_AREA_PAGES.find((p) => p.slug === slug);
export const getSolution = (slug) => SOLUTIONS.find((s) => s.slug === slug);
