import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import portalApi from "@/lib/portalApi";
import PageLoader from "@/components/common/PageLoader";
import { formatDate } from "@/lib/utils";

/**
 * The settlement page a client sees after login, and ONLY when the server says
 * the matter has a client-facing settlement (attorney-approved scenario, no
 * medical reduction still pending). Anything else redirects back to the matter —
 * there is no "not yet" version of this page.
 *
 * Ricardo (Gold Medal Injury, 2026-09-04): the firm's attorneys — Randy pointing,
 * the two attorneys standing at the desk — and the line "We get you the gold."
 * The image and caption come from the FIRM's settings (settlement_celebration),
 * so each firm's own people appear only for that firm's clients. The caption is
 * HTML text, never text inside the picture.
 */
function money(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function PortalSettlement() {
  const { id } = useParams();
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Never index a client's settlement — this route is behind the portal token,
    // but belt-and-braces for any crawler that lands on the SPA shell.
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    const prevTitle = document.title;
    document.title = "Your settlement";
    return () => {
      document.head.removeChild(meta);
      document.title = prevTitle;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    portalApi
      .get(`/portal/matters/${id}/settlement`)
      .then((r) => alive && setView(r.data))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) return <Navigate to={`/portal/matters/${id}`} replace />;
  if (!view) return <PageLoader label="Loading…" />;
  if (!view.ready) return <Navigate to={`/portal/matters/${id}`} replace />;

  const { celebration, summary, matter, firm } = view;

  return (
    <div className="portal-settlement">
      <Link
        to={`/portal/matters/${id}`}
        className="text-xs font-mono text-praxium-subtle hover:text-praxium-accent flex items-center gap-1 mb-3"
      >
        <ChevronLeft size={12} /> Back to your case
      </Link>

      <section className="data-card overflow-hidden" aria-labelledby="settlement-heading">
        {celebration?.image_url ? (
          <figure className="m-0">
            <div className="aspect-[16/9] w-full bg-black/5">
              <img
                src={celebration.image_url}
                alt={celebration.image_alt || `${firm?.name || "Your firm"} — your legal team`}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
            <figcaption className="px-5 pt-5 text-center">
              <p
                id="settlement-heading"
                className="font-display font-black text-2xl sm:text-4xl tracking-tight"
                style={{ color: "var(--settlement-accent, #D4AF37)" }}
              >
                {celebration.caption}
              </p>
            </figcaption>
          </figure>
        ) : (
          <div className="px-5 pt-6 text-center">
            <p id="settlement-heading" className="font-display font-black text-2xl sm:text-4xl tracking-tight">
              {celebration?.caption}
            </p>
          </div>
        )}

        <div className="px-5 pb-6 pt-4 text-center">
          <p className="text-sm text-praxium-subtle">
            {firm?.name ? `${firm.name} — ` : ""}
            {matter?.title}
            {matter?.case_number ? ` · ${matter.case_number}` : ""}
          </p>
          {celebration?.note ? <p className="mt-3 text-sm max-w-xl mx-auto">{celebration.note}</p> : null}
        </div>
      </section>

      <section className="data-card p-5 mt-4" aria-label="Settlement summary">
        <h2 className="font-display font-bold text-sm uppercase tracking-wider text-praxium-subtle">
          Your settlement
          {summary?.approved_at ? (
            <span className="font-mono text-[10px] normal-case tracking-normal ml-2">
              approved {formatDate(summary.approved_at)}
            </span>
          ) : null}
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <Row label="Gross settlement" value={money(summary?.gross_settlement)} />
          <Row label="Attorney fee" value={`− ${money(summary?.attorney_fee)}`} />
          <Row label="Case expenses" value={`− ${money(summary?.expenses)}`} />
          <Row label="Medical bills paid" value={`− ${money(summary?.medical_payout)}`} />
          {Number(summary?.medical_reductions) > 0 ? (
            <Row label="Medical reductions negotiated for you" value={money(summary?.medical_reductions)} />
          ) : null}
          {Number(summary?.medpay_to_client) > 0 ? (
            <Row label="MedPay to you" value={`+ ${money(summary?.medpay_to_client)}`} />
          ) : null}
        </dl>
        <div className="mt-4 border-t border-praxium-line pt-4 flex items-baseline justify-between">
          <span className="font-display font-bold">To you</span>
          <span className="font-display font-black text-2xl">{money(summary?.net_to_client)}</span>
        </div>
        <p className="mt-4 text-[11px] text-praxium-subtle">
          Figures reflect the settlement your attorney approved and may change until disbursement is
          complete. Your final settlement statement is the controlling document.
        </p>
      </section>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-praxium-line pb-2">
      <dt className="text-sm text-praxium-subtle">{label}</dt>
      <dd className="font-mono text-sm">{value}</dd>
    </div>
  );
}
