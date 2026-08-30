import { Link } from "react-router-dom";
import { CreytixPartnerLockup } from "../components/CreytixPartnerLockup";
import usePageMeta from "../components/landing/usePageMeta";

export default function PartneredWithCreytix() {
  usePageMeta({
    title: "Partnered with Creytix | Praxium Law",
    description:
      "Praxium Law is partnered with Creytix — the planning-first platform behind design, creative, and ops.",
  });

  return (
    <main className="min-h-screen bg-praxium-ink text-white px-6 py-16" data-surface="dark">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm font-mono uppercase tracking-wider text-white/50">Partnership</p>
        <h1 className="mt-3 font-display text-4xl font-black tracking-tight">Partnered with Creytix</h1>
        <div className="mt-10">
          <CreytixPartnerLockup partnerName="Praxium Law" />
        </div>
        <p className="mt-8 text-lg text-white/80">
          Praxium is built and operated with Creytix — the platform, design, and operations partner
          behind the product. That partnership is why a law firm gets enterprise-grade software
          without enterprise-grade overhead.
        </p>
        <ul className="mt-6 list-disc space-y-2 pl-5 text-white/70 text-sm">
          <li>One practice-management platform, continuously improved</li>
          <li>Connected tools for mail, scheduling, and e-sign</li>
          <li>A design partner behind every screen your firm touches</li>
        </ul>
        <div className="mt-12 flex flex-wrap gap-4">
          <a
            href="https://creytix.com"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-praxium-ink"
          >
            Visit Creytix
          </a>
          <a
            href="https://creytix.com/customers"
            className="rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold"
          >
            See who runs on Creytix
          </a>
          <Link to="/" className="px-2 py-2.5 text-sm text-white/55 underline-offset-2 hover:underline">
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
