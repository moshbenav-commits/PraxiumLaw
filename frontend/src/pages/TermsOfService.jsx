import { Link } from "react-router-dom";
import usePageMeta from "../components/landing/usePageMeta";
import PraxiumLogo from "../components/PraxiumLogo";

export default function TermsOfService() {
  usePageMeta({
    title: "Terms of Service — Praxium Suite",
    description:
      "Terms governing use of Praxium Suite practice management software for U.S. law firms.",
  });

  return (
    <div className="min-h-screen bg-praxium-paper text-praxium-ink">
      <header className="border-b border-praxium-ink/10 px-6 py-4">
        <Link to="/" className="inline-flex items-center gap-2">
          <PraxiumLogo className="h-8" />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12 prose prose-neutral">
        <h1>Terms of Service</h1>
        <p className="text-sm text-praxium-ink/60">Last updated: June 29, 2026 · Draft — legal review pending</p>
        <p>
          These Terms govern access to Praxium Suite (praxiumlaw.com, praxahq.com, and related
          applications) operated by Expedia Solutions LLC. By using the service you agree to these
          Terms.
        </p>
        <h2>Professional use</h2>
        <p>
          Praxium Suite is business software for licensed attorneys and their staff. You are
          responsible for compliance with bar rules, client confidentiality, and applicable law in
          your jurisdiction.
        </p>
        <h2>Accounts &amp; data</h2>
        <p>
          You must provide accurate firm information. You retain ownership of matter data you upload.
          We process data to provide the service per our Privacy Policy.
        </p>
        <h2>Marketplace &amp; custom tools</h2>
        <p>
          Third-party integrations and custom tools may have additional terms. Review the Custom
          Tools Marketplace Policy (draft in repo:{" "}
          <code>PraxiumLaw/docs/CUSTOM_TOOLS_MARKETPLACE_POLICY.md</code>) before enabling
          marketplace modules.
        </p>
        <h2>Disclaimer</h2>
        <p>
          Praxium Suite is not legal advice. AI features (CoCounsel, Praxa) assist workflows only —
          attorneys must review all outputs before client use.
        </p>
        <h2>Contact</h2>
        <p>
          Questions: <a href="mailto:legal@praxiumlaw.com">legal@praxiumlaw.com</a>
        </p>
        <p>
          <Link to="/">← Back to home</Link>
        </p>
      </main>
    </div>
  );
}
