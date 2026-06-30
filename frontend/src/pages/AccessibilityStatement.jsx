import { Link } from "react-router-dom";
import usePageMeta from "../components/landing/usePageMeta";
import PraxiumLogo from "../components/PraxiumLogo";

export default function AccessibilityStatement() {
  usePageMeta({
    title: "Accessibility Statement — Praxium Suite",
    description:
      "Praxium Suite accessibility commitment, WCAG 2.1 AA goals, and how to report barriers.",
  });

  return (
    <div className="min-h-screen bg-praxium-paper text-praxium-ink">
      <header className="border-b border-praxium-ink/10 px-6 py-4">
        <Link to="/" className="inline-flex items-center gap-2">
          <PraxiumLogo className="h-8" />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12 prose prose-neutral">
        <h1>Accessibility Statement</h1>
        <p className="text-sm text-praxium-ink/60">
          <strong>Praxium Law</strong> · Last updated 2026-06-30 · Draft — legal review pending
        </p>
        <h2>Commitment</h2>
        <p>
          <strong>Praxium Law</strong> is committed to ensuring digital accessibility for people with
          disabilities. We continually improve the user experience for everyone and apply relevant
          accessibility standards.
        </p>
        <h2>Conformance status</h2>
        <p>
          We aim to conform to <strong>WCAG 2.1 Level AA</strong> where feasible. This site is{" "}
          <strong>partially conformant</strong> — some content or third-party embeds may not yet meet
          all criteria.
        </p>
        <h2>Measures</h2>
        <ul>
          <li>Semantic HTML and heading structure on Forge-generated pages.</li>
          <li>
            Sufficient color contrast on primary templates (verify per brand theme before launch).
          </li>
          <li>Keyboard navigation for core flows (navigation, forms, CTAs).</li>
          <li>Text alternatives for meaningful images (complete during content + asset pass).</li>
        </ul>
        <h2>Feedback</h2>
        <p>
          If you encounter accessibility barriers on{" "}
          <a href="https://www.praxiumlaw.com">https://www.praxiumlaw.com</a>, contact us at{" "}
          <a href="mailto:legal@praxiumlaw.com">legal@praxiumlaw.com</a> with the page URL and a
          description of the issue. We respond within <strong>5 business days</strong>.
        </p>
        <h2>Assessment approach</h2>
        <p>
          Self-assessment and pre-launch QA. Formal third-party audit recommended before
          regulated-industry launch.
        </p>
        <p>
          <Link to="/">← Back to home</Link>
        </p>
      </main>
    </div>
  );
}
