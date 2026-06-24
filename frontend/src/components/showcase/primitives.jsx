import { ArrowUpRight } from "lucide-react";

/**
 * MockBrowserChrome — minimal Safari/Chrome window frame.
 * Use to wrap product screen mockups on the landing page.
 */
export function MockBrowserChrome({
  url = "praxiumlaw.com",
  theme = "light",
  children,
  className = "",
  testId,
}) {
  const dark = theme === "dark";
  return (
    <div
      data-testid={testId}
      className={`rounded-sm overflow-hidden shadow-2xl border ${
        dark ? "border-white/10 bg-praxium-ink" : "border-praxium-line bg-praxium-surface"
      } ${className}`}
    >
      {/* Chrome bar */}
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b ${
          dark ? "border-white/10" : "border-praxium-line bg-praxium-bg/60"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/90" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90" />
        </div>
        <div
          className={`flex-1 max-w-md mx-auto text-[11px] font-mono tracking-wide px-3 py-1 rounded-sm text-center truncate ${
            dark
              ? "bg-white/5 text-white/50 border border-white/5"
              : "bg-white text-praxium-subtle border border-praxium-line"
          }`}
        >
          <span className={dark ? "text-emerald-400/70" : "text-praxium-accent/70"}>●</span>{" "}
          {url}
        </div>
        <ArrowUpRight
          size={12}
          className={dark ? "text-white/30" : "text-praxium-subtle"}
        />
      </div>
      {children}
    </div>
  );
}

/**
 * StatusPip — small uppercase mono pill, used for matter / record statuses.
 */
export function StatusPip({ label, tone = "neutral", className = "" }) {
  const tones = {
    neutral: "bg-praxium-line/60 text-praxium-subtle",
    positive: "bg-emerald-500/15 text-emerald-700",
    warning: "bg-amber-500/15 text-amber-700",
    danger: "bg-rose-500/15 text-rose-700",
    accent: "bg-praxium-accent/15 text-praxium-accent",
    live: "bg-emerald-500/15 text-emerald-700",
    dark: "bg-white/10 text-white/80",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.15em] px-2 py-0.5 rounded-sm ${tones[tone]} ${className}`}
    >
      {tone === "live" && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-glow" />
      )}
      {label}
    </span>
  );
}

/**
 * AnnotationPin — dashed-line callout with pulsing dot.
 */
export function AnnotationPin({ label, side = "right", className = "" }) {
  const sides = {
    right: "flex-row",
    left: "flex-row-reverse",
  };
  return (
    <div
      className={`absolute flex items-center gap-2 ${sides[side]} ${className}`}
    >
      <span className="relative flex items-center justify-center">
        <span className="absolute w-3 h-3 rounded-full bg-praxium-accent/40 animate-ping" />
        <span className="relative w-2 h-2 rounded-full bg-praxium-accent" />
      </span>
      <span className="w-10 border-t border-dashed border-praxium-accent/70" />
      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-praxium-accent whitespace-nowrap bg-praxium-bg px-1.5 py-0.5 border border-praxium-accent/40">
        {label}
      </span>
    </div>
  );
}

/**
 * AvatarGroup — overlapping initials avatars.
 */
export function AvatarGroup({ users = [], size = 24, dark = false }) {
  return (
    <div className="flex -space-x-1.5">
      {users.map((u, i) => (
        <div
          key={i}
          style={{ width: size, height: size, fontSize: size * 0.42 }}
          className={`rounded-full flex items-center justify-center font-display font-bold text-white ring-2 ${
            dark ? "ring-praxium-ink" : "ring-praxium-surface"
          }`}
        >
          <span
            style={{
              background: u.color || "#E85D04",
              width: "100%",
              height: "100%",
              borderRadius: "9999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {u.initials}
          </span>
        </div>
      ))}
    </div>
  );
}
