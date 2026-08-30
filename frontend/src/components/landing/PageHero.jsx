import ScrollReveal from "./ScrollReveal";

/**
 * Shared per-route marketing page hero — overline + display headline +
 * lede paragraph, the same three-part pattern About/Contact/Solutions/
 * Pricing/SolutionDetail already each hand-rolled with slightly different
 * markup. One named component (Site Asset Kit Tier 3: page heroes) instead
 * of five near-duplicates; `children` carries anything a page adds below
 * the lede (a CTA row, a back-link, a status pill).
 */
export default function PageHero({
  above,
  overline,
  // Full replacement, not appended (see titleClassName/descriptionClassName
  // note below) — SolutionDetail's kicker+status-pill row needs its own
  // flex/gap/margin, not the plain-string default's mb-6.
  overlineClassName = "mb-6",
  title,
  description,
  // Full replacement, not appended, for both class props below — pages
  // differ enough in tracking/leading/size/lede-width (Pricing's looser
  // tracking, Contact's shorter lede) that merging would fight the default
  // via Tailwind's cascade order instead of cleanly overriding it.
  titleClassName = "tracking-[-0.04em] leading-[0.9] text-5xl lg:text-7xl max-w-4xl",
  descriptionClassName = "mt-8 text-lg lg:text-xl text-praxium-ink/70 max-w-2xl leading-relaxed",
  children,
}) {
  return (
    <ScrollReveal>
      {above}
      {overline && <div className={`overline ${overlineClassName}`}>{overline}</div>}
      <h1 className={`font-display font-black ${titleClassName}`} data-testid="page-hero-title">
        {title}
      </h1>
      {description && <p className={descriptionClassName}>{description}</p>}
      {children}
    </ScrollReveal>
  );
}
