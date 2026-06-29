import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Settings as SettingsIcon, LogOut, Users } from "lucide-react";
import CopyButton from "@/components/common/CopyButton";
import PageLoader from "@/components/common/PageLoader";

export default function Settings() {
  const { user, firm, logout } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/team")
      .then((r) => setTeam(r.data))
      .finally(() => setLoading(false));
  }, []);

  const intakeUrl = firm?.slug ? `https://www.praxiumlaw.com/intake/${firm.slug}` : "";

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl">
      <div className="overline mb-2">// settings</div>
      <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-3">
        <SettingsIcon className="text-praxium-accent shrink-0" /> Settings
      </h1>

      <div className="mt-6 data-card p-5">
        <div className="overline mb-3">// firm</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><div className="overline">Firm name</div><div className="mt-1">{firm?.name}</div></div>
          <div><div className="overline">Subscription</div><div className="mt-1 font-mono uppercase">{firm?.subscription_tier}</div></div>
          <div><div className="overline">Firm ID</div><div className="mt-1 font-mono text-xs break-all">{firm?.id}</div></div>
          <div>
            <div className="overline">Public intake URL</div>
            {intakeUrl ? (
              <div className="mt-1 space-y-2">
                <a href={`/intake/${firm.slug}`} target="_blank" rel="noreferrer" className="text-xs font-mono text-praxium-accent hover:underline break-all block">
                  {intakeUrl.replace("https://", "")}
                </a>
                <CopyButton text={intakeUrl} label="Copy intake link" />
              </div>
            ) : (
              <div className="mt-1 text-xs text-praxium-subtle">—</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 data-card p-5">
        <div className="overline mb-3 flex items-center gap-2"><Users size={12} /> // team</div>
        {loading ? (
          <PageLoader label="Loading team…" />
        ) : (
          <div className="divide-y divide-praxium-line">
            {team.map((u) => (
              <div key={u.id} className="py-2 flex items-center justify-between gap-3" data-testid={`team-${u.id}`}>
                <div className="min-w-0">
                  <div className="font-medium text-sm">{u.name}</div>
                  <div className="text-xs font-mono text-praxium-subtle truncate">{u.email}</div>
                </div>
                <div className="text-xs font-mono uppercase tracking-wider text-praxium-subtle shrink-0">{u.role}</div>
              </div>
            ))}
            {team.length === 0 && <div className="text-sm text-praxium-subtle py-2">No team members listed.</div>}
          </div>
        )}
      </div>

      <div className="mt-4 data-card p-5">
        <div className="overline mb-3">// client identity</div>
        <p className="text-sm text-praxium-subtle mb-3">
          Send clients a link to complete live face scan + government ID upload before intake or retainer.
        </p>
        <Link
          to="/settings/identity-review"
          className="inline-flex text-sm font-semibold text-praxium-accent hover:underline"
          data-testid="settings-idv-review"
        >
          Open ID verification queue →
        </Link>
      </div>

      <div className="mt-4 data-card p-5">
        <div className="overline mb-3">// you</div>
        <div className="text-sm break-words">{user?.name} · {user?.email} · <span className="font-mono uppercase">{user?.role}</span></div>
        <button onClick={logout} data-testid="logout-btn" className="mt-4 btn-ghost text-rose-600 border-rose-200 hover:bg-rose-50">
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </div>
  );
}
