import { Link } from "react-router-dom";
import { ArrowUpRight, Mail, ShieldCheck } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import ScrollReveal from "@/components/landing/ScrollReveal";
import PageHero from "@/components/landing/PageHero";
import usePageMeta from "@/components/landing/usePageMeta";

// Real channels only — same addresses already live on TermsOfService.jsx,
// PrivacyPolicy.jsx, and AccessibilityStatement.jsx. No sales@/support@
// invented — those inboxes don't exist yet.
const CHANNELS = [
  {
    icon: ShieldCheck,
    label: "Privacy requests",
    body: "Data access, export, deletion, or any question about the privacy policy.",
    email: "privacy@praxiumlaw.com",
  },
  {
    icon: Mail,
    label: "Legal, accessibility & general questions",
    body: "Terms, accessibility barriers, or anything else that doesn't fit a category above.",
    email: "legal@praxiumlaw.com",
  },
];

export default function Contact() {
  usePageMeta({
    title: "Contact — Praxium Suite",
    description: "Real contact channels for Praxium Suite — privacy requests, legal and accessibility questions, and how to talk to the team.",
  });

  return (
    <MarketingShell>
      <main className="max-w-5xl mx-auto px-6 pt-20 lg:pt-28 pb-24">
        <PageHero
          overline="// contact // real channels"
          title="Talk to us."
          titleClassName="tracking-[-0.04em] leading-[0.92] text-5xl lg:text-6xl max-w-3xl"
          description="Praxium is in private beta, so there's no call center yet — but every channel below reaches a real inbox."
          descriptionClassName="mt-6 text-lg text-praxium-ink/70 max-w-xl leading-relaxed"
        />

        <ScrollReveal delay={80}>
          <div className="mt-14 border border-praxium-line bg-praxium-ink text-white rounded-sm p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-praxium-accent mb-2">// fastest path in</div>
              <h2 className="font-display font-black text-2xl">Already a prospective firm?</h2>
              <p className="mt-2 text-sm text-white/60 max-w-md">
                Start the 30-day free trial — a Praxium team member follows up during onboarding, and
                paid tiers include priority or dedicated support directly in the product.
              </p>
            </div>
            <Link
              to="/signup"
              data-testid="contact-cta-signup"
              className="shrink-0 group bg-praxium-accent-hover text-white px-7 py-3.5 rounded-full text-sm font-mono uppercase tracking-[0.15em] hover:bg-praxium-accent transition-colors flex items-center gap-2"
            >
              Start 30 days free <ArrowUpRight size={16} className="group-hover:rotate-45 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={120}>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-px bg-praxium-line border border-praxium-line">
            {CHANNELS.map((c) => (
              <div key={c.email} className="bg-praxium-surface p-8" data-testid={`contact-channel-${c.email.split("@")[0]}`}>
                <c.icon size={22} className="text-praxium-accent" strokeWidth={1.6} />
                <div className="mt-4 font-display font-black text-lg">{c.label}</div>
                <p className="mt-2 text-sm text-praxium-ink/70 leading-relaxed">{c.body}</p>
                <a href={`mailto:${c.email}`} className="mt-4 inline-block text-sm font-mono text-praxium-accent-text hover:underline">
                  {c.email}
                </a>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <div className="mt-12 text-center">
          <Link to="/" className="text-sm font-mono text-praxium-accent-text hover:underline">← Back to homepage</Link>
        </div>
      </main>
    </MarketingShell>
  );
}
