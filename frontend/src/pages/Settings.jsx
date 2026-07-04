import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Settings as SettingsIcon, LogOut, Users, Shield, Workflow, UserPlus, GraduationCap, FileText } from "lucide-react";
import CopyButton from "@/components/common/CopyButton";
import PageLoader from "@/components/common/PageLoader";
import { toast } from "sonner";

const WL_FIELDS = [
  { key: "firm_dba", label: "DBA / public brand" },
  { key: "attorney_name", label: "Supervising attorney" },
  { key: "attorney_bar", label: "Bar number + state" },
  { key: "case_manager", label: "Default case manager" },
  { key: "firm_address", label: "Mailing address" },
  { key: "firm_phone", label: "Main phone" },
  { key: "firm_fax", label: "Fax" },
  { key: "firm_email", label: "Matter email" },
  { key: "jurisdiction", label: "Primary jurisdiction" },
  { key: "sol_years", label: "SOL years (firm policy)" },
  { key: "fee_contingent", label: "Contingent fee %" },
  { key: "trust_account", label: "Trust account language" },
];

export default function Settings() {
  const { user, firm, logout } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [whiteLabel, setWhiteLabel] = useState({});
  const [wlSaving, setWlSaving] = useState(false);

  useEffect(() => {
    api.get("/team")
      .then((r) => setTeam(r.data))
      .finally(() => setLoading(false));
    api.get("/firm/white-label").then((r) => setWhiteLabel(r.data.white_label || {})).catch(() => {});
  }, []);

  const intakeUrl = firm?.slug ? `https://www.praxiumlaw.com/intake/${firm.slug}` : "";

  const saveWhiteLabel = async (e) => {
    e.preventDefault();
    setWlSaving(true);
    try {
      const r = await api.patch("/firm/white-label", whiteLabel);
      setWhiteLabel(r.data.white_label || {});
      toast.success("White-label profile saved — template downloads will merge these fields");
    } catch {
      toast.error("Could not save profile");
    } finally {
      setWlSaving(false);
    }
  };

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

      <form className="mt-4 data-card p-5" onSubmit={saveWhiteLabel} data-testid="white-label-profile">
        <div className="overline mb-2">// white-label profile</div>
        <p className="text-sm text-praxium-subtle mb-4">
          Fills <code className="text-xs">{`{{FIRM_NAME}}`}</code> and related placeholders when you download templates.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WL_FIELDS.map((f) => (
            <label key={f.key} className="text-xs block">
              <span className="font-mono uppercase text-praxium-subtle">{f.label}</span>
              <input
                className="mt-1 w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5"
                value={whiteLabel[f.key] || ""}
                onChange={(e) => setWhiteLabel((wl) => ({ ...wl, [f.key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <button type="submit" className="btn-praxium mt-4 text-sm" disabled={wlSaving}>
          {wlSaving ? "Saving…" : "Save profile"}
        </button>
      </form>

      <div className="mt-4 data-card p-5">
        <div className="overline mb-3 flex items-center gap-2"><FileText size={12} /> // templates</div>
        <p className="text-sm text-praxium-subtle mb-3">
          Browse 106 PI DOCX templates, download intake forms, and print the day-of-intake signature checklist.
        </p>
        <Link to="/settings/templates" className="inline-flex text-sm font-semibold text-praxium-accent hover:underline" data-testid="settings-templates">
          Open template library →
        </Link>
      </div>

      <div className="mt-4 data-card p-5">
        <div className="overline mb-3 flex items-center gap-2"><GraduationCap size={12} /> // training</div>
        <p className="text-sm text-praxium-subtle mb-3">PI role guides, knowledge articles, and UI gap report for your role.</p>
        <Link to="/training" className="inline-flex text-sm font-semibold text-praxium-accent hover:underline" data-testid="settings-training">
          Open Training Center →
        </Link>
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
        <div className="overline mb-3 flex items-center gap-2"><UserPlus size={12} /> // team & invites</div>
        <p className="text-sm text-praxium-subtle mb-3">Invite attorneys, paralegals, and staff. Manage pending invites.</p>
        <Link to="/settings/team" className="inline-flex text-sm font-semibold text-praxium-accent hover:underline" data-testid="settings-team">
          Manage team →
        </Link>
      </div>

      <div className="mt-4 data-card p-5">
        <div className="overline mb-3 flex items-center gap-2"><Workflow size={12} /> // workflows</div>
        <p className="text-sm text-praxium-subtle mb-3">Toggle intake checklists and document-trigger automations.</p>
        <Link to="/settings/workflows" className="inline-flex text-sm font-semibold text-praxium-accent hover:underline" data-testid="settings-workflows">
          Manage workflows →
        </Link>
      </div>

      <div className="mt-4 data-card p-5">
        <div className="overline mb-3 flex items-center gap-2"><Shield size={12} /> // audit log</div>
        <p className="text-sm text-praxium-subtle mb-3">
          Immutable record of logins, matter views, and document exports for ethics and compliance review.
        </p>
        <Link
          to="/settings/audit"
          className="inline-flex text-sm font-semibold text-praxium-accent hover:underline"
          data-testid="settings-audit-log"
        >
          View audit log (last 50) →
        </Link>
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
