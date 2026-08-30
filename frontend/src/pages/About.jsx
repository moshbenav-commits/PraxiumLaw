import { Link } from "react-router-dom";
import { ArrowUpRight, Layers, Scale, ShieldCheck } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import ScrollReveal from "@/components/landing/ScrollReveal";
import usePageMeta from "@/components/landing/usePageMeta";

// Grounded in brand/praxium-law/SITE_DIRECTION_PACK.json (validated) — the
// same honesty[] table the homepage math section is built from. No invented
// founders, staff, or history beyond what the Direction Pack confirms.
const HONESTY = [
  {
    claim: "Replace eight tools with one",
    have: "Live gated product with matters, documents, intake, billing and AI demand-letter drafting; savings math page; Filevine migration path.",
    never: "Claim guaranteed legal outcomes, pose as a law firm, or give legal advice — Praxa is legal information, not legal advice.",
  },
  {
    claim: "Save $86,000 a year",
    have: "The published 15-attorney comparison: $10,150/mo stack vs $2,985 Praxium — assumptions shown on the math page.",
    never: "Present the savings as a guarantee for every firm size, or hide the assumptions behind the number.",
  },
];

export default function About() {
  usePageMeta({
    title: "About — Praxium Suite",
    description: "Why Praxium exists: the eight-tool tax on law firms, and the operating system built to replace it.",
  });

  return (
    <MarketingShell>
      <main className="max-w-7xl mx-auto px-6 pt-20 lg:pt-28 pb-24">
        <ScrollReveal>
          <div className="overline mb-6">// about // why praxium exists</div>
          <h1 className="font-display font-black tracking-[-0.04em] leading-[0.9] text-5xl lg:text-7xl max-w-4xl">
            We built this because firms keep paying<br />
            for <span className="text-praxium-accent italic">eight tools</span> that don't talk to each other.
          </h1>
          <p className="mt-8 text-lg lg:text-xl text-praxium-ink/70 max-w-2xl leading-relaxed">
            Filevine plus VineSign plus RingCentral plus DocuSign plus Mailchimp plus a records vendor
            plus a billing tool plus the IT consultant to hold it together. The same matter, retyped
            into six systems. Praxium is the operating system built to end that — one system of record,
            with AI grounded in the firm's own matter data.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <div className="mt-20 grid grid-cols-1 lg:grid-cols-3 gap-px bg-praxium-line border border-praxium-line">
            <div className="bg-praxium-surface p-8 lg:p-10">
              <Layers size={24} className="text-praxium-accent" strokeWidth={1.4} />
              <h2 className="mt-5 font-display font-black text-2xl">One system of record</h2>
              <p className="mt-3 text-sm text-praxium-ink/70 leading-relaxed">
                Matters, documents, intake, and billing live in one governed place — not synced across
                six subscriptions and re-keyed by hand.
              </p>
            </div>
            <div className="bg-praxium-surface p-8 lg:p-10">
              <Scale size={24} className="text-praxium-accent" strokeWidth={1.4} />
              <h2 className="mt-5 font-display font-black text-2xl">AI grounded in the matter</h2>
              <p className="mt-3 text-sm text-praxium-ink/70 leading-relaxed">
                CoCounsel drafts from the firm's own matter data — not a chatbot bolted onto a
                case-management tool with no idea what the case actually is.
              </p>
            </div>
            <div className="bg-praxium-surface p-8 lg:p-10">
              <ShieldCheck size={24} className="text-praxium-accent" strokeWidth={1.4} />
              <h2 className="mt-5 font-display font-black text-2xl">The switch is de-risked</h2>
              <p className="mt-3 text-sm text-praxium-ink/70 leading-relaxed">
                Free migration from Filevine, a 90-day money-back guarantee, and 30 days to try it
                before a card is ever charged.
              </p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={120}>
          <div className="mt-20">
            <div className="overline mb-6">// what we'll say, and what we won't</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-praxium-line border border-praxium-line">
              {HONESTY.map((h) => (
                <div key={h.claim} className="bg-praxium-surface p-8">
                  <div className="font-display font-black text-lg">{h.claim}</div>
                  <p className="mt-3 text-sm text-praxium-ink/80 leading-relaxed">
                    <span className="text-praxium-accent-text font-mono text-[10px] uppercase tracking-wider">What's true today — </span>
                    {h.have}
                  </p>
                  <p className="mt-3 text-sm text-praxium-ink/60 leading-relaxed">
                    <span className="font-mono text-[10px] uppercase tracking-wider">What we won't say — </span>
                    {h.never}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={160}>
          <div className="mt-20 praxa-surface border border-praxium-line bg-praxa-bg p-8 lg:p-10">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#5E6C5A] mb-3">// and praxa</div>
            <p className="text-praxa-ink/80 max-w-2xl leading-relaxed">
              Praxa is the consumer side of what we build — a free app that coaches injured people
              through the insurance process and routes cases that need an attorney into Praxium firms.
              Praxa provides legal information, not legal advice.
            </p>
            <Link to="/praxa" className="mt-5 inline-flex items-center gap-2 text-sm font-mono uppercase tracking-[0.15em] text-praxium-accent-text hover:underline">
              See Praxa <ArrowUpRight size={14} />
            </Link>
          </div>
        </ScrollReveal>

        <div className="mt-20 text-center">
          <Link to="/signup" data-testid="about-cta-signup" className="inline-flex bg-praxium-accent-hover text-white px-8 py-4 rounded-full text-sm font-mono uppercase tracking-[0.15em] hover:bg-praxium-accent transition-colors">
            Start 30 days free
          </Link>
        </div>
      </main>
    </MarketingShell>
  );
}
