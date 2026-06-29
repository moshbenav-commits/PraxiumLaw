import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft, Mail, UserPlus, Trash2 } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";
import CopyButton from "@/components/common/CopyButton";

const ROLES = ["admin", "partner", "attorney", "paralegal", "staff", "billing"];

export default function SettingsTeam() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "partner";
  const [team, setTeam] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: "", name: "", role: "staff", title: "" });
  const [lastInviteUrl, setLastInviteUrl] = useState("");

  const load = () =>
    Promise.all([api.get("/team"), canManage ? api.get("/team/invites") : Promise.resolve({ data: { items: [] } })])
      .then(([t, i]) => {
        setTeam(t.data);
        setInvites(i.data.items || []);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [canManage]);

  const invite = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post("/team/invite", form);
      const acceptUrl = `${window.location.origin}/accept-invite?token=${r.data.accept_token}`;
      setLastInviteUrl(acceptUrl);
      toast.success("Invite created — share accept link with teammate");
      setForm({ email: "", name: "", role: "staff", title: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invite failed");
    }
  };

  const revoke = async (id) => {
    await api.delete(`/team/invites/${id}`);
    toast.success("Invite revoked");
    load();
  };

  if (loading) return <PageLoader label="Loading team…" />;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl">
      <Link to="/settings" className="text-xs font-mono text-praxium-subtle hover:text-praxium-accent flex items-center gap-1 mb-3">
        <ChevronLeft size={12} /> Settings
      </Link>
      <div className="overline mb-2">// team</div>
      <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
        <UserPlus className="text-praxium-accent" /> Team & invites
      </h1>

      <div className="mt-6 data-card p-5">
        <div className="overline mb-3">// members ({team.length})</div>
        <div className="divide-y divide-praxium-line">
          {team.map((u) => (
            <div key={u.id} className="py-2 flex justify-between gap-3">
              <div>
                <div className="font-medium text-sm">{u.name}</div>
                <div className="text-xs font-mono text-praxium-subtle">{u.email}</div>
              </div>
              <span className="text-xs font-mono uppercase text-praxium-subtle">{u.role}</span>
            </div>
          ))}
        </div>
      </div>

      {canManage && (
        <>
          <form onSubmit={invite} className="mt-4 data-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="overline sm:col-span-2 flex items-center gap-2">
              <Mail size={12} /> Invite teammate
            </div>
            <input
              required
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 border border-praxium-line rounded-sm text-sm"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 border border-praxium-line rounded-sm text-sm"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="px-3 py-2 border border-praxium-line rounded-sm text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              placeholder="Title (optional)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="px-3 py-2 border border-praxium-line rounded-sm text-sm"
            />
            <button type="submit" className="btn-praxium sm:col-span-2">
              Send invite
            </button>
          </form>

          {lastInviteUrl && (
            <div className="mt-3 data-card p-4 text-xs">
              <div className="overline mb-1">Accept link (share once)</div>
              <code className="block break-all font-mono text-[11px]">{lastInviteUrl}</code>
              <CopyButton text={lastInviteUrl} label="Copy accept link" className="mt-2" />
            </div>
          )}

          <div className="mt-4 data-card p-5">
            <div className="overline mb-3">Pending invites</div>
            {invites.filter((i) => i.status === "pending").length === 0 && (
              <p className="text-sm text-praxium-subtle">No pending invites.</p>
            )}
            {invites
              .filter((i) => i.status === "pending")
              .map((inv) => (
                <div key={inv.id} className="py-2 flex items-center justify-between gap-2 border-b border-praxium-line last:border-0">
                  <div>
                    <div className="text-sm font-medium">{inv.name}</div>
                    <div className="text-xs font-mono text-praxium-subtle">
                      {inv.email} · {inv.role}
                    </div>
                  </div>
                  <button type="button" onClick={() => revoke(inv.id)} className="btn-ghost text-xs text-rose-600 py-1">
                    <Trash2 size={12} /> Revoke
                  </button>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
