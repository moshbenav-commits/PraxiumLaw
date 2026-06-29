import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import portalApi from "@/lib/portalApi";
import { STATUS_COLORS, STATUSES, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import PageLoader from "@/components/common/PageLoader";
import { ChevronRight, Briefcase } from "lucide-react";

export default function PortalDashboard() {
  const [matters, setMatters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApi
      .get("/portal/matters")
      .then((r) => setMatters(r.data.items || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader label="Loading your cases…" />;

  return (
    <div>
      <div className="overline mb-2">// your matters</div>
      <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
        <Briefcase className="text-praxium-accent" size={22} />
        My cases
      </h1>
      <p className="text-sm text-praxium-subtle mt-1">Read-only view of matters your firm shared with you.</p>

      {matters.length === 0 ? (
        <div className="mt-6 data-card p-6 text-sm text-praxium-subtle">
          No cases are shared with your portal yet. Contact your firm if you expected access here.
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {matters.map((m) => (
            <li key={m.id}>
              <Link
                to={`/portal/matters/${m.id}`}
                className="data-card p-4 flex items-center gap-3 hover:border-praxium-accent transition-colors block"
                data-testid={`portal-matter-${m.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] text-praxium-subtle">{m.case_number}</div>
                  <div className="font-semibold truncate">{m.title}</div>
                  <div className="text-xs text-praxium-subtle mt-1">Updated {formatDate(m.updated_at)}</div>
                </div>
                <span className={cn("status-pip border text-[10px] shrink-0", STATUS_COLORS[m.status])}>
                  {STATUSES.includes(m.status) ? m.status : m.status}
                </span>
                <ChevronRight size={16} className="text-praxium-subtle shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
