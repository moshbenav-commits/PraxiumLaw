import {
  Briefcase,
  FileText,
  Users,
  Calendar,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Paperclip,
  ChevronRight,
} from "lucide-react";
import { MockBrowserChrome, StatusPip, AnnotationPin, AvatarGroup } from "./primitives";

const TABS = [
  { id: "overview", label: "Overview", count: null, active: true },
  { id: "tasks", label: "Tasks", count: 12 },
  { id: "docs", label: "Documents", count: 47 },
  { id: "notes", label: "Notes", count: 9 },
  { id: "timeline", label: "Timeline", count: null },
  { id: "billing", label: "Billing", count: null },
];

const ACTIVITY = [
  {
    actor: "Sarah J.",
    color: "#E85D04",
    text: "filed Motion to Compel · Doc #M-COMPEL-0034",
    time: "2m",
    icon: FileText,
  },
  {
    actor: "CoCounsel",
    color: "#121212",
    text: "extracted 3 deadlines from Court Scheduling Order",
    time: "15m",
    icon: Sparkles,
    ai: true,
  },
  {
    actor: "MedConnect",
    color: "#8A9A86",
    text: "received records from Mercy Hospital · 142 pages",
    time: "1h",
    icon: Paperclip,
  },
  {
    actor: "VoxLine",
    color: "#5C5C5C",
    text: "logged call · John Smith · 4:12 · auto-transcribed",
    time: "3h",
    icon: MessageSquare,
  },
];

export default function MatterCanvasMock() {
  return (
    <div className="relative">
      <MockBrowserChrome
        url="www.praxiumlaw.com/matters/M-2026-0034"
        testId="showcase-matter-canvas"
      >
        <div className="flex">
          {/* ─── Sidebar (mini) ─── */}
          <aside className="hidden md:flex flex-col w-12 bg-praxium-ink border-r border-white/5 py-4 gap-3 items-center">
            <div className="w-7 h-7 bg-praxium-accent flex items-center justify-center font-display font-black text-white text-sm">
              π
            </div>
            {[Briefcase, Users, Calendar, FileText, MessageSquare].map((Ic, i) => (
              <button
                key={i}
                className={`w-7 h-7 flex items-center justify-center rounded-sm ${
                  i === 0
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white"
                }`}
              >
                <Ic size={14} strokeWidth={1.6} />
              </button>
            ))}
          </aside>

          {/* ─── Main canvas ─── */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="px-6 py-4 border-b border-praxium-line flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-praxium-subtle">
                  <span>Matters</span>
                  <ChevronRight size={10} />
                  <span>Personal Injury</span>
                  <ChevronRight size={10} />
                  <span className="text-praxium-ink">M-2026-0034</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <h3 className="font-display font-black text-2xl tracking-[-0.02em] text-praxium-ink">
                    Smith v. Acme Logistics
                  </h3>
                  <StatusPip label="Discovery" tone="accent" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AvatarGroup
                  users={[
                    { initials: "SJ", color: "#E85D04" },
                    { initials: "DP", color: "#121212" },
                    { initials: "MR", color: "#8A9A86" },
                  ]}
                  size={26}
                />
                <button className="bg-praxium-ink text-white px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.15em] rounded-sm">
                  + New task
                </button>
              </div>
            </div>

            {/* Stat strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-praxium-line border-b border-praxium-line">
              {[
                { l: "Value Est.", v: "$1.45M", sub: "median range" },
                {
                  l: "SOL Date",
                  v: "Oct 15 2026",
                  sub: "247 days",
                  flag: true,
                },
                { l: "Days Open", v: "98", sub: "since intake" },
                { l: "Specials", v: "$42,500", sub: "auto-tallied" },
              ].map((s) => (
                <div key={s.l} className="bg-praxium-surface px-5 py-3">
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-praxium-subtle flex items-center gap-1.5">
                    {s.flag && (
                      <AlertTriangle size={10} className="text-rose-600" />
                    )}
                    {s.l}
                  </div>
                  <div
                    className={`mt-1 font-display font-black text-xl tabular ${
                      s.flag ? "text-rose-600" : "text-praxium-ink"
                    }`}
                  >
                    {s.v}
                  </div>
                  <div className="text-[10px] font-mono text-praxium-subtle/80">
                    {s.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="px-6 flex items-center gap-0.5 border-b border-praxium-line overflow-x-auto">
              {TABS.map((t) => (
                <div
                  key={t.id}
                  className={`px-3 py-2.5 text-[11px] font-mono uppercase tracking-[0.15em] border-b-2 -mb-px whitespace-nowrap ${
                    t.active
                      ? "border-praxium-accent text-praxium-ink"
                      : "border-transparent text-praxium-subtle"
                  }`}
                >
                  {t.label}
                  {t.count != null && (
                    <span className="ml-1.5 text-praxium-subtle/60 tabular">
                      {t.count}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Content body */}
            <div className="grid grid-cols-12 gap-px bg-praxium-line">
              {/* Left: parties + demand */}
              <div className="col-span-12 lg:col-span-4 bg-praxium-surface p-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-praxium-subtle mb-3">
                  // parties
                </div>
                <div className="space-y-2.5">
                  {[
                    {
                      role: "Plaintiff",
                      name: "John H. Smith",
                      tone: "accent",
                    },
                    { role: "Defendant", name: "Acme Logistics LLC" },
                    {
                      role: "Insurer",
                      name: "Hartford Mutual · adj. R. Cole",
                    },
                  ].map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between text-sm border-b border-praxium-line/60 pb-2"
                    >
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-praxium-subtle">
                          {p.role}
                        </div>
                        <div className="text-praxium-ink font-medium">
                          {p.name}
                        </div>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-praxium-subtle"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-[10px] font-mono uppercase tracking-[0.2em] text-praxium-subtle mb-3">
                  // demand package
                </div>
                <div className="bg-praxium-bg border border-praxium-line p-3 rounded-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-praxium-ink">
                      Demand Letter v3
                    </span>
                    <StatusPip label="Draft" tone="warning" />
                  </div>
                  <div className="mt-2 text-[11px] text-praxium-subtle leading-relaxed">
                    Generated by CoCounsel · awaiting attorney review
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button className="text-[10px] font-mono uppercase tracking-[0.15em] text-praxium-accent">
                      Open →
                    </button>
                  </div>
                </div>
              </div>

              {/* Center: activity timeline */}
              <div className="col-span-12 lg:col-span-5 bg-praxium-surface p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-praxium-subtle">
                    // recent activity
                  </div>
                  <span className="text-[10px] font-mono text-praxium-subtle">
                    today
                  </span>
                </div>
                <div className="space-y-3">
                  {ACTIVITY.map((a, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className="w-6 h-6 shrink-0 rounded-sm flex items-center justify-center text-white"
                        style={{ background: a.color }}
                      >
                        <a.icon size={12} strokeWidth={1.6} />
                      </div>
                      <div className="flex-1 min-w-0 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-praxium-ink">
                            {a.actor}
                          </span>
                          {a.ai && (
                            <StatusPip label="AI" tone="accent" />
                          )}
                          <span className="text-praxium-subtle/70 text-xs">
                            {a.text}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-praxium-subtle/70 mt-0.5">
                          {a.time} ago
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-3 border-t border-praxium-line text-[10px] font-mono uppercase tracking-[0.15em] text-praxium-accent">
                  View full timeline →
                </div>
              </div>

              {/* Right: CoCounsel mini-panel */}
              <div className="col-span-12 lg:col-span-3 bg-praxium-ink text-white p-5">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">
                  <Sparkles size={11} className="text-praxium-accent" />
                  // cocounsel
                </div>
                <div className="mt-3 text-[13px] text-white/85 leading-relaxed">
                  I noticed the IME report is due in{" "}
                  <span className="text-praxium-accent">9 days</span>. Should I
                  draft a follow-up to Dr. Patel's office?
                </div>
                <div className="mt-4 space-y-1.5">
                  <button className="w-full text-left text-[11px] font-mono uppercase tracking-[0.12em] px-2.5 py-1.5 bg-white/5 border border-white/10 hover:bg-praxium-accent/20 hover:border-praxium-accent/50 transition-colors">
                    Yes, draft it →
                  </button>
                  <button className="w-full text-left text-[11px] font-mono uppercase tracking-[0.12em] px-2.5 py-1.5 bg-white/5 border border-white/10">
                    Call instead
                  </button>
                </div>
                <div className="mt-5 pt-4 border-t border-white/10 text-[10px] font-mono text-white/40 leading-relaxed">
                  Sources: court order · billing · Dr. Patel record
                </div>
              </div>
            </div>
          </div>
        </div>
      </MockBrowserChrome>

      {/* Floating annotations */}
      <AnnotationPin
        label="Live SOL tracking"
        side="left"
        className="hidden xl:flex top-[180px] -left-2 -translate-x-full"
      />
      <AnnotationPin
        label="AI actions are auditable"
        side="right"
        className="hidden xl:flex top-[360px] -right-2 translate-x-full"
      />
    </div>
  );
}
