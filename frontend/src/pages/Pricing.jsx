import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import ScrollReveal from "@/components/landing/ScrollReveal";
import usePageMeta from "@/components/landing/usePageMeta";
import { TIERS, LEAD_FEES } from "@/data/marketing";

export default function Pricing() {
  usePageMeta({
    title: "Pricing — Praxium Suite",
    description: "All-inclusive law firm OS pricing. Solo $49 to Enterprise $499 per user/month. No hidden add-ons. Transparent LawMatch per-lead fees.",
  });

  return (
    <div className="min-h-screen bg-praxium-bg text-praxium-ink">
      <header className="border-b border-praxium-line bg-praxium-surface">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-praxium-accent flex items-center justify-center font-display font-black text-white text-base">π</div>
            <span className="font-display font-black tracking-tight">PRAXIUM</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-xs font-mono uppercase tracking-wider text-praxium-subtle hover:text-praxium-ink">Sign in</Link>
            <Link to="/signup" className="bg-praxium-ink text-white px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider hover:bg-praxium-accent transition-colors">
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <ScrollReveal>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-praxium-subtle mb-6">// pricing // no asterisks</div>
          <h1 className="font-display font-black tracking-[-0.03em] leading-[0.95] text-5xl lg:text-7xl max-w-4xl">
            All-inclusive.<br />
            <span className="text-praxium-accent italic">Not piecemeal.</span>
          </h1>
          <p className="mt-8 text-lg text-praxium-ink/70 max-w-2xl">
            Every tier includes the full platform. Upgrade unlocks more features — never more modules. No add-on fees.
          </p>
        </ScrollReveal>

        <div className="mt-16 flex xl:grid xl:grid-cols-5 gap-4 xl:gap-px overflow-x-auto snap-x snap-mandatory pb-4 xl:pb-0 -mx-2 px-2 xl:mx-0 xl:px-0 xl:overflow-visible">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`relative shrink-0 w-[min(100%,280px)] sm:w-[260px] xl:w-auto snap-center bg-praxium-surface p-6 lg:p-8 flex flex-col min-h-[420px] border border-praxium-line xl:border-0 ${
                t.popular ? "xl:scale-[1.03] xl:z-10 xl:shadow-2xl bg-praxium-ink text-white ring-2 ring-praxium-accent" : ""
              }`}
            >
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

        <ScrollReveal delay={100}>
          <div className="mt-16 border border-praxium-line bg-praxium-bg p-8 lg:p-10">
            <h2 className="font-display font-black text-2xl lg:text-3xl">LawMatch per-lead fees</h2>
            <p className="mt-2 text-sm text-praxium-ink/70 max-w-xl">Marketplace tier subscribers receive qualified leads. Flat marketing fee per case — Rule 7.2 safe.</p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-praxium-line border border-praxium-line">
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

        <div className="mt-12 text-center space-y-4">
          <Link to="/" className="text-sm font-mono text-praxium-accent hover:underline">← Back to homepage</Link>
          <p className="text-[11px] font-mono text-praxium-subtle">
            <Link to="/terms" className="hover:text-praxium-accent">Terms</Link>
            {" · "}
            <Link to="/privacy" className="hover:text-praxium-accent">Privacy</Link>
            {" · "}
            <Link to="/accessibility" className="hover:text-praxium-accent">Accessibility</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
