import { Navigate, Outlet, Link, NavLink } from "react-router-dom";
import { usePortal } from "@/contexts/PortalContext";
import PageLoader from "@/components/common/PageLoader";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/portal", label: "My cases", end: true },
  { to: "/portal/messages", label: "Messages" },
];

export default function PortalShell({ requireAuth = true }) {
  const { contact, firm, loading, logout, isAuthenticated } = usePortal();
  const [navOpen, setNavOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-praxium-bg" data-surface="dark">
        <PageLoader label="Loading portal…" />
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }

  return (
    <div className="min-h-screen bg-praxium-bg text-praxium-ink flex flex-col" data-surface="dark">
      <header className="border-b border-praxium-line bg-[#0f172a] text-white sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link to="/portal" className="font-display font-black tracking-tight text-sm">
              PRAXIUM <span className="text-praxium-accent">PORTAL</span>
            </Link>
            {firm?.name && (
              <div className="text-[10px] font-mono text-zinc-400 truncate">{firm.name}</div>
            )}
          </div>
          <button
            type="button"
            className="md:hidden p-2 text-zinc-300"
            onClick={() => setNavOpen((o) => !o)}
            aria-label="Menu"
          >
            {navOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm",
                    isActive ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            {contact && (
              <button
                type="button"
                onClick={logout}
                className="ml-2 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-white flex items-center gap-1"
              >
                <LogOut size={12} /> Out
              </button>
            )}
          </nav>
        </div>
        {navOpen && (
          <div className="md:hidden border-t border-white/10 px-4 py-2 space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setNavOpen(false)}
                className="block py-2 text-sm font-mono uppercase tracking-wider text-zinc-300"
              >
                {item.label}
              </Link>
            ))}
            <button type="button" onClick={logout} className="py-2 text-sm text-zinc-400 flex items-center gap-2">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-5">
        {contact && (
          <p className="text-xs text-praxium-subtle mb-4">
            Signed in as <span className="font-semibold text-praxium-ink">{contact.name}</span>
          </p>
        )}
        <Outlet />
      </main>
    </div>
  );
}
