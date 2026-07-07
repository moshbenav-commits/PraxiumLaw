import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy — Praxium Law",
  robots: { index: true, follow: true },
};

/** Forge legal stub — Phase 20 · edit wired/legal/privacy-policy.mdx source */
export default function LegalPage() {
  return (
    <article className="forge-legal" data-legal="privacy-policy">
      <h1 className="forge-h1">Privacy Policy</h1>
      <section className="forge-legal-section">
        <h2>Privacy Policy</h2>
        <p>Praxium Law · Effective 2026-06-30</p>
      </section>
      <section className="forge-legal-section">
        <h2>Overview</h2>
        <p>This privacy policy describes how Praxium Law ("we", "us") collects, uses, and protects information when you visit https://www.praxiumlaw.com or use our services.</p>
      </section>
      <section className="forge-legal-section">
        <h2>Information we collect</h2>
        <p>- Contact information you submit through forms (name, email, phone).
- Usage data such as pages viewed, device type, and approximate location (via analytics when enabled).
- Cookies required for site function and, with consent, analytics.</p>
      </section>
      <section className="forge-legal-section">
        <h2>How we use information</h2>
        <p>We use collected information to respond to inquiries, deliver services, improve the site, and comply with legal obligations. We do not sell personal information.</p>
      </section>
      <section className="forge-legal-section">
        <h2>Your choices</h2>
        <p>You may request access, correction, or deletion of personal data by contacting accessibility@praxiumlaw.com.</p>
      </section>
      <section className="forge-legal-section">
        <h2>Updates</h2>
        <p>We may update this policy by posting a revised version on this page with a new effective date.</p>
      </section>
      <section className="forge-legal-section">
        <h2>Contact</h2>
        <p>Questions: accessibility@praxiumlaw.com</p>
      </section>
    </article>
  );
}
