import { Search, Sparkles, Command, Bell, Menu } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function TopBar({ onPaletteOpen, onAiToggle, onNavOpen }) {
  const loc = useLocation();
  const crumb = loc.pathname.split("/").filter(Boolean).join(" / ") || "dashboard";
  return (
    <header className="h-12 border-b border-praxium-line bg-praxium-surface flex items-center justify-between px-3 md:px-4 shrink-0 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onNavOpen}
          className="lg:hidden flex items-center justify-center w-8 h-8 border border-praxium-line rounded-sm hover:bg-praxium-bg text-praxium-ink shrink-0"
          aria-label="Open navigation"
          data-testid="topbar-menu"
        >
          <Menu size={16} />
        </button>
        <div className="min-w-0 truncate">
          <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-[0.25em] text-praxium-subtle">
            praxium /
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-praxium-ink font-semibold sm:ml-2" data-testid="topbar-breadcrumb">
            {crumb}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        <button
          onClick={onPaletteOpen}
          data-testid="topbar-search"
          className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-praxium-line rounded-sm hover:bg-praxium-bg text-xs font-mono text-praxium-subtle min-w-[200px] lg:min-w-[280px]"
        >
          <Search size={13} />
          <span className="truncate">Search matters, contacts…</span>
          <span className="ml-auto flex items-center gap-0.5 text-[10px] shrink-0">
            <Command size={10} />
            <span>K</span>
          </span>
        </button>
        <button
          onClick={onPaletteOpen}
          data-testid="topbar-search-mobile"
          className="md:hidden flex items-center justify-center w-8 h-8 border border-praxium-line rounded-sm hover:bg-praxium-bg text-praxium-ink"
          aria-label="Search"
        >
          <Search size={14} />
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
          className="hidden sm:flex items-center justify-center w-8 h-8 border border-praxium-line rounded-sm hover:bg-praxium-bg text-praxium-ink"
          data-testid="topbar-notifications"
          aria-label="Notifications"
        >
          <Bell size={14} />
        </button>
      </div>
    </header>
  );
}
