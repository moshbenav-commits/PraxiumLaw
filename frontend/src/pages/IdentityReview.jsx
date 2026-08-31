import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

export default function IdentityReview() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [clientLink, setClientLink] = useState(null);

  const refresh = useCallback(async () => {
    const { data } = await api.get("/identity-verification/admin/queue");
    setItems(data.items ?? []);
  }, []);

  useEffect(() => {
    void refresh()
      .catch(() => toast.error("Could not load verification queue"))
      .finally(() => setLoading(false));
  }, [refresh]);

  const createClientLink = async () => {
    setCreating(true);
    try {
      const form = new FormData();
      form.append("label", `Client-${Date.now().toString(36).toUpperCase()}`);
      const { data } = await api.post("/identity-verification/sessions", form);
      setClientLink(data.verifyUrl);
      toast.success("Client verify link created — copy and send securely");
    } catch {
      toast.error("Could not create verify link");
    } finally {
      setCreating(false);
    }
  };

  const act = async (sessionId, action) => {
    try {
      await api.post(`/identity-verification/admin/${sessionId}/${action}`);
      toast.success(action === "approve" ? "Approved" : "Rejected");
      await refresh();
    } catch {
      toast.error(`Could not ${action}`);
    }
  };

  return (
    <div className="px-6 py-6">
      <div className="overline mb-2">// identity verification</div>
      <h1 className="font-display font-black text-3xl tracking-tight">ID & face scan review</h1>
      <p className="mt-2 max-w-2xl text-sm text-praxium-subtle">
        Clients complete a live face scan and upload government ID. Approve after manual review.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={creating}
          onClick={() => void createClientLink()}
          className="rounded-sm bg-praxium-accent-text px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          data-testid="idv-create-link"
        >
          {creating ? "Creating…" : "Create client verify link"}
        </button>
        <Link
          to="/verify-identity/demo"
          className="rounded-sm border border-praxium-line px-4 py-2 text-sm font-semibold text-praxium-ink"
        >
          Open demo flow
        </Link>
      </div>

      {clientLink ? (
        <div className="mt-4 data-card p-4 text-sm">
          <div className="font-mono text-xs uppercase tracking-wider text-praxium-subtle">Client link</div>
          <p className="mt-2 break-all font-mono text-xs">{clientLink}</p>
        </div>
      ) : null}

      <div className="mt-8">
        <h2 className="font-display font-bold text-lg">Pending review</h2>
        {loading ? (
          <p className="mt-4 text-sm text-praxium-subtle">Loading…</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-praxium-subtle">No submissions awaiting review.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="data-card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-display font-bold">{item.order_number}</div>
                  <div className="text-xs text-praxium-subtle">
                    Submitted {item.submitted_at ? new Date(item.submitted_at).toLocaleString() : "—"}
                    {item.matter_id ? ` · matter ${item.matter_id.slice(0, 8)}…` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void act(item.id, "approve")}
                    className="rounded-sm bg-green-700 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void act(item.id, "reject")}
                    className="rounded-sm border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
