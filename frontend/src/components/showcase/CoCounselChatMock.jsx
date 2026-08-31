import { Sparkles, ArrowUp, FileText, Stethoscope, Scale } from "lucide-react";
import { StatusPip } from "./primitives";

const MESSAGES = [
  {
    role: "user",
    body: "Draft a demand letter for Smith citing the L5-S1 herniation and Dr. Patel's findings.",
  },
  {
    role: "ai",
    body: [
      "I've drafted a 4-page demand letter using:",
      "• MRI Report from 10/12 (L5-S1 disc herniation, 8mm extrusion)",
      "• Dr. Patel's IME — surgical recommendation",
      "• Specials totaling $42,500 from MedConnect billing tab",
    ],
    citations: [
      { icon: Stethoscope, label: "MRI Report 10/12" },
      { icon: FileText, label: "Dr. Patel IME" },
      { icon: Scale, label: "Acme Ortho billing" },
    ],
    streaming: true,
  },
];

export default function CoCounselChatMock() {
  return (
    <div className="relative max-w-2xl">
      {/* Blurred document behind */}
      <div className="absolute inset-0 -translate-x-6 translate-y-6 bg-praxium-bg border border-praxium-line rounded-sm p-6 blur-[2px] opacity-70 select-none pointer-events-none">
        <div className="space-y-2">
          <div className="h-2 bg-praxium-ink/10 w-2/3" />
          <div className="h-2 bg-praxium-ink/10 w-full" />
          <div className="h-2 bg-praxium-ink/10 w-5/6" />
          <div className="h-2 bg-praxium-ink/10 w-4/6" />
          <div className="h-2 bg-praxium-ink/10 w-full" />
          <div className="h-2 bg-praxium-ink/10 w-3/5" />
        </div>
      </div>

      {/* Floating glass panel */}
      <div className="relative bg-white/95 backdrop-blur-xl border border-praxium-line rounded-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-praxium-line bg-praxium-bg/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-praxium-ink flex items-center justify-center rounded-sm">
              <Sparkles size={12} className="text-praxium-accent" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-praxium-ink font-semibold">
                CoCounsel
              </div>
              <div className="text-[10px] font-mono text-praxium-subtle">
                matter · Smith v. Acme
              </div>
            </div>
          </div>
          <StatusPip label="Claude Sonnet 4.5" tone="accent" />
        </div>

        {/* Messages */}
        <div className="p-5 space-y-5 max-h-[420px]">
          {MESSAGES.map((m, i) => (
            <div key={i} className="flex gap-3">
              <div
                className={`w-6 h-6 shrink-0 rounded-sm flex items-center justify-center text-[10px] font-mono uppercase tracking-wider ${
                  m.role === "user"
                    ? "bg-praxium-line text-praxium-ink"
                    : "bg-praxium-accent-hover text-white"
                }`}
              >
                {m.role === "user" ? "You" : "π"}
              </div>
              <div className="flex-1 min-w-0">
                {Array.isArray(m.body) ? (
                  <div className="space-y-1.5 text-sm text-praxium-ink leading-relaxed">
                    {m.body.map((line, j) => (
                      <div key={j}>{line}</div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-praxium-ink leading-relaxed">
                    {m.body}
                  </div>
                )}
                {m.citations && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.citations.map((c, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] px-2 py-1 bg-praxium-bg border border-praxium-line text-praxium-ink hover:border-praxium-accent transition-colors cursor-pointer"
                      >
                        <c.icon size={10} className="text-praxium-accent" />
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}
                {m.streaming && (
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-praxium-subtle">
                    <span className="w-1.5 h-1.5 rounded-full bg-praxium-accent animate-pulse-glow" />
                    drafting · 1,248 tokens · streaming live
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-praxium-line px-5 py-3 flex items-center gap-3 bg-praxium-bg/40">
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-praxium-subtle">
            ⌘ K
          </span>
          <div className="flex-1 text-sm text-praxium-subtle">
            Ask anything about this matter…
          </div>
          <button className="w-7 h-7 rounded-sm bg-praxium-accent-text text-white flex items-center justify-center">
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
