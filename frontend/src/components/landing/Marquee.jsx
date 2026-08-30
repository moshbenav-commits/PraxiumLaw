/**
 * Self-moving ticker — a continuous, pause-on-hover marquee. Used on the
 * homepage for the eight tools Praxium replaces (Site Standard: movingRail).
 * Two duplicated tracks scroll left forever; prefers-reduced-motion swaps to
 * a static wrapped row (see .praxium-marquee-track in index.css).
 */
export default function Marquee({ items, label }) {
  return (
    <div
      className="praxium-marquee border-y border-praxium-line bg-praxium-surface overflow-hidden"
      data-direction="left"
      role="group"
      aria-label={label}
    >
      <div className="praxium-marquee-track flex items-center gap-10 py-4 w-max">
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            aria-hidden={i >= items.length ? "true" : undefined}
            className="shrink-0 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-praxium-subtle"
          >
            <span className="text-praxium-accent">×</span> {item}
          </span>
        ))}
      </div>
    </div>
  );
}
