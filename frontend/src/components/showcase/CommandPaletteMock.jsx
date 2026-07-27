import { Command, Briefcase, Sparkles, Users, FileText, Phone } from "lucide-react";

const GROUPS = [
  {
    label: "Matters",
    items: [
      {
        icon: Briefcase,
        title: "Smith v. Acme Logistics",
        sub: "M-2026-0034 · Discovery · $1.45M",
        kbd: "↵",
        active: true,
      },
      {
        icon: Briefcase,
        title: "Smithers Estate Probate",
        sub: "M-2026-0019 · Closed",
      },
    ],
  },
  {
    label: "Actions",
    items: [
      {
        icon: Sparkles,
        title: "Generate demand letter for current matter",
        sub: "AI · uses MedConnect billing + Dr. Patel IME",
        kbd: "⌘ D",
      },
      {
        icon: Phone,
        title: "Call John Smith on VoxLine",
        sub: "+1 (305) 555-0142 · auto-log to matter",
        kbd: "⌘ C",
      },
    ],
  },
  {
    label: "Contacts",
    items: [
      {
        icon: Users,
        title: "Dr. Sarah Smith, M.D.",
        sub: "Orthopedic provider · MedConnect",
      },
      {
        icon: FileText,
        title: "MRI Report — 10/12/2025",
        sub: "8mm L5-S1 disc extrusion",
      },
    ],
  },
];

export default function CommandPaletteMock() {
  return (
    <div className="bg-praxium-ink rounded-sm shadow-2xl overflow-hidden border border-white/10">
      {/* Chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/90" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90" />
        <div className="flex-1 text-center text-[10px] font-mono text-white/60">
          ⌘ K · command palette
        </div>
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
        <Command size={14} className="text-praxium-accent" />
        <span className="text-white font-mono text-sm">sm</span>
        <span className="w-px h-4 bg-praxium-accent animate-pulse" />
        <span className="text-white/60 font-mono text-sm">
          ith demand letter…
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-white/5 border border-white/10 text-white/50">
            esc
          </kbd>
        </div>
      </div>

      {/* Groups */}
      <div className="max-h-[440px] py-2">
        {GROUPS.map((g) => (
          <div key={g.label} className="px-2">
            <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">
              // {g.label.toLowerCase()}
            </div>
            <div className="space-y-0.5">
              {g.items.map((it, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-sm cursor-pointer ${
                    it.active
                      ? "bg-white/10 text-white border-l-2 border-praxium-accent"
                      : "text-white/70 hover:bg-white/5"
                  }`}
                >
                  <it.icon
                    size={14}
                    strokeWidth={1.6}
                    className={it.active ? "text-white" : "text-white/50"}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {it.title}
                    </div>
                    <div
                      className={`text-[11px] font-mono mt-0.5 truncate ${
                        it.active ? "text-white/70" : "text-white/60"
                      }`}
                    >
                      {it.sub}
                    </div>
                  </div>
                  {it.kbd && (
                    <kbd
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm shrink-0 ${
                        it.active
                          ? "bg-white/15 text-white"
                          : "bg-white/5 border border-white/10 text-white/50"
                      }`}
                    >
                      {it.kbd}
                    </kbd>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/60">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded-sm">
              ↑↓
            </kbd>{" "}
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded-sm">
              ↵
            </kbd>{" "}
            select
          </span>
        </div>
        <span>21 results · 0.04s</span>
      </div>
    </div>
  );
}
