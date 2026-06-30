import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ArrowRight, ArrowUpRight, Check, Command, Sparkles, ChevronRight,
  Briefcase, Phone, Stethoscope, Scale, Network, MessageSquare, FileText, Users,
} from "lucide-react";
import MatterCanvasMock from "../components/showcase/MatterCanvasMock";
import CoCounselChatMock from "../components/showcase/CoCounselChatMock";
import VoxLineMock from "../components/showcase/VoxLineMock";
import MedConnectMock from "../components/showcase/MedConnectMock";
import CommandPaletteMock from "../components/showcase/CommandPaletteMock";
import MatterLifecycleTour from "../components/showcase/MatterLifecycleTour";
import ScrollReveal from "../components/landing/ScrollReveal";
import LandingMobileNav from "../components/landing/LandingMobileNav";
import SavingsCalculator from "../components/landing/SavingsCalculator";
import usePageMeta from "../components/landing/usePageMeta";
import PraxiumLogo from "../components/PraxiumLogo";
import { TIERS, LEAD_FEES } from "@/data/marketing";

// ──────────────── data ────────────────
const STACK = [
  { tool: "Filevine + add-ons (VineSign, Periscope, Lead Docket, ProjectsAI)", cost: 4500 },
  { tool: "RingCentral / VXT — phones & call recording", cost: 1200 },
  { tool: "DocuSign — e-signature", cost: 600 },
  { tool: "Mailchimp — email marketing", cost: 300 },
  { tool: "ChartSwap / MRO — medical records", cost: 800 },
  { tool: "LeanLaw / Tabs3 — billing", cost: 450 },
  { tool: "Slack + Zoom + Calendly", cost: 400 },
  { tool: "IT consultants (amortized)", cost: 1900 },
];
const STACK_TOTAL = STACK.reduce((s, x) => s + x.cost, 0);

const PILLARS = [
  {
    id: "practice",
    label: "Practice",
    title: "Run every matter from one canvas.",
    body: "Kanban pipelines. Custom fields. Practice-area packs that apply themselves. CoCounsel AI with context. ⌘K from anywhere.",
    bullets: ["Matters · Contacts · Tasks · Calendar", "Notes · Documents · Per-matter chat", "Practice-area templates: PI, Family, Criminal, Bankruptcy, Immigration"],
    icon: Briefcase,
  },
  {
    id: "comms",
    label: "Communications",
    title: "Phones, SMS, email, video — native.",
    body: "Stop paying RingCentral, DocuSign, Mailchimp, and Zoom. Bundled, branded as yours, voice-cloned with ElevenLabs, AI-transcribed by Whisper.",
    bullets: ["VoxLine — calling + IVR + recording", "TextLine — 2-way SMS + drips", "MailEngine — transactional + bulk + segments", "NativeSign — multi-signer e-sig with audit trail"],
    icon: Phone,
  },
  {
    id: "ops",
    label: "Operations",
    title: "Records, court, marketplace.",
    body: "MedConnect collects medical records in 18 days, not 90. CourtConnect pulls PACER dockets. LawMatch delivers leads. Everything routes itself.",
    bullets: ["MedConnect — provider directory + magic-link uploads + AI MedChron", "CourtConnect — PACER docket sync + filing prep", "LawMatch — marketplace leads delivered on subscription tier"],
    icon: Network,
  },
];

const STATS = [
  { value: "70%", label: "Software stack cost reduction" },
  { value: "18 days", label: "Medical records vs. 60–90 industry avg" },
  { value: "30 sec", label: "Firm onboarding vs. 90 days Filevine" },
  { value: "$0", label: "Implementation vs. $25k+ consultants" },
  { value: "45", label: "Modules included — not sold separately" },
  { value: "4.5", label: "Claude Sonnet AI built in (not 2/5 Sidebar AI)" },
];

const PRACTICE_AREAS = [
  { icon: Scale, label: "Personal injury" },
  { icon: Users, label: "Family law" },
  { icon: Briefcase, label: "Criminal defense" },
  { icon: FileText, label: "Bankruptcy" },
  { icon: Stethoscope, label: "Immigration" },
  { icon: MessageSquare, label: "Estate planning" },
];

const TESTIMONIALS = [
  { quote: "We cancelled five subscriptions in the first month. Saved $7,200 monthly. Settlement throughput up 22%.", author: "Design partner firm", role: "Personal injury · 15 attorneys" },
  { quote: "First time I've used legal software where I didn't need to call IT. The command palette alone saves me an hour a day.", author: "Senior paralegal", role: "Mid-market plaintiff firm" },
  { quote: "Our records collection went from 'phone the office twice a week' to 'records arrive Tuesday'.", author: "Office manager", role: "PI firm · 8 attorneys" },
];

const fmt = (n) => `$${n.toLocaleString()}`;

export default function Landing() {
  const [pillar, setPillar] = useState("practice");
  const [scrolled, setScrolled] = useState(false);
  usePageMeta();
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  const active = PILLARS.find((p) => p.id === pillar);

  return (
    <div className="min-h-screen bg-praxium-bg text-praxium-ink overflow-x-hidden">
      {/* ─── NAV ─── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all ${scrolled ? "bg-praxium-bg/85 backdrop-blur-xl border-b border-praxium-line" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <PraxiumLogo to="/" size="md" testId="landing-logo" />
          <nav className="hidden md:flex items-center gap-1">
            <a href="#truth" className="px-3 py-1.5 text-xs font-mono uppercase tracking-[0.15em] text-praxium-subtle hover:text-praxium-ink transition-colors">The math</a>
            <a href="#how" className="px-3 py-1.5 text-xs font-mono uppercase tracking-[0.15em] text-praxium-subtle hover:text-praxium-ink transition-colors">Product</a>
            <Link to="/pricing" className="px-3 py-1.5 text-xs font-mono uppercase tracking-[0.15em] text-praxium-subtle hover:text-praxium-ink transition-colors">Pricing</Link>
            <Link to="/praxa" className="px-3 py-1.5 text-xs font-mono uppercase tracking-[0.15em] text-praxium-subtle hover:text-praxium-ink transition-colors" data-testid="landing-praxa-link">Praxa</Link>
            <Link to="/login" className="px-3 py-1.5 text-xs font-mono uppercase tracking-[0.15em] hover:text-praxium-accent transition-colors" data-testid="landing-login">Sign in</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/signup" data-testid="landing-cta-signup" className="hidden md:inline-flex bg-praxium-ink text-white px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-[0.15em] hover:bg-praxium-accent transition-colors">
              Start free
            </Link>
            <LandingMobileNav />
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="pt-36 pb-20 lg:pb-28 px-6 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-praxium-line to-transparent" />
        <div className="absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-praxium-accent/20 to-transparent" />
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-praxium-subtle mb-8 flex items-center gap-3">
              <span className="w-8 h-px bg-praxium-accent" />
              <span>// the legal operating system // 2026</span>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-12 gap-10 lg:gap-16 items-center">
            <div className="col-span-12 lg:col-span-6">
              <ScrollReveal delay={80}>
                <h1 className="font-display font-black tracking-[-0.04em] leading-[0.88] text-[2.75rem] sm:text-6xl lg:text-7xl xl:text-[5.25rem]">
                  The operating system for the{" "}
                  <span className="text-praxium-accent italic">modern law firm.</span>
                </h1>
                <p className="mt-8 text-xl lg:text-2xl text-praxium-ink/80 max-w-xl leading-snug">
                  Replace eight tools with one. Save $86,000 a year. Get AI that actually ships your demand letter.
                </p>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Link to="/signup" data-testid="hero-cta-signup" className="group bg-praxium-accent text-white px-8 py-4 rounded-full text-sm font-mono uppercase tracking-[0.15em] hover:bg-praxium-accent-hover transition-colors flex items-center gap-3">
                    Start 30 days free <ArrowUpRight size={16} className="group-hover:rotate-45 transition-transform" />
                  </Link>
                  <a href="#truth" className="rounded-full border border-praxium-line px-6 py-4 text-sm font-mono uppercase tracking-[0.15em] text-praxium-ink hover:border-praxium-accent hover:text-praxium-accent transition-colors flex items-center gap-2">
                    See the math <ChevronRight size={14} />
                  </a>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-praxium-subtle">
                  <span className="flex items-center gap-1.5"><Check size={12} className="text-praxium-accent" /> No card required</span>
                  <span className="flex items-center gap-1.5"><Check size={12} className="text-praxium-accent" /> Free migration from Filevine</span>
                  <span className="flex items-center gap-1.5"><Check size={12} className="text-praxium-accent" /> 90-day money back</span>
                </div>
              </ScrollReveal>
            </div>
            <div className="col-span-12 lg:col-span-6">
              <ScrollReveal delay={160}>
                <div className="relative lg:pl-4">
                  <div className="absolute -inset-4 bg-gradient-to-br from-praxium-accent/8 via-transparent to-praxium-line/40 rounded-sm blur-2xl pointer-events-none" />
                  <div className="relative shadow-2xl shadow-praxium-ink/10 ring-1 ring-praxium-line/80">
                    <MatterCanvasMock />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-praxium-subtle">
                    <span>// live product · matter canvas</span>
                    <span className="hidden sm:flex items-center gap-1.5"><Command size={10} />K anywhere</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
        <div className="absolute right-6 bottom-6 text-[9px] font-mono uppercase tracking-[0.3em] text-praxium-subtle hidden lg:block">
          πραξις · praxis · action
        </div>
      </section>

      {/* ─── PROOF STRIP ─── */}
      <section className="border-y border-praxium-line bg-praxium-surface">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-praxium-subtle whitespace-nowrap shrink-0">
              // trusted by u.s. law firms in 50 states
            </div>
            <div className="flex flex-wrap gap-3">
              {PRACTICE_AREAS.map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-2 px-3 py-1.5 border border-praxium-line bg-praxium-bg text-xs font-mono text-praxium-subtle">
                  <Icon size={12} className="text-praxium-accent" strokeWidth={1.6} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── THE TRUTH (math section — our killer angle) ─── */}
      <section id="truth" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-praxium-subtle mb-6">// the truth // unrounded math</div>
            <h2 className="font-display font-black tracking-[-0.03em] leading-[0.95] text-5xl lg:text-7xl max-w-4xl">
              A 15-attorney firm pays<br />
              <span className="text-praxium-accent">$10,150/mo</span> for what we do<br />
              for <span className="text-praxium-accent">$2,985.</span>
            </h2>
            <p className="mt-8 text-lg text-praxium-ink/70 max-w-2xl">
              Filevine never shows pricing on their homepage. Most legal software companies don't. We do the opposite. Here's the unrounded math.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={100}>
          <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-px bg-praxium-line border border-praxium-line">
            <div className="lg:col-span-7 bg-praxium-surface p-8 lg:p-12">
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-praxium-subtle mb-6">// your stack today</div>
              <div className="space-y-2.5 text-sm font-mono" data-testid="truth-stack">
                {STACK.map((s) => (
                  <div key={s.tool} className="flex justify-between gap-6 py-1 border-b border-praxium-line/50">
                    <span className="text-praxium-ink/80">{s.tool}</span>
                    <span className="text-praxium-subtle tabular shrink-0">{fmt(s.cost)}/mo</span>
                  </div>
                ))}
                <div className="flex justify-between pt-4 mt-2 border-t-2 border-praxium-ink">
                  <span className="font-display font-bold text-base">Total</span>
                  <span className="font-display font-black text-base tabular">{fmt(STACK_TOTAL)}/mo</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 bg-praxium-ink text-white p-8 lg:p-12 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/50 mb-6">// with praxium suite</div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-display font-black text-7xl lg:text-8xl tabular leading-none">$2,985</span>
                </div>
                <div className="text-xs font-mono text-white/60">per month · 15 users · pro tier</div>
                <div className="mt-8 pt-8 border-t border-white/15">
                  <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/50 mb-2">// annual savings</div>
                  <div className="font-display font-black text-5xl text-praxium-accent tabular leading-none">$85,980</div>
                  <div className="text-xs font-mono text-white/60 mt-2">that's a paralegal salary</div>
                </div>
              </div>
              <Link to="/signup" className="mt-10 group flex items-center gap-2 text-sm font-mono uppercase tracking-[0.15em] hover:text-praxium-accent transition-colors">
                Calculate your savings <ArrowUpRight size={14} className="group-hover:rotate-45 transition-transform" />
              </Link>
            </div>
          </div>
          <SavingsCalculator />
          </ScrollReveal>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="bg-praxium-ink text-white py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-6">// outcomes // not promises</div>
          <h2 className="font-display font-black tracking-[-0.03em] leading-[0.95] text-5xl lg:text-7xl max-w-3xl">
            Delivering advantage<br />
            at the <span className="text-praxium-accent italic">unit-level.</span>
          </h2>
          <div className="mt-20 grid grid-cols-2 lg:grid-cols-3 gap-px bg-white/10">
            {STATS.map((s) => (
              <div key={s.label} className="bg-praxium-ink p-8 lg:p-10">
                <div className="font-display font-black text-4xl sm:text-5xl lg:text-6xl tabular text-praxium-accent leading-none">{s.value}</div>
                <div className="mt-4 text-xs text-white/60 leading-relaxed">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PILLARS (tabbed feature explainer) ─── */}
      <section id="how" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-praxium-subtle mb-6">// inside praxium suite</div>
          <h2 className="font-display font-black tracking-[-0.03em] leading-[0.95] text-5xl lg:text-7xl max-w-4xl">
            Forty-five modules.<br />
            One <span className="text-praxium-accent italic">login.</span>
          </h2>
          <div className="mt-12 flex flex-wrap gap-1 border-b border-praxium-line">
            {PILLARS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPillar(p.id)}
                data-testid={`pillar-tab-${p.id}`}
                className={`px-6 py-3 text-xs font-mono uppercase tracking-[0.15em] border-b-2 transition-all ${
                  pillar === p.id ? "border-praxium-accent text-praxium-ink" : "border-transparent text-praxium-subtle hover:text-praxium-ink"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-12 grid grid-cols-12 gap-8 animate-fade-in" key={pillar}>
            <div className="col-span-12 lg:col-span-5">
              <active.icon size={32} className="text-praxium-accent mb-6" strokeWidth={1.4} />
              <h3 className="font-display font-black text-4xl lg:text-5xl tracking-[-0.02em] leading-[0.95]">{active.title}</h3>
              <p className="mt-6 text-lg text-praxium-ink/70 leading-relaxed">{active.body}</p>
              <ul className="mt-8 space-y-2.5">
                {active.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-praxium-ink/80">
                    <Check size={14} className="text-praxium-accent mt-1 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-10 text-[10px] font-mono uppercase tracking-[0.2em] text-praxium-subtle">
                // live product · not a render
              </div>
            </div>
            <div className="col-span-12 lg:col-span-7">
              {pillar === "practice" && <MatterCanvasMock />}
              {pillar === "comms" && <VoxLineMock />}
              {pillar === "ops" && <MedConnectMock />}
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMMAND PALETTE ─── */}
      <section className="bg-praxium-surface py-32 px-6 border-y border-praxium-line">
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-12 items-center">
          <div className="col-span-12 lg:col-span-5">
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-praxium-subtle mb-6">// keyboard-first</div>
            <h2 className="font-display font-black tracking-[-0.03em] leading-[0.95] text-5xl lg:text-6xl">
              <span className="text-praxium-accent">⌘K</span> from<br />
              anywhere.
            </h2>
            <p className="mt-6 text-lg text-praxium-ink/70 max-w-md">
              Find any matter, claim any lead, draft any document, run any command — without touching the mouse. Your team will leave Filevine for this single feature.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-7">
            <CommandPaletteMock />
          </div>
        </div>
      </section>

      {/* ─── COCOUNSEL AI ─── */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-praxium-subtle mb-6">// cocounsel ai // glass-box transparency</div>
          <h2 className="font-display font-black tracking-[-0.03em] leading-[0.95] text-5xl lg:text-7xl max-w-4xl">
            The AI that<br />
            actually <span className="text-praxium-accent italic">ships work.</span>
          </h2>
          <p className="mt-8 text-lg text-praxium-ink/70 max-w-2xl">
            Filevine's Sidebar AI is rated 2 out of 5 on G2. Ours is Claude Sonnet 4.5, streaming live, with full context of every matter, and every action is auditable. Glass-box transparency — not a black box hallucinating case citations.
          </p>

          <div className="mt-16 grid grid-cols-12 gap-12 items-start">
            <div className="col-span-12 lg:col-span-7">
              <CoCounselChatMock />
            </div>
            <div className="col-span-12 lg:col-span-5 space-y-8 lg:pt-10">
              {[
                { icon: Sparkles, t: "Per-matter context", b: "CoCounsel reads the matter, parties, documents, notes, and prior chats before responding." },
                { icon: FileText, t: "Draft & extract", b: "Demand letters, status updates, deadline extraction from court orders, MedChron summaries — generated and editable." },
                { icon: Check, t: "Auditable actions", b: "Every prompt, every response, every source is logged. Show the bar examiner if you ever need to." },
              ].map((f) => (
                <div key={f.t} className="border-l-2 border-praxium-accent pl-5">
                  <div className="flex items-center gap-2.5">
                    <f.icon size={16} className="text-praxium-accent" strokeWidth={1.6} />
                    <div className="font-display font-bold text-lg">{f.t}</div>
                  </div>
                  <p className="mt-2 text-sm text-praxium-ink/70 leading-relaxed">{f.b}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── MATTER LIFECYCLE TOUR ─── */}
      <section id="tour" className="bg-praxium-surface py-32 px-6 border-y border-praxium-line">
        <div className="max-w-7xl mx-auto">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-praxium-subtle mb-6">// the matter lifecycle // intake to disbursement</div>
          <h2 className="font-display font-black tracking-[-0.03em] leading-[0.95] text-5xl lg:text-7xl max-w-4xl">
            One matter.<br />
            Four <span className="text-praxium-accent italic">screens.</span>
          </h2>
          <p className="mt-8 text-lg text-praxium-ink/70 max-w-2xl">
            From Praxa-routed lead to signed settlement — same UI, same data, same login. Click through the lifecycle to see how a case moves through Praxium.
          </p>
          <div className="mt-16">
            <MatterLifecycleTour />
          </div>
        </div>
      </section>

      {/* ─── PRAXA CONSUMER SIDE ─── */}
      <section className="bg-praxa-bg text-praxa-ink py-32 px-6 praxa-surface border-y border-praxium-line">
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-12 items-center">
          <div className="col-span-12 lg:col-span-7">
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-praxa-sage mb-6">// praxa for consumers // your funnel</div>
            <h2 className="font-display font-black tracking-[-0.03em] leading-[0.95] text-5xl lg:text-7xl text-praxa-ink" style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600 }}>
              And then there's<br />
              <span className="text-praxa-accent italic">Praxa.</span>
            </h2>
            <p className="mt-8 text-lg text-praxa-ink/70 max-w-xl leading-relaxed">
              Praxa is the consumer app for injured people navigating insurance. We coach them. We journal their symptoms. We connect them to vetted doctors. And when their case grows beyond DIY — we route them to you. Marketplace tier subscribers receive these leads automatically.
            </p>
            <div className="mt-10 flex gap-4">
              <Link to="/praxa" className="bg-praxa-ink text-white px-6 py-3 rounded-full text-sm font-medium hover:opacity-90 transition-opacity" data-testid="landing-praxa-cta">
                See Praxa →
              </Link>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-5">
            <div className="bg-white rounded-3xl p-6 border border-praxa-line shadow-xl max-w-sm mx-auto">
              <div className="text-[10px] uppercase tracking-[0.25em] text-praxa-sage">Today</div>
              <div className="mt-2 text-xl font-semibold">How's the pain?</div>
              <div className="mt-4 grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className={`h-8 rounded ${i < 6 ? "bg-praxa-accent" : "bg-praxa-line"}`} />
                ))}
              </div>
              <div className="mt-2 text-xs text-praxa-subtle">6/10 — slight improvement</div>
              <div className="mt-5 pt-5 border-t border-praxa-line text-xs text-praxa-subtle leading-relaxed">
                "Be accurate. Not strong. Insurance loves when you say 'I'm fine'."
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-praxium-subtle mb-6">// from our design partners</div>
          <h2 className="font-display font-black tracking-[-0.03em] leading-[0.95] text-5xl lg:text-6xl max-w-3xl">
            The verdict from<br />
            our <span className="text-praxium-accent italic">design partners.</span>
          </h2>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-praxium-line border border-praxium-line">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-praxium-surface p-8 lg:p-10 flex flex-col" data-testid={`testimonial-${i}`}>
                <div className="text-praxium-accent text-3xl font-display font-black leading-none">"</div>
                <p className="mt-4 text-base lg:text-lg text-praxium-ink leading-relaxed flex-1">{t.quote}</p>
                <div className="mt-8 pt-6 border-t border-praxium-line">
                  <div className="font-display font-bold text-sm">{t.author}</div>
                  <div className="text-[11px] font-mono text-praxium-subtle uppercase tracking-wider mt-1">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs font-mono text-praxium-subtle text-center">Quotes from private-beta design partner firms · names withheld until public launch</p>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="bg-praxium-surface py-32 px-6 border-y border-praxium-line">
        <div className="max-w-7xl mx-auto">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-praxium-subtle mb-6">// pricing // no asterisks</div>
          <h2 className="font-display font-black tracking-[-0.03em] leading-[0.95] text-5xl lg:text-7xl max-w-4xl">
            All-inclusive.<br />
            <span className="text-praxium-accent italic">Not piecemeal.</span>
          </h2>
          <p className="mt-8 text-lg text-praxium-ink/70 max-w-2xl">
            Every tier includes the full platform. Upgrade unlocks more features — never more modules. No add-on fees. Ever.
          </p>
          <div className="mt-16 flex xl:grid xl:grid-cols-5 gap-4 xl:gap-px overflow-x-auto snap-x snap-mandatory pb-4 xl:pb-0 -mx-2 px-2 xl:mx-0 xl:px-0 xl:overflow-visible bg-transparent xl:bg-praxium-line xl:border xl:border-praxium-line scrollbar-thin">
            {TIERS.map((t) => (
              <div key={t.name} data-testid={`pricing-tier-${t.name.toLowerCase()}`} className={`relative shrink-0 w-[min(100%,280px)] sm:w-[260px] xl:w-auto snap-center bg-praxium-surface p-6 lg:p-8 flex flex-col min-h-[420px] ${t.popular ? "xl:scale-[1.03] xl:z-10 xl:shadow-2xl bg-praxium-ink text-white ring-2 ring-praxium-accent xl:ring-offset-2 ring-offset-praxium-surface" : "border border-praxium-line xl:border-0"}`}>
                {t.popular && <div className="absolute -top-3 left-6 px-3 py-1 bg-praxium-accent text-white text-[9px] font-mono uppercase tracking-[0.2em] rounded-full">Most Popular</div>}
                <div className={`font-display font-black text-xl ${t.popular ? "text-white" : ""}`}>{t.name}</div>
                <div className={`text-[10px] font-mono uppercase tracking-wider mt-1 ${t.popular ? "text-white/60" : "text-praxium-subtle"}`}>{t.sub}</div>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className={`text-5xl font-display font-black tabular ${t.popular ? "text-white" : ""}`}>${t.price}</span>
                  <span className={`text-[10px] font-mono ${t.popular ? "text-white/60" : "text-praxium-subtle"}`}>/u/mo</span>
                </div>
                <ul className={`mt-6 space-y-2.5 text-sm flex-1 ${t.popular ? "text-white/80" : "text-praxium-ink/80"}`}>
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={12} className="text-praxium-accent mt-1 shrink-0" />
                      <span className="leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className={`mt-8 block text-center text-xs font-mono uppercase tracking-[0.15em] py-3 rounded-full transition-colors ${t.popular ? "bg-praxium-accent text-white hover:bg-praxium-accent-hover" : "border border-praxium-line hover:border-praxium-accent hover:text-praxium-accent"}`}>
                  Start →
                </Link>
              </div>
            ))}
          </div>

          <ScrollReveal delay={120}>
            <div className="mt-16 border border-praxium-line bg-praxium-bg p-8 lg:p-10">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-praxium-subtle mb-3">// marketplace tier add-on</div>
                  <h3 className="font-display font-black text-2xl lg:text-3xl tracking-[-0.02em]">Per-lead pricing — no hidden math</h3>
                  <p className="mt-2 text-sm text-praxium-ink/70 max-w-xl">Marketplace subscribers receive LawMatch leads. You pay a flat marketing fee per qualified case — Rule 7.2 safe, never a percentage of recovery.</p>
                </div>
                <Link to="/signup" className="shrink-0 text-xs font-mono uppercase tracking-[0.15em] text-praxium-accent hover:underline">Start on Marketplace →</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-praxium-line border border-praxium-line">
                {LEAD_FEES.map((l) => (
                  <div key={l.type} className="bg-praxium-surface p-5">
                    <div className="text-xs text-praxium-ink/80 leading-snug">{l.type}</div>
                    <div className="mt-2 font-display font-black text-3xl tabular text-praxium-accent">${l.fee}</div>
                    <div className="text-[10px] font-mono text-praxium-subtle uppercase tracking-wider">per lead</div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── RISK REMOVAL ─── */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-praxium-subtle mb-6">// switching // risk-free</div>
          <h2 className="font-display font-black tracking-[-0.03em] leading-[0.95] text-5xl lg:text-7xl max-w-4xl">
            We remove every<br />
            reason <span className="text-praxium-accent italic">not to switch.</span>
          </h2>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-px bg-praxium-line border border-praxium-line">
            {[
              { t: "30 days free", b: "Full platform. No credit card." },
              { t: "Switch Concierge", b: "We do your migration from Filevine. You do nothing." },
              { t: "Mirror Mode", b: "Run both systems in parallel for 30 days. Zero data risk." },
              { t: "90-day money back", b: "Don't love it? Refund + full data export." },
            ].map((r, i) => (
              <div key={r.t} className="bg-praxium-surface p-8">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-praxium-subtle">// {String(i + 1).padStart(2, "0")}</div>
                <div className="mt-3 font-display font-black text-xl">{r.t}</div>
                <p className="mt-2 text-sm text-praxium-ink/70 leading-relaxed">{r.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="bg-praxium-ink text-white py-32 lg:py-40 px-6 relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 text-[36rem] font-display font-black text-white/[0.03] leading-none pointer-events-none">π</div>
        <div className="max-w-5xl mx-auto text-center relative">
          <ScrollReveal>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-8">// final word</div>
            <h2 className="font-display font-black tracking-[-0.04em] leading-[0.88] text-5xl sm:text-6xl lg:text-7xl xl:text-8xl">
              Start your 30 days.<br />
              <span className="text-praxium-accent italic">No card. No consultants.</span>
            </h2>
            <p className="mt-10 text-xl text-white/60 max-w-2xl mx-auto">
              Migrate from Filevine in 14 days — free. You'll save more in month one than you'll pay all year.
            </p>
            <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
              <Link to="/signup" data-testid="final-cta-signup" className="bg-praxium-accent text-white px-8 py-4 rounded-full text-sm font-mono uppercase tracking-[0.15em] hover:bg-white hover:text-praxium-ink transition-colors flex items-center gap-3 group">
                See your savings in 60 seconds <ArrowUpRight size={16} className="group-hover:rotate-45 transition-transform" />
              </Link>
              <a href="#truth" className="rounded-full border border-white/20 px-6 py-4 text-sm font-mono uppercase tracking-[0.15em] text-white/70 hover:border-praxium-accent hover:text-praxium-accent transition-colors">
                Or see the math again ↑
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-praxium-ink text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-praxium-accent flex items-center justify-center font-display font-black text-white text-sm rounded-sm">π</div>
              <span className="font-display font-black tracking-tight">PRAXIUM SUITE</span>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
              <a href="#how" className="hover:text-praxium-accent transition-colors">Features</a>
              <Link to="/pricing" className="hover:text-praxium-accent transition-colors">Pricing</Link>
              <Link to="/praxa" className="hover:text-praxium-accent transition-colors">Praxa</Link>
              <Link to="/login" className="hover:text-praxium-accent transition-colors">Sign in</Link>
              <Link to="/signup" className="hover:text-praxium-accent transition-colors">Start free</Link>
              <Link to="/terms" className="hover:text-praxium-accent transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-praxium-accent transition-colors">Privacy</Link>
              <Link to="/accessibility" className="hover:text-praxium-accent transition-colors">Accessibility</Link>
            </nav>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-[11px] font-mono text-white/40">
            <p>Built for U.S. law firms · Designed for firms switching from Filevine · Not affiliated with Filevine, Inc.</p>
            <p>© 2026 Praxium Suite · praxiumlaw.com · praxahq.com</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
