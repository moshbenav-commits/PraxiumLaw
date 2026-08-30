import { Check } from "lucide-react";

/**
 * Shared trust-signal rail — the same three real, verified facts everywhere
 * they appear (SITE_DIRECTION_PACK.json ctaPrimary "Start 30 days free"):
 * no card required, free Filevine migration, 90-day money back. Extracted
 * from SignupBanner so the self-serve trial's real proof points can sit
 * next to any primary CTA, not just the mid-page program banner.
 */
const CLAIMS = [
  "No card required",
  "Free migration from Filevine",
  "90-day money back",
];

export default function TrustStrip({ className = "", tone = "light" }) {
  const textClass = tone === "dark" ? "text-white/60" : "text-praxium-ink/60";
  const iconClass = "text-praxium-accent";

  return (
    <div
      className={`flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono ${textClass} ${className}`}
      data-testid="trust-strip"
    >
      {CLAIMS.map((claim) => (
        <span key={claim} className="flex items-center gap-1.5">
          <Check size={12} className={iconClass} /> {claim}
        </span>
      ))}
    </div>
  );
}
