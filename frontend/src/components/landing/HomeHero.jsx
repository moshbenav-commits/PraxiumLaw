import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronRight, Command } from "lucide-react";
import MatterCanvasMock from "../showcase/MatterCanvasMock";
import ScrollReveal from "./ScrollReveal";
import TrustStrip from "./TrustStrip";

/**
 * Composed story hero — headline + primary action + a real product still
 * (MatterCanvasMock), not a dashboard screenshot. Extracted from Landing.jsx
 * so the homepage carries a named hero component (Site Standard: heroStory).
 *
 * data-hero="home" is the landscape-orientation hook (see index.css) —
 * rotated phones / small tablets get a much shorter viewport, so the
 * default pt-36 top padding is compacted there rather than pushing the
 * primary CTA below the fold.
 */
export default function HomeHero() {
  return (
    <section data-hero="home" className="pt-36 pb-20 lg:pb-28 px-6 relative overflow-hidden">
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
                <Link to="/signup" data-testid="hero-cta-signup" className="group bg-praxium-accent-hover text-white px-8 py-4 rounded-full text-sm font-mono uppercase tracking-[0.15em] hover:bg-praxium-accent transition-colors flex items-center gap-3">
                  Start 30 days free <ArrowUpRight size={16} className="group-hover:rotate-45 transition-transform" />
                </Link>
                <a href="#truth" className="rounded-full border border-praxium-line px-6 py-4 text-sm font-mono uppercase tracking-[0.15em] text-praxium-ink hover:border-praxium-accent hover:text-praxium-accent transition-colors flex items-center gap-2">
                  See the math <ChevronRight size={14} />
                </a>
              </div>
              <TrustStrip className="mt-6" />
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
  );
}
