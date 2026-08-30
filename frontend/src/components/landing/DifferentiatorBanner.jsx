/**
 * Grounded differentiators band — each claim is one the honesty table backs
 * (free migration, guarantee, no-card trial): SITE_DIRECTION_PACK.json
 * `honesty[]` + locked line "No card required · Free migration from
 * Filevine · 90-day money back". Extracted from Landing.jsx's former
 * "risk removal" section (Site Standard: differentiators).
 */
const CLAIMS = [
  { t: "30 days free", b: "Full platform. No credit card." },
  { t: "Switch Concierge", b: "We do your migration from Filevine. You do nothing." },
  { t: "Mirror Mode", b: "Run both systems in parallel for 30 days. Zero data risk." },
  { t: "90-day money back", b: "Don't love it? Refund + full data export." },
];

export default function DifferentiatorBanner() {
  return (
    <section className="py-32 px-6" data-testid="differentiator-banner">
      <div className="max-w-7xl mx-auto">
        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-praxium-subtle mb-6">// switching // risk-free</div>
        <h2 className="font-display font-black tracking-[-0.03em] leading-[0.95] text-5xl lg:text-7xl max-w-4xl">
          We remove every<br />
          reason <span className="text-praxium-accent italic">not to switch.</span>
        </h2>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-px bg-praxium-line border border-praxium-line">
          {CLAIMS.map((r, i) => (
            <div key={r.t} className="bg-praxium-surface p-8">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-praxium-subtle">// {String(i + 1).padStart(2, "0")}</div>
              <div className="mt-3 font-display font-black text-xl">{r.t}</div>
              <p className="mt-2 text-sm text-praxium-ink/70 leading-relaxed">{r.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
