import { Link } from "react-router-dom";

const sizes = {
  sm: { mark: "w-7 h-7 text-sm", word: "text-[15px]", sub: "text-[9px]" },
  md: { mark: "w-8 h-8 text-base", word: "text-base", sub: null },
  lg: { mark: "w-9 h-9 text-lg", word: "text-lg", sub: null },
};

/**
 * Shared Praxium B2B mark — π square + PRAXIUM wordmark.
 * SSOT SVG: brand/praxium-law/references/logo/praxium-logo-wordmark.svg
 */
export default function PraxiumLogo({
  to = "/",
  size = "md",
  variant = "light",
  showSubtitle = false,
  className = "",
  testId = "praxium-logo",
}) {
  const s = sizes[size] ?? sizes.md;
  const isDark = variant === "dark";
  const wordClass = isDark ? "text-white" : "text-praxium-ink";
  const subClass = isDark ? "text-zinc-500" : "text-praxium-subtle";

  const inner = (
    <div className={`flex items-center gap-2.5 ${className}`} data-testid={testId}>
      <div
        className={`${s.mark} rounded-sm bg-praxium-accent flex items-center justify-center font-display font-black text-white shrink-0`}
        aria-hidden
      >
        π
      </div>
      <div className="leading-none">
        <div className={`font-display font-black tracking-tight ${s.word} ${wordClass}`}>PRAXIUM</div>
        {showSubtitle && s.sub && (
          <div className={`${s.sub} font-mono uppercase tracking-[0.25em] ${subClass} mt-0.5`}>
            suite · praxiumlaw.com
          </div>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-praxium-accent">
        {inner}
      </Link>
    );
  }
  return inner;
}
