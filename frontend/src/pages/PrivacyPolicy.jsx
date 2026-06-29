import { Link } from "react-router-dom";
import usePageMeta from "../components/landing/usePageMeta";
import PraxiumLogo from "../components/PraxiumLogo";

export default function PrivacyPolicy() {
  usePageMeta({
    title: "Privacy Policy — Praxium Suite",
    description: "How Praxium Suite collects, uses, and protects firm and client data.",
  });

  return (
    <div className="min-h-screen bg-praxium-paper text-praxium-ink">
      <header className="border-b border-praxium-ink/10 px-6 py-4">
        <Link to="/" className="inline-flex items-center gap-2">
          <PraxiumLogo className="h-8" />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12 prose prose-neutral">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-praxium-ink/60">Last updated: June 29, 2026 · Draft — legal review pending</p>
        <p>
          Praxium Suite respects attorney-client privilege obligations. This policy describes how we
          handle personal information for firm users, clients, and website visitors.
        </p>
        <h2>Information we collect</h2>
        <ul>
          <li>Account and firm profile data (name, email, bar information)</li>
          <li>Matter, contact, document, and communication metadata you store in the product</li>
          <li>Usage logs, support tickets, and security audit events</li>
          <li>Identity verification media when you use our IDV flow (encrypted, access-controlled)</li>
        </ul>
        <h2>How we use information</h2>
        <p>
          We use data to operate the service, provide support, improve security, and bill
          subscriptions. We do not sell personal information. AI features process data only to deliver
          requested outputs within your workspace.
        </p>
        <h2>Retention &amp; security</h2>
        <p>
          Data is stored in encrypted databases with role-based access. You may export or delete
          matter data subject to your firm retention policies and applicable law.
        </p>
        <h2>Contact</h2>
        <p>
          Privacy requests: <a href="mailto:privacy@praxiumlaw.com">privacy@praxiumlaw.com</a>
        </p>
        <p>
          <Link to="/">← Back to home</Link>
        </p>
      </main>
    </div>
  );
}
