import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Settings as SettingsIcon, LogOut, Users } from "lucide-react";

export default function Settings() {
  const { user, firm, logout } = useAuth();
  const [team, setTeam] = useState([]);
  useEffect(() => { api.get("/team").then((r) => setTeam(r.data)); }, []);

  return (
    <div className="px-6 py-6 max-w-3xl">
      <div className="overline mb-2">// settings</div>
      <h1 className="font-display font-black text-3xl tracking-tight flex items-center gap-3"><SettingsIcon className="text-praxium-accent" /> Settings</h1>

      <div className="mt-6 data-card p-5">
        <div className="overline mb-3">// firm</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><div className="overline">Firm name</div><div className="mt-1">{firm?.name}</div></div>
          <div><div className="overline">Subscription</div><div className="mt-1 font-mono uppercase">{firm?.subscription_tier}</div></div>
          <div><div className="overline">Firm ID</div><div className="mt-1 font-mono text-xs">{firm?.id}</div></div>
          <div><div className="overline">Public intake URL</div><a href={`/intake/${firm?.slug}`} className="mt-1 text-xs font-mono text-praxium-accent hover:underline">praxiumlaw.com/intake/{firm?.slug}</a></div>
        </div>
      </div>

      <div className="mt-4 data-card p-5">
        <div className="overline mb-3 flex items-center gap-2"><Users size={12} /> // team</div>
        <div className="divide-y divide-praxium-line">
          {team.map((u) => (
            <div key={u.id} className="py-2 flex items-center justify-between" data-testid={`team-${u.id}`}>
              <div>
                <div className="font-medium text-sm">{u.name}</div>
                <div className="text-xs font-mono text-praxium-subtle">{u.email}</div>
              </div>
              <div className="text-xs font-mono uppercase tracking-wider text-praxium-subtle">{u.role}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 data-card p-5">
        <div className="overline mb-3">// you</div>
        <div className="text-sm">{user?.name} · {user?.email} · <span className="font-mono uppercase">{user?.role}</span></div>
        <button onClick={logout} data-testid="logout-btn" className="mt-4 btn-ghost text-rose-600 border-rose-200 hover:bg-rose-50">
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </div>
  );
}
