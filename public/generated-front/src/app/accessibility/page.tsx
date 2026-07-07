import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description: "Accessibility Statement — Praxium Law",
  robots: { index: true, follow: true },
};

/** Forge legal stub — Phase 20 · edit wired/legal/accessibility-statement.mdx source */
export default function LegalPage() {
  return (
    <article className="forge-legal" data-legal="accessibility-statement">
      <h1 className="forge-h1">Accessibility Statement</h1>
      <section className="forge-legal-section">
        <h2>Accessibility Statement</h2>
        <p>Praxium Law · Last updated 2026-06-30</p>
      </section>
      <section className="forge-legal-section">
        <h2>Commitment</h2>
        <p>Praxium Law is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply relevant accessibility standards.</p>
      </section>
      <section className="forge-legal-section">
        <h2>Conformance status</h2>
        <p>We aim to conform to WCAG 2.1 Level AA where feasible. This site is partially conformant — some content or third-party embeds may not yet meet all criteria.</p>
      </section>
      <section className="forge-legal-section">
        <h2>Measures</h2>
        <p>- Semantic HTML and heading structure on Forge-generated pages.
- Sufficient color contrast on primary templates (verify per brand theme before launch).
- Keyboard navigation for core flows (navigation, forms, CTAs).
- Text alternatives for meaningful images (complete during content + asset pass).</p>
      </section>
      <section className="forge-legal-section">
        <h2>Feedback</h2>
        <p>If you encounter accessibility barriers on https://www.praxiumlaw.com, contact us at accessibility@praxiumlaw.com with the page URL and a description of the issue. We respond within 5 business days.</p>
      </section>
      <section className="forge-legal-section">
        <h2>Assessment approach</h2>
        <p>Self-assessment and pre-launch QA. Formal third-party audit recommended before regulated-industry launch.</p>
      </section>
    </article>
  );
}
