import { Search, Sparkles, Command, Bell } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function TopBar({ onPaletteOpen, onAiToggle }) {
  const loc = useLocation();
  const crumb = loc.pathname.split("/").filter(Boolean).join(" / ") || "dashboard";
  return (
    <header className="h-12 border-b border-praxium-line bg-praxium-surface flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-praxium-subtle">
          praxium /
        </span>
        <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-praxium-ink font-semibold" data-testid="topbar-breadcrumb">
          {crumb}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onPaletteOpen}
          data-testid="topbar-search"
          className="flex items-center gap-2 px-3 py-1.5 border border-praxium-line rounded-sm hover:bg-praxium-bg text-xs font-mono text-praxium-subtle min-w-[280px]"
        >
          <Search size={13} />
          <span>Search matters, contacts, documents...</span>
          <span className="ml-auto flex items-center gap-0.5 text-[10px]">
            <Command size={10} />
            <span>K</span>
          </span>
        </button>
        <button
          onClick={onAiToggle}
          data-testid="topbar-ai"
          className="flex items-center justify-center w-8 h-8 border border-praxium-line rounded-sm hover:bg-praxium-bg text-praxium-ink"
          title="CoCounsel AI (⌘J)"
        >
          <Sparkles size={14} />
        </button>
        <button
          className="flex items-center justify-center w-8 h-8 border border-praxium-line rounded-sm hover:bg-praxium-bg text-praxium-ink"
          data-testid="topbar-notifications"
        >
          <Bell size={14} />
        </button>
      </div>
    </header>
  );
}
