import { Phone, Mic, Pause, PhoneOff, Sparkles, CheckSquare } from "lucide-react";
import { MockBrowserChrome, StatusPip } from "./primitives";

const TRANSCRIPT = [
  {
    speaker: "John (client)",
    side: "left",
    text: "My back is still killing me after the therapy. Sleep is brutal.",
    t: "00:42",
  },
  {
    speaker: "Sarah (paralegal)",
    side: "right",
    text: "I hear you. Let's get an IME on the calendar with Dr. Patel this week.",
    t: "00:58",
  },
  {
    speaker: "John",
    side: "left",
    text: "Will the insurance pay for that, or do I have to?",
    t: "01:14",
  },
  {
    speaker: "Sarah",
    side: "right",
    text: "Letter of Protection. Zero out-of-pocket. I'll send you the consent now.",
    t: "01:22",
  },
];

const TASKS = [
  { t: "Schedule IME with Dr. Patel", confidence: 96 },
  { t: "Send LOP consent to John", confidence: 92 },
  { t: "Log sleep symptom in matter", confidence: 88 },
];

export default function VoxLineMock() {
  return (
    <MockBrowserChrome
      url="www.praxiumlaw.com/voxline/active"
      theme="dark"
      testId="showcase-voxline"
    >
      <div className="grid grid-cols-12 gap-px bg-white/5">
        {/* Dialer / caller card */}
        <div className="col-span-12 lg:col-span-4 bg-praxium-ink p-6">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
            // active call
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-praxium-accent flex items-center justify-center text-white font-display font-black">
              JS
            </div>
            <div>
              <div className="font-display font-bold text-white text-lg">
                John H. Smith
              </div>
              <div className="text-[11px] font-mono text-white/50">
                +1 (305) 555 · 0142
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <StatusPip label="Recording" tone="live" />
            <StatusPip label="HIPAA · consent on file" tone="dark" />
          </div>
          <div className="mt-6 font-display font-black text-5xl tabular text-white">
            04:12
          </div>
          <div className="text-[10px] font-mono text-white/40">
            connected · 305 area · Miami
          </div>
          <div className="mt-6 flex items-center gap-2">
            {[Mic, Pause, PhoneOff].map((Ic, i) => (
              <button
                key={i}
                className={`w-9 h-9 flex items-center justify-center rounded-sm border ${
                  Ic === PhoneOff
                    ? "border-rose-500/50 text-rose-400 hover:bg-rose-500/15"
                    : "border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                <Ic size={14} />
              </button>
            ))}
          </div>
          <div className="mt-8 pt-5 border-t border-white/10 text-[10px] font-mono text-white/40 leading-relaxed">
            Logging to matter · Smith v. Acme — M-2026-0034
          </div>
        </div>

        {/* Live transcript */}
        <div className="col-span-12 lg:col-span-5 bg-praxium-ink/95 p-6">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
              // live transcript
            </div>
            <StatusPip label="Whisper · realtime" tone="dark" />
          </div>
          <div className="mt-4 space-y-3 font-mono text-[12.5px] leading-relaxed">
            {TRANSCRIPT.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.side === "right" ? "justify-end" : "justify-start"
                }`}
              >
                <div className="max-w-[90%]">
                  <div
                    className={`text-[10px] uppercase tracking-[0.15em] ${
                      m.side === "right"
                        ? "text-praxium-accent text-right"
                        : "text-white/40"
                    }`}
                  >
                    {m.speaker} · {m.t}
                  </div>
                  <div
                    className={`mt-1 px-3 py-2 rounded-sm ${
                      m.side === "right"
                        ? "bg-praxium-accent/15 border border-praxium-accent/30 text-white"
                        : "bg-white/5 border border-white/10 text-white/85"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-white/40 text-[11px] pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
              listening…
            </div>
          </div>
        </div>

        {/* AI tasks panel */}
        <div className="col-span-12 lg:col-span-3 bg-praxium-ink p-6">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
            <Sparkles size={11} className="text-praxium-accent" />
            // auto-extracted
          </div>
          <div className="mt-4 space-y-2.5">
            {TASKS.map((t, i) => (
              <div
                key={i}
                className="flex items-start gap-2 bg-white/5 border border-white/10 p-2.5"
              >
                <CheckSquare
                  size={13}
                  className="text-praxium-accent mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-white/90 leading-snug">
                    {t.t}
                  </div>
                  <div className="text-[10px] font-mono text-white/40 mt-1">
                    confidence {t.confidence}%
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-5 w-full bg-praxium-accent text-white text-[10px] font-mono uppercase tracking-[0.15em] py-2 hover:bg-praxium-accent-hover transition-colors">
            Save 3 tasks to matter →
          </button>
        </div>
      </div>
    </MockBrowserChrome>
  );
}
