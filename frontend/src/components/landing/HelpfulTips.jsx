import { ArrowUpRight } from "lucide-react";

/**
 * Helpful-tips rail — the education content SITE_DIRECTION_PACK.json calls
 * out explicitly ("Teach what an operating system for a firm means versus a
 * point tool — the math page, a real demand letter produced, the migration
 * path"). No public blog exists yet, so each card links to the real page or
 * in-page section that answers it (Site Standard: contentRail).
 */
const TIPS = [
  {
    kicker: "The math",
    title: "What an eight-tool stack actually costs a firm",
    body: "Filevine, RingCentral, DocuSign, Mailchimp, a records vendor, a billing tool, and the IT consultant to hold it together — the unrounded, line-by-line total for a 15-attorney firm.",
    href: "#truth",
    cta: "See the math",
  },
  {
    kicker: "The migration",
    title: "What switching from Filevine actually involves",
    body: "Switch Concierge runs the migration. Mirror Mode lets a firm run both systems in parallel for 30 days before committing — so nothing is lost mid-move.",
    href: "/pricing",
    cta: "See the plans",
  },
  {
    kicker: "The OS idea",
    title: "\"Operating system\" versus another point tool",
    body: "A point tool adds a login. An operating system replaces the ones you have — one system of record for matters, documents, intake, and billing, with AI grounded in that same data.",
    href: "#how",
    cta: "See how it's built",
  },
];

export default function HelpfulTips() {
  return (
    <section className="py-32 px-6 border-y border-praxium-line bg-praxium-surface" data-testid="helpful-tips">
      <div className="max-w-7xl mx-auto">
        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-praxium-subtle mb-6">// from the field // what to actually know before you switch</div>
        <h2 className="font-display font-black tracking-[-0.03em] leading-[0.95] text-5xl lg:text-6xl max-w-3xl">
          Three things worth<br />
          understanding <span className="text-praxium-accent italic">first.</span>
        </h2>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-praxium-line border border-praxium-line">
          {TIPS.map((tip) => (
            <a
              key={tip.title}
              href={tip.href}
              data-testid={`guide-card-${tip.kicker.toLowerCase().replace(/\s+/g, "-")}`}
              className="group guide-card bg-praxium-bg p-8 lg:p-10 flex flex-col hover:bg-white transition-colors"
            >
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-praxium-accent-text">// {tip.kicker}</div>
              <h3 className="mt-4 font-display font-black text-xl leading-snug">{tip.title}</h3>
              <p className="mt-3 text-sm text-praxium-ink/70 leading-relaxed flex-1">{tip.body}</p>
              <div className="mt-6 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-praxium-subtle group-hover:text-praxium-accent transition-colors">
                {tip.cta} <ArrowUpRight size={12} className="group-hover:rotate-45 transition-transform" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
