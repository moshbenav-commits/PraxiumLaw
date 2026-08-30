import { Check } from "lucide-react";

/**
 * First-party proof rail — the site is pre-launch and password-gated with no
 * public review-site presence, so per SITE_DIRECTION_PACK.json's honesty
 * table this surfaces real product capability instead of customer
 * testimonials. Each card is one of the four validated journeyBeats
 * `productProof` entries verbatim — no invented firms, quotes, or metrics
 * (Site Standard: reviews / PortfolioProof pattern).
 */
const PROOFS = [
  {
    n: "01",
    title: "The savings math, shown in the open",
    body: "A 15-attorney firm pays $10,150/mo for the eight-tool stack. Praxium does the same job for $2,985/mo — the unrounded math is on this page, assumptions included.",
  },
  {
    n: "02",
    title: "One matter, intake to invoice",
    body: "The matter canvas above is the live product — matters, documents, intake, and billing on one screen, not four systems synced together.",
  },
  {
    n: "03",
    title: "A demand letter, drafted from matter facts",
    body: "CoCounsel drafts from the matter's own parties, documents, and notes — grounded fields visible, not a blank chatbot guessing at a case.",
  },
];

export default function CaseStudiesRail() {
  return (
    <section className="py-32 px-6" data-testid="case-studies-rail">
      <div className="max-w-7xl mx-auto">
        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-praxium-subtle mb-6">// proof, not promises // first-party</div>
        <h2 className="font-display font-black tracking-[-0.03em] leading-[0.95] text-5xl lg:text-6xl max-w-3xl">
          What the product<br />
          actually <span className="text-praxium-accent italic">does.</span>
        </h2>
        <p className="mt-6 text-sm text-praxium-ink/60 max-w-2xl font-mono">
          Praxium is in private beta — no public reviews to point to yet. Rather than invent one, here's what the live product does, verified against the same page you're reading.
        </p>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-praxium-line border border-praxium-line">
          {PROOFS.map((p) => (
            <div key={p.n} className="bg-praxium-surface p-8 lg:p-10 flex flex-col" data-testid={`case-study-${p.n}`}>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-praxium-subtle">// {p.n}</div>
              <div className="mt-4 flex items-start gap-2">
                <Check size={16} className="text-praxium-accent mt-1 shrink-0" />
                <h3 className="font-display font-black text-lg leading-snug">{p.title}</h3>
              </div>
              <p className="mt-3 text-sm text-praxium-ink/70 leading-relaxed flex-1">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
