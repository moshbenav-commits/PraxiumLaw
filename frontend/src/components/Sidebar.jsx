import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, Users, FileText, CheckSquare, Calendar,
  MessageSquare, Stethoscope, Scale, BarChart3, Inbox, Settings, Sparkles,
  Network, ScrollText, Phone, X, GraduationCap, AlertTriangle, Gavel, Receipt,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn, initials } from "@/lib/utils";
import PraxiumLogo from "./PraxiumLogo";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/matters", label: "Matters", icon: Briefcase, testid: "nav-matters" },
  { to: "/contacts", label: "Contacts", icon: Users, testid: "nav-contacts" },
  { to: "/inbox", label: "Universal Inbox", icon: Inbox, testid: "nav-inbox" },
  { to: "/training", label: "Training", icon: GraduationCap, testid: "nav-training" },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, testid: "nav-tasks" },
  { to: "/calendar", label: "Calendar", icon: Calendar, testid: "nav-calendar" },
  { to: "/chat", label: "CaseChat", icon: MessageSquare, testid: "nav-chat" },
  { to: "/documents", label: "Documents", icon: FileText, testid: "nav-documents" },
  { to: "/medconnect", label: "MedConnect", icon: Stethoscope, testid: "nav-medconnect" },
  { to: "/courtconnect", label: "CourtConnect", icon: Scale, testid: "nav-courtconnect" },
  { to: "/esign", label: "NativeSign", icon: ScrollText, testid: "nav-esign" },
  { to: "/voxline", label: "VoxLine", icon: Phone, testid: "nav-voxline" },
  { to: "/marketplace", label: "LawMatch", icon: Network, testid: "nav-marketplace" },
  { to: "/reports", label: "Reports", icon: BarChart3, testid: "nav-reports" },
  { to: "/exceptions", label: "Exceptions", icon: AlertTriangle, testid: "nav-exceptions" },
  { to: "/citations", label: "Citations", icon: Gavel, testid: "nav-citations" },
  { to: "/billing", label: "Billing", icon: Receipt, testid: "nav-billing" },
];

export default function Sidebar({ onAiToggle, mobileOpen, onClose }) {
  const { user, firm } = useAuth();

  const panel = (
    <>
      <div className="px-4 py-4 border-b border-white/10 flex items-start justify-between gap-2">
        <div>
          <PraxiumLogo to={null} size="sm" variant="dark" showSubtitle testId="sidebar-logo" />
          {firm && (
            <div className="mt-3 text-xs text-zinc-400 truncate" data-testid="sidebar-firm-name">{firm.name}</div>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1 text-zinc-400 hover:text-white"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            data-testid={item.testid}
            className={({ isActive }) => cn("sb-item", isActive && "sb-item-active")}
          >
            <item.icon size={15} strokeWidth={1.8} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-2 pb-2">
        <button
          onClick={onAiToggle}
          data-testid="sidebar-ai-toggle"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm bg-praxium-accent hover:bg-praxium-accent-hover transition-colors text-white font-display font-bold text-xs uppercase tracking-wide"
        >
          <Sparkles size={15} />
          <span>CoCounsel AI</span>
          <span className="ml-auto text-[9px] font-mono opacity-70">⌘J</span>
        </button>
      </div>

      <div className="border-t border-white/10 p-3 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-sm bg-white/10 flex items-center justify-center text-xs font-bold font-display">
          {initials(user?.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white truncate" data-testid="sidebar-user-name">{user?.name}</div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{user?.role}</div>
        </div>
        <NavLink to="/settings" onClick={onClose} className="text-zinc-400 hover:text-white" data-testid="sidebar-settings">
          <Settings size={14} />
        </NavLink>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-praxium-sidebar text-praxium-sidebar-ink flex-col shrink-0 border-r border-black/40">
        {panel}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu overlay"
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-praxium-sidebar text-praxium-sidebar-ink flex flex-col shadow-2xl">
            {panel}
          </aside>
        </>
      )}
    </>
  );
}
