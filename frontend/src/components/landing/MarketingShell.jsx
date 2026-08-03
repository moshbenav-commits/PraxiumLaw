import { Link } from "react-router-dom";
import PraxiumLogo from "../PraxiumLogo";
import LandingMobileNav from "./LandingMobileNav";

/** Shared header + footer for secondary marketing pages (currently: solutions). */
export default function MarketingShell({ children }) {
  return (
    <div className="min-h-screen bg-praxium-bg text-praxium-ink">
      <header className="sticky top-0 z-50 bg-praxium-bg/85 backdrop-blur-xl border-b border-praxium-line">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <PraxiumLogo to="/" size="md" testId="mkt-logo" />
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/solutions" className="px-3 py-1.5 text-xs font-mono uppercase tracking-[0.15em] text-praxium-subtle hover:text-praxium-ink transition-colors">Solutions</Link>
            <Link to="/pricing" className="px-3 py-1.5 text-xs font-mono uppercase tracking-[0.15em] text-praxium-subtle hover:text-praxium-ink transition-colors">Pricing</Link>
            <Link to="/login" className="px-3 py-1.5 text-xs font-mono uppercase tracking-[0.15em] hover:text-praxium-accent transition-colors">Sign in</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/signup" className="hidden md:inline-flex bg-praxium-ink text-white px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-[0.15em] hover:bg-praxium-accent transition-colors">
              Start free
            </Link>
            <LandingMobileNav />
          </div>
        </div>
      </header>

      {children}

      <footer className="bg-praxium-ink text-white border-t border-white/10 mt-24">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-praxium-accent flex items-center justify-center font-display font-black text-white text-sm rounded-sm">π</div>
              <span className="font-display font-black tracking-tight">PRAXIUM SUITE</span>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
              <Link to="/solutions" className="hover:text-praxium-accent transition-colors">Solutions</Link>
              <Link to="/pricing" className="hover:text-praxium-accent transition-colors">Pricing</Link>
              <Link to="/praxa" className="hover:text-praxium-accent transition-colors">Praxa</Link>
              <Link to="/signup" className="hover:text-praxium-accent transition-colors">Start free</Link>
              <Link to="/terms" className="hover:text-praxium-accent transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-praxium-accent transition-colors">Privacy</Link>
            </nav>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 text-[11px] font-mono text-white/40">
            <p>© 2026 Praxium Suite · praxiumlaw.com · Praxium is technology for law firms — not a law firm, and not legal advice.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
