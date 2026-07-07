import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service — Praxium Law",
  robots: { index: true, follow: true },
};

/** Forge legal stub — Phase 20 · edit wired/legal/terms-of-service.mdx source */
export default function LegalPage() {
  return (
    <article className="forge-legal" data-legal="terms-of-service">
      <h1 className="forge-h1">Terms of Service</h1>
      <section className="forge-legal-section">
        <h2>Terms of Service</h2>
        <p>Praxium Law · Effective 2026-06-30</p>
      </section>
      <section className="forge-legal-section">
        <h2>Agreement</h2>
        <p>By accessing https://www.praxiumlaw.com or using services provided by Praxium Law, you agree to these terms.</p>
      </section>
      <section className="forge-legal-section">
        <h2>Services</h2>
        <p>We provide the services described on our site. Features, pricing, and availability may change with notice posted on the site or by email where applicable.</p>
      </section>
      <section className="forge-legal-section">
        <h2>Acceptable use</h2>
        <p>You agree not to misuse the site, attempt unauthorized access, or interfere with other users.</p>
      </section>
      <section className="forge-legal-section">
        <h2>Disclaimers</h2>
        <p>Services are provided "as is" to the extent permitted by law. We disclaim warranties not required by applicable law.</p>
      </section>
      <section className="forge-legal-section">
        <h2>Limitation of liability</h2>
        <p>To the maximum extent permitted by law, Praxium Law is not liable for indirect or consequential damages arising from use of the site.</p>
      </section>
      <section className="forge-legal-section">
        <h2>Changes</h2>
        <p>We may modify these terms by posting an updated version. Continued use after changes constitutes acceptance.</p>
      </section>
      <section className="forge-legal-section">
        <h2>Contact</h2>
        <p>accessibility@praxiumlaw.com</p>
      </section>
    </article>
  );
}
