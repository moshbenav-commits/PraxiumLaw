import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft, Layers } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";
import { Switch } from "@/components/ui/switch";

const STATUS_LABEL = {
  available: "Available",
  rolling_out: "Rolling out",
  early_access: "Early access",
};

export default function SettingsModules() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api
      .get("/practice-modules/catalog")
      .then((r) => setModules(r.data.modules || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const toggle = async (id, enabled) => {
    try {
      await api.patch(`/practice-modules/${id}`, { enabled });
      toast.success(enabled ? "Module enabled" : "Module disabled");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Update failed");
    }
  };

  if (loading) return <PageLoader label="Loading practice areas…" />;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl">
      <Link to="/settings" className="text-xs font-mono text-praxium-subtle hover:text-praxium-accent flex items-center gap-1 mb-3">
        <ChevronLeft size={12} /> Settings
      </Link>
      <div className="overline mb-2">// practice areas</div>
      <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
        <Layers className="text-praxium-accent" /> Practice-area modules
      </h1>
      <p className="text-sm text-praxium-subtle mt-2">
        One shared core, a module per vertical. Enabling a module lets matters carry it — assignment
        sets the practice area and spawns the module's day-one task pack.
      </p>

      <div className="mt-6 space-y-3">
        {modules.map((m) => (
          <div key={m.id} className="data-card p-4 flex items-start justify-between gap-4" data-testid={`module-row-${m.id}`}>
            <div>
              <div className="font-semibold text-sm flex items-center gap-2">
                {m.name}
                <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border ${m.status === "available" ? "border-praxium-accent text-praxium-accent-text" : "border-praxium-line text-praxium-subtle"}`}>
                  {STATUS_LABEL[m.status] || m.status}
                </span>
              </div>
              <div className="text-xs text-praxium-subtle mt-1 leading-relaxed">{m.summary}</div>
              {m.day_one_task_count > 0 && (
                <div className="text-[10px] font-mono text-praxium-subtle mt-1">
                  {m.day_one_task_count} day-one task(s) on assignment
                </div>
              )}
            </div>
            <Switch
              checked={Boolean(m.enabled)}
              disabled={m.id === "personal-injury"}
              onCheckedChange={(v) => toggle(m.id, v)}
              aria-label={`Toggle ${m.name}`}
            />
          </div>
        ))}
      </div>

      <p className="mt-6 text-[11px] font-mono text-praxium-subtle">
        Personal injury is the core module and cannot be disabled. Module deadline packs and forms
        must be jurisdiction-verified by counsel before live use.
      </p>
    </div>
  );
}
