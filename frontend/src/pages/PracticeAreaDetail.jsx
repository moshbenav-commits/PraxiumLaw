import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, Check, ChevronLeft } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import ScrollReveal from "@/components/landing/ScrollReveal";
import usePageMeta from "@/components/landing/usePageMeta";
import NotFound from "@/pages/NotFound";
import { getPracticeArea, PRACTICE_AREA_PAGES, STATUS_LABEL } from "@/data/expansion";

export default function PracticeAreaDetail() {
  const { slug } = useParams();
  const area = getPracticeArea(slug);
  usePageMeta({
    title: area ? `${area.name} — Praxium Suite` : "Practice area — Praxium Suite",
    description: area?.tag,
  });
  if (!area) return <NotFound />;

  const others = PRACTICE_AREA_PAGES.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <MarketingShell>
      <main className="max-w-7xl mx-auto px-6 pt-16 lg:pt-24">
        <ScrollReveal>
          <Link to="/practice-areas" className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.15em] text-praxium-subtle hover:text-praxium-accent transition-colors">
            <ChevronLeft size={12} /> All practice areas
          </Link>
          <div className="mt-10 flex items-center gap-4">
            <area.icon size={32} className="text-praxium-accent" strokeWidth={1.4} />
            <span className={`text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-1 border ${area.status === "available" ? "border-praxium-accent text-praxium-accent" : "border-praxium-line text-praxium-subtle"}`}>
              {STATUS_LABEL[area.status]}
            </span>
          </div>
          <h1 className="mt-6 font-display font-black tracking-[-0.04em] leading-[0.9] text-5xl lg:text-7xl max-w-4xl">{area.name}</h1>
          <p className="mt-4 text-lg text-praxium-accent font-display font-bold max-w-2xl">{area.tag}</p>
          <p className="mt-6 text-lg text-praxium-ink/70 max-w-3xl leading-relaxed">{area.summary}</p>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-px bg-praxium-line border border-praxium-line">
            <div className="lg:col-span-7 bg-praxium-surface p-8 lg:p-12">
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-praxium-subtle mb-8">// what the module adds</div>
              <ul className="space-y-4">
                {area.capabilities.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-base text-praxium-ink/85">
                    <Check size={16} className="text-praxium-accent mt-1 shrink-0" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-5 bg-praxium-ink text-white p-8 lg:p-12 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/50 mb-6">// the edge</div>
                <p className="font-display font-bold text-2xl leading-snug">{area.edge}</p>
              </div>
              <Link to="/signup" className="mt-12 group flex items-center gap-2 text-sm font-mono uppercase tracking-[0.15em] hover:text-praxium-accent transition-colors">
                Start free <ArrowUpRight size={14} className="group-hover:rotate-45 transition-transform" />
              </Link>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={140}>
          <div className="mt-20">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-praxium-subtle mb-6">// same core, other verticals</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-praxium-line border border-praxium-line">
              {others.map((p) => (
                <Link key={p.slug} to={`/practice-areas/${p.slug}`} className="group bg-praxium-surface p-6 hover:bg-praxium-bg transition-colors">
                  <p.icon size={20} className="text-praxium-accent" strokeWidth={1.5} />
                  <div className="mt-4 font-display font-bold text-lg leading-tight">{p.name}</div>
                  <div className="mt-2 text-xs text-praxium-subtle leading-relaxed">{p.tag}</div>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </main>
    </MarketingShell>
  );
}
