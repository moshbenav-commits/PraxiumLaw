import { useState, useEffect } from "react";
import { Sparkles, Phone, FileText, DollarSign, ArrowRight, Check } from "lucide-react";
import { StatusPip } from "./primitives";

const STAGES = [
  {
    n: "01",
    label: "Intake",
    title: "Lead arrives from Praxa",
    sub: "Consumer signs up, logs 12 days of symptoms, gets routed to your firm.",
    render: () => (
      <div className="space-y-3">
        <div className="border border-praxium-line p-3 bg-praxium-bg">
          <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-praxium-accent-text flex items-center gap-1.5">
            <Sparkles size={10} /> new lead · LawMatch
          </div>
          <div className="mt-2 font-display font-bold text-praxium-ink">
            John H. Smith
          </div>
          <div className="text-[11px] text-praxium-subtle mt-1">
            MVA · rear-ended · 12 days of journal entries
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <StatusPip label="Pain 7/10" tone="warning" />
            <StatusPip label="Has LOP" tone="positive" />
          </div>
        </div>
        <div className="text-[11px] font-mono text-praxium-subtle">
          Click to claim — est. $80–120k case value
        </div>
      </div>
    ),
  },
  {
    n: "02",
    label: "Discovery",
    title: "MedConnect collects records",
    sub: "Magic-link uploads + auto follow-ups. 4 providers, day 12.",
    render: () => (
      <div className="space-y-1.5 text-[12px]">
        {[
          { p: "Mercy Hospital ER", s: "Received", t: "positive" },
          { p: "Dr. Patel · IME", s: "Pending d12", t: "warning" },
          { p: "Acme Imaging", s: "Received", t: "positive" },
          { p: "Apex PT", s: "Subpoena", t: "danger" },
        ].map((r) => (
          <div
            key={r.p}
            className="flex items-center justify-between border border-praxium-line px-2.5 py-1.5"
          >
            <span className="text-praxium-ink truncate">{r.p}</span>
            <StatusPip label={r.s} tone={r.t} />
          </div>
        ))}
      </div>
    ),
  },
  {
    n: "03",
    label: "Demand",
    title: "CoCounsel drafts the letter",
    sub: "Pulls every billing line, IME finding, symptom log into a polished demand.",
    render: () => (
      <div className="space-y-2">
        <div className="border-l-2 border-praxium-accent pl-3 text-[12px] text-praxium-ink leading-relaxed">
          "On October 14, plaintiff John H. Smith sustained an L5-S1
          disc herniation requiring surgical intervention…"
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-mono px-1.5 py-0.5 border border-praxium-line bg-praxium-bg">
            MRI 10/12
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 border border-praxium-line bg-praxium-bg">
            Dr. Patel IME
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 border border-praxium-line bg-praxium-bg">
            $42,500 specials
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-praxium-accent">
          <Sparkles size={10} /> ready in 90 sec · citations clickable
        </div>
      </div>
    ),
  },
  {
    n: "04",
    label: "Settlement",
    title: "Compare. Sign. Disburse.",
    sub: "NativeSign + comparables DB + auto fee split.",
    render: () => (
      <div className="space-y-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-praxium-subtle">
            Settlement
          </div>
          <div className="font-display font-black text-3xl tabular text-praxium-ink">
            $1,450,000
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-praxium-line">
          {[
            ["Attorney fee", "$483,333"],
            ["Specials", "$42,500"],
            ["Liens", "$28,100"],
            ["Net to client", "$896,067"],
          ].map(([k, v]) => (
            <div key={k} className="bg-praxium-surface p-2">
              <div className="text-[10px] font-mono text-praxium-subtle">
                {k}
              </div>
              <div className="font-mono tabular text-[13px] text-praxium-ink mt-0.5">
                {v}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-700">
          <Check size={10} /> e-signed in 6 min · NativeSign
        </div>
      </div>
    ),
  },
];

export default function MatterLifecycleTour() {
  const [active, setActive] = useState(0);

  // Auto-rotate
  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % STAGES.length), 5500);
    return () => clearInterval(id);
  }, []);

  return (
    <div data-testid="showcase-lifecycle-tour">
      {/* Stage tabs */}
      <div className="grid grid-cols-4 gap-px bg-praxium-line border border-praxium-line">
        {STAGES.map((s, i) => {
          const isActive = i === active;
          return (
            <button
              key={s.n}
              onClick={() => setActive(i)}
              data-testid={`lifecycle-stage-${i}`}
              className={`text-left p-5 transition-colors relative ${
                isActive
                  ? "bg-praxium-ink text-white"
                  : "bg-praxium-surface text-praxium-ink hover:bg-praxium-bg"
              }`}
            >
              <div
                className={`text-[10px] font-mono uppercase tracking-[0.2em] ${
                  isActive ? "text-praxium-accent" : "text-praxium-subtle"
                }`}
              >
                step {s.n}
              </div>
              <div
                className={`mt-2 font-display font-black text-lg ${
                  isActive ? "text-white" : "text-praxium-ink"
                }`}
              >
                {s.label}
              </div>
              {isActive && (
                <div className="absolute left-0 right-0 -bottom-px h-0.5 bg-praxium-accent" />
              )}
            </button>
          );
        })}
      </div>

      {/* Stage body */}
      <div className="grid grid-cols-12 gap-px bg-praxium-line border-x border-b border-praxium-line">
        <div className="col-span-12 lg:col-span-5 bg-praxium-surface p-8">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-praxium-accent-text mb-3">
            // step {STAGES[active].n} · {STAGES[active].label.toLowerCase()}
          </div>
          <h3 className="font-display font-black text-3xl lg:text-4xl tracking-[-0.02em] leading-[0.98] text-praxium-ink">
            {STAGES[active].title}
          </h3>
          <p className="mt-4 text-praxium-ink/70 leading-relaxed">
            {STAGES[active].sub}
          </p>

          <div className="mt-6 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.15em] text-praxium-subtle">
            {STAGES.map((s, i) => (
              <span key={s.n} className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    i <= active ? "bg-praxium-accent" : "bg-praxium-line"
                  }`}
                />
                {i < STAGES.length - 1 && (
                  <span
                    className={`w-6 h-px ${
                      i < active ? "bg-praxium-accent" : "bg-praxium-line"
                    }`}
                  />
                )}
              </span>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 bg-praxium-bg p-6 lg:p-8">
          <div
            key={active}
            className="animate-fade-in bg-praxium-surface border border-praxium-line p-5 lg:p-6 rounded-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-praxium-subtle">
                Praxium · {STAGES[active].label}
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500/70" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
              </div>
            </div>
            {STAGES[active].render()}
          </div>
        </div>
      </div>
    </div>
  );
}
