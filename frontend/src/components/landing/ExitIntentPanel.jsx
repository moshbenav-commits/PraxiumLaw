import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, X } from "lucide-react";
import TrustStrip from "./TrustStrip";

const SESSION_KEY = "praxium-exit-intent-shown-v1";

function alreadyShown() {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    // sessionStorage unavailable (private mode) — fail open and just show it
    return false;
  }
}

function markShown() {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // best-effort only
  }
}

/**
 * Homepage exit-intent panel — one concrete, real offer: the same "Start 30
 * days free" self-serve trial that's the only signup program on the site
 * (SITE_DIRECTION_PACK.json ctaPrimary), never an invented discount. Fires
 * once per browser session when the cursor leaves toward the top of the
 * viewport (the classic "heading for the tab bar / back button" signal),
 * and is fully dismissible.
 */
export default function ExitIntentPanel() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alreadyShown()) return;

    function handleMouseOut(e) {
      const leavingTopEdge = !e.relatedTarget && !e.toElement && e.clientY <= 0;
      if (!leavingTopEdge) return;
      markShown();
      setVisible(true);
      document.removeEventListener("mouseout", handleMouseOut);
    }

    document.addEventListener("mouseout", handleMouseOut);
    return () => document.removeEventListener("mouseout", handleMouseOut);
  }, []);

  useEffect(() => {
    if (!visible) return;
    function handleKey(e) {
      if (e.key === "Escape") setVisible(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6 bg-praxium-ink/60 backdrop-blur-sm animate-fade-in"
      data-testid="exit-intent-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-heading"
      onClick={(e) => {
        if (e.target === e.currentTarget) setVisible(false);
      }}
    >
      <div className="relative w-full max-w-lg bg-praxium-bg border border-praxium-line rounded-sm p-8 lg:p-10 shadow-2xl">
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Close"
          data-testid="exit-intent-dismiss"
          className="absolute top-4 right-4 text-praxium-subtle hover:text-praxium-ink transition-colors"
        >
          <X size={18} />
        </button>
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-praxium-accent-text mb-4">
          // before you go // 30 days free
        </div>
        <h2 id="exit-intent-heading" className="font-display font-black tracking-[-0.03em] leading-[0.95] text-3xl lg:text-4xl">
          Start 30 days free.
        </h2>
        <p className="mt-4 text-sm text-praxium-ink/70 leading-relaxed">
          No card required. See the same $86,000-a-year math for your firm before you decide.
        </p>
        <TrustStrip className="mt-6" />
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            to="/signup"
            data-testid="exit-intent-cta"
            onClick={() => setVisible(false)}
            className="group bg-praxium-accent-hover text-white px-7 py-3.5 rounded-full text-sm font-mono uppercase tracking-[0.15em] hover:bg-praxium-accent transition-colors flex items-center gap-3"
          >
            Start 30 days free <ArrowUpRight size={16} className="group-hover:rotate-45 transition-transform" />
          </Link>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="text-xs font-mono uppercase tracking-[0.15em] text-praxium-subtle hover:text-praxium-ink transition-colors"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
