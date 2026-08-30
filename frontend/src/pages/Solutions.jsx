import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import ScrollReveal from "@/components/landing/ScrollReveal";
import PageHero from "@/components/landing/PageHero";
import usePageMeta from "@/components/landing/usePageMeta";
import { SOLUTIONS, STATUS_LABEL } from "@/data/expansion";

export default function Solutions() {
  usePageMeta({
    title: "Solutions — Praxium Suite",
    description: "Citation OS, PraxHQ Booking, Billing OS, and Workforce Automation — the systems that run the injury firm's operations end to end.",
  });

  return (
    <MarketingShell>
      <main className="max-w-7xl mx-auto px-6 pt-20 lg:pt-28">
        <PageHero
          overline="// solutions // the operations layer"
          title={(
            <>
              The systems that run<br />
              the <span className="text-praxium-accent italic">whole firm.</span>
            </>
          )}
          description="Beyond case management: the pipelines that catch tickets in the mail, keep treatment on schedule, run the billing department, and retire the clerical layer for good."
        />

        <ScrollReveal delay={100}>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-px bg-praxium-line border border-praxium-line">
            {SOLUTIONS.map((s) => (
              <Link
                key={s.slug}
                to={`/solutions/${s.slug}`}
                data-testid={`solution-card-${s.slug}`}
                className="group bg-praxium-surface p-8 lg:p-10 flex flex-col hover:bg-praxium-bg transition-colors"
              >
                <div className="flex items-start justify-between">
                  <s.icon size={28} className="text-praxium-accent" strokeWidth={1.4} />
                  <span className="text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-1 border border-praxium-line text-praxium-subtle">
                    {STATUS_LABEL[s.status]}
                  </span>
                </div>
                <h2 className="mt-6 font-display font-black text-3xl tracking-[-0.02em] leading-tight">{s.name}</h2>
                <p className="mt-4 text-base text-praxium-ink/70 leading-relaxed flex-1">{s.sub}</p>
                <div className="mt-8 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-praxium-subtle group-hover:text-praxium-accent transition-colors">
                  Explore {s.name} <ArrowUpRight size={12} className="group-hover:rotate-45 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </ScrollReveal>
      </main>
    </MarketingShell>
  );
}
