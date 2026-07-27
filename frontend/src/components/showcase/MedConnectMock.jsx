import { Stethoscope, Sparkles, Mail, Clock, FileCheck, AlertCircle } from "lucide-react";
import { MockBrowserChrome, StatusPip } from "./primitives";

const PROVIDERS = [
  {
    name: "Mercy Hospital · ER",
    type: "ER record",
    requested: "Day 1",
    status: { label: "Received · 142 pp", tone: "positive" },
    cost: "$145.00",
    ai: "Summarized",
    aiTone: "accent",
  },
  {
    name: "Dr. Alan Patel · Orthopedic",
    type: "IME + treatment notes",
    requested: "Day 4",
    status: { label: "Pending · day 12", tone: "warning" },
    cost: "—",
    ai: "Auto-followup queued",
    aiTone: "neutral",
  },
  {
    name: "Acme Imaging Center",
    type: "MRI report + films",
    requested: "Day 7",
    status: { label: "Received · 18 pp", tone: "positive" },
    cost: "$62.50",
    ai: "Summarized",
    aiTone: "accent",
  },
  {
    name: "Apex Physical Therapy",
    type: "Treatment + billing",
    requested: "Day 9",
    status: { label: "Subpoena required", tone: "danger" },
    cost: "—",
    ai: "Escalated to attorney",
    aiTone: "danger",
  },
];

export default function MedConnectMock() {
  return (
    <MockBrowserChrome
      url="www.praxiumlaw.com/medconnect"
      testId="showcase-medconnect"
    >
      {/* Header strip */}
      <div className="px-6 py-4 border-b border-praxium-line flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-praxium-ink text-white flex items-center justify-center">
            <Stethoscope size={16} strokeWidth={1.6} />
          </div>
          <div>
            <div className="font-display font-black text-praxium-ink text-lg">
              MedConnect · Smith v. Acme
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-praxium-subtle">
              records collection · 4 providers · day 12 of campaign
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPip label="2 of 4 received" tone="positive" />
          <button className="bg-praxium-ink text-white px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.15em] rounded-sm">
            + Add provider
          </button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-4 gap-px bg-praxium-line">
        {[
          { l: "Records age", v: "12 days", sub: "industry: 60-90" },
          { l: "Auto follow-ups", v: "7", sub: "sent this matter" },
          { l: "AI MedChron", v: "Ready", sub: "after 4/4 received" },
          { l: "Cost so far", v: "$207.50", sub: "vs $2,800 ChartSwap" },
        ].map((s) => (
          <div key={s.l} className="bg-praxium-surface px-5 py-3">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-praxium-subtle">
              {s.l}
            </div>
            <div className="mt-1 font-display font-black text-xl tabular text-praxium-ink">
              {s.v}
            </div>
            <div className="text-[10px] font-mono text-praxium-subtle">
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-mono uppercase tracking-[0.15em] text-praxium-subtle border-b border-praxium-line">
              <th className="text-left px-5 py-2.5 font-semibold">Provider</th>
              <th className="text-left px-3 py-2.5 font-semibold">Requested</th>
              <th className="text-left px-3 py-2.5 font-semibold">Status</th>
              <th className="text-left px-3 py-2.5 font-semibold">Cost</th>
              <th className="text-left px-3 py-2.5 font-semibold">AI</th>
            </tr>
          </thead>
          <tbody>
            {PROVIDERS.map((p, i) => (
              <tr
                key={i}
                className="border-b border-praxium-line/60 hover:bg-praxium-bg/60 transition-colors"
              >
                <td className="px-5 py-3">
                  <div className="font-medium text-praxium-ink">{p.name}</div>
                  <div className="text-[10px] font-mono text-praxium-subtle uppercase tracking-wider">
                    {p.type}
                  </div>
                </td>
                <td className="px-3 py-3 text-[11px] font-mono text-praxium-subtle">
                  {p.requested}
                </td>
                <td className="px-3 py-3">
                  <StatusPip label={p.status.label} tone={p.status.tone} />
                </td>
                <td className="px-3 py-3 font-mono tabular text-praxium-ink text-[13px]">
                  {p.cost}
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-praxium-ink">
                    {p.aiTone === "accent" && (
                      <Sparkles size={11} className="text-praxium-accent" />
                    )}
                    {p.aiTone === "neutral" && (
                      <Clock size={11} className="text-praxium-subtle" />
                    )}
                    {p.aiTone === "danger" && (
                      <AlertCircle size={11} className="text-rose-600" />
                    )}
                    {p.ai}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI MedChron preview */}
      <div className="bg-praxium-bg px-5 py-4 border-t border-praxium-line flex items-center gap-3">
        <FileCheck size={14} className="text-praxium-accent" />
        <div className="text-[11px] font-mono text-praxium-subtle flex-1">
          When all 4 records arrive, CoCounsel will compile a chronological MedChron with citations · est. 90 sec
        </div>
        <button className="text-[10px] font-mono uppercase tracking-[0.15em] text-praxium-accent">
          Preview the AI output →
        </button>
      </div>
    </MockBrowserChrome>
  );
}
