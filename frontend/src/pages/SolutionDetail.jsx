import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, ChevronLeft, ShieldCheck } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import ScrollReveal from "@/components/landing/ScrollReveal";
import usePageMeta from "@/components/landing/usePageMeta";
import NotFound from "@/pages/NotFound";
import { getSolution, SOLUTIONS, STATUS_LABEL } from "@/data/expansion";

export default function SolutionDetail() {
  const { slug } = useParams();
  const sol = getSolution(slug);
  usePageMeta({
    title: sol ? `${sol.name} — Praxium Suite` : "Solution — Praxium Suite",
    description: sol?.sub,
  });
  if (!sol) return <NotFound />;

  const others = SOLUTIONS.filter((s) => s.slug !== slug);

  return (
    <MarketingShell>
      <main className="max-w-7xl mx-auto px-6 pt-16 lg:pt-24">
        <ScrollReveal>
          <Link to="/solutions" className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.15em] text-praxium-subtle hover:text-praxium-accent transition-colors">
            <ChevronLeft size={12} /> All solutions
          </Link>
          <div className="mt-10 text-[10px] font-mono uppercase tracking-[0.3em] text-praxium-subtle flex items-center gap-4">
            <span>{sol.kicker}</span>
            <span className="text-[9px] px-2 py-1 border border-praxium-line">{STATUS_LABEL[sol.status]}</span>
          </div>
          <h1 className="mt-6 font-display font-black tracking-[-0.04em] leading-[0.9] text-4xl sm:text-5xl lg:text-7xl max-w-4xl">{sol.headline}</h1>
          <p className="mt-8 text-lg lg:text-xl text-praxium-ink/70 max-w-3xl leading-relaxed">{sol.sub}</p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link to="/signup" className="group bg-praxium-accent text-white px-8 py-4 rounded-full text-sm font-mono uppercase tracking-[0.15em] hover:bg-praxium-accent-hover transition-colors flex items-center gap-3">
              Get early access <ArrowUpRight size={16} className="group-hover:rotate-45 transition-transform" />
            </Link>
            <Link to="/pricing" className="rounded-full border border-praxium-line px-6 py-4 text-sm font-mono uppercase tracking-[0.15em] hover:border-praxium-accent hover:text-praxium-accent transition-colors">
              See pricing
            </Link>
          </div>
        </ScrollReveal>

        {/* Flow */}
        <ScrollReveal delay={100}>
          <div className="mt-24">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-praxium-subtle mb-8">// how it runs</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-praxium-line border border-praxium-line">
              {sol.flow.map((step, i) => (
                <div key={step.t} className="bg-praxium-surface p-8">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-praxium-subtle">// {String(i + 1).padStart(2, "0")}</div>
                  <div className="mt-3 font-display font-black text-xl">{step.t}</div>
                  <p className="mt-3 text-sm text-praxium-ink/70 leading-relaxed">{step.b}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Features + KPIs */}
        <ScrollReveal delay={120}>
          <div className="mt-20 grid grid-cols-1 lg:grid-cols-12 gap-px bg-praxium-line border border-praxium-line">
            <div className="lg:col-span-7 bg-praxium-surface p-8 lg:p-12 space-y-8">
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-praxium-subtle">// why it wins</div>
              {sol.features.map((f) => (
                <div key={f.t} className="border-l-2 border-praxium-accent pl-5">
                  <div className="font-display font-bold text-lg">{f.t}</div>
                  <p className="mt-2 text-sm text-praxium-ink/70 leading-relaxed">{f.b}</p>
                </div>
              ))}
            </div>
            <div className="lg:col-span-5 bg-praxium-ink text-white p-8 lg:p-12">
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/50 mb-6">// measured by</div>
              <ul className="space-y-4">
                {sol.kpis.map((k) => (
                  <li key={k} className="font-display font-bold text-xl leading-snug text-praxium-accent">{k}</li>
                ))}
              </ul>
              <div className="mt-12 pt-8 border-t border-white/15 flex items-start gap-3">
                <ShieldCheck size={18} className="text-praxium-accent mt-0.5 shrink-0" strokeWidth={1.6} />
                <p className="text-sm text-white/70 leading-relaxed">{sol.guardrail}</p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Other solutions */}
        <ScrollReveal delay={140}>
          <div className="mt-20">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-praxium-subtle mb-6">// the rest of the operations layer</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-praxium-line border border-praxium-line">
              {others.map((s) => (
                <Link key={s.slug} to={`/solutions/${s.slug}`} className="group bg-praxium-surface p-6 hover:bg-praxium-bg transition-colors">
                  <s.icon size={20} className="text-praxium-accent" strokeWidth={1.5} />
                  <div className="mt-4 font-display font-bold text-lg leading-tight">{s.name}</div>
                  <div className="mt-2 text-xs text-praxium-subtle leading-relaxed line-clamp-2">{s.headline}</div>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </main>
    </MarketingShell>
  );
}
