import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import ScrollReveal from "@/components/landing/ScrollReveal";
import usePageMeta from "@/components/landing/usePageMeta";
import { PRACTICE_AREA_PAGES, STATUS_LABEL } from "@/data/expansion";

export default function PracticeAreas() {
  usePageMeta({
    title: "Practice Areas — Praxium Suite",
    description: "One shared core, a module for every injury vertical: PI, workers' comp, med-mal, premises, product liability, mass tort, nursing home, dog bite, wrongful death.",
  });

  return (
    <MarketingShell>
      <main className="max-w-7xl mx-auto px-6 pt-20 lg:pt-28">
        <ScrollReveal>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-praxium-subtle mb-6">// practice areas // one core, every vertical</div>
          <h1 className="font-display font-black tracking-[-0.04em] leading-[0.9] text-5xl lg:text-7xl max-w-4xl">
            Built on PI.<br />
            Ready for <span className="text-praxium-accent italic">every injury practice.</span>
          </h1>
          <p className="mt-8 text-lg lg:text-xl text-praxium-ink/70 max-w-2xl leading-relaxed">
            Every vertical below runs on the same core — intake, matters, documents, deadlines, demands, liens, disbursement, trust. A practice-area module changes what the core asks, files, and watches. Turn one on; nothing gets forked.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-praxium-line border border-praxium-line">
            {PRACTICE_AREA_PAGES.map((p) => (
              <Link
                key={p.slug}
                to={`/practice-areas/${p.slug}`}
                data-testid={`practice-area-card-${p.slug}`}
                className="group bg-praxium-surface p-8 flex flex-col hover:bg-praxium-bg transition-colors"
              >
                <div className="flex items-start justify-between">
                  <p.icon size={26} className="text-praxium-accent" strokeWidth={1.5} />
                  <span className={`text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-1 border ${p.status === "available" ? "border-praxium-accent text-praxium-accent" : "border-praxium-line text-praxium-subtle"}`}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
                <h2 className="mt-6 font-display font-black text-2xl tracking-[-0.02em] leading-tight">{p.name}</h2>
                <p className="mt-3 text-sm text-praxium-ink/70 leading-relaxed flex-1">{p.tag}</p>
                <div className="mt-6 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-praxium-subtle group-hover:text-praxium-accent transition-colors">
                  Explore <ArrowUpRight size={12} className="group-hover:rotate-45 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={140}>
          <div className="mt-16 border border-praxium-line bg-praxium-surface p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h3 className="font-display font-black text-2xl tracking-[-0.02em]">Don't see your citation and municipal work?</h3>
              <p className="mt-2 text-sm text-praxium-ink/70 max-w-xl">Tickets and municipal notices run on their own pipeline — mailbox detection, document generation, and fine negotiation.</p>
            </div>
            <Link to="/solutions/citation-os" className="shrink-0 text-xs font-mono uppercase tracking-[0.15em] text-praxium-accent hover:underline">
              See Citation OS →
            </Link>
          </div>
        </ScrollReveal>
      </main>
    </MarketingShell>
  );
}
