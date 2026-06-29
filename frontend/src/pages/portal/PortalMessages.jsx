import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import portalApi from "@/lib/portalApi";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import PageLoader from "@/components/common/PageLoader";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function PortalMessages() {
  const [params] = useSearchParams();
  const preMatter = params.get("matter") || "";
  const [matters, setMatters] = useState([]);
  const [matterId, setMatterId] = useState(preMatter);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const loadMessages = (mid) => {
    const q = mid ? `?matter_id=${mid}` : "";
    return portalApi.get(`/portal/messages${q}`).then((r) => setMessages(r.data.items || []));
  };

  useEffect(() => {
    portalApi
      .get("/portal/matters")
      .then((r) => {
        const items = r.data.items || [];
        setMatters(items);
        const mid = preMatter || items[0]?.id || "";
        setMatterId(mid);
        if (mid) return loadMessages(mid);
      })
      .finally(() => setLoading(false));
  }, [preMatter]);

  useEffect(() => {
    if (matterId) loadMessages(matterId);
  }, [matterId]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !matterId) return;
    try {
      await portalApi.post("/portal/messages", { matter_id: matterId, content: text.trim() });
      setText("");
      await loadMessages(matterId);
      toast.success("Message sent");
    } catch {
      toast.error("Send failed");
    }
  };

  if (loading) return <PageLoader label="Loading messages…" />;

  return (
    <div className="flex flex-col min-h-[60vh]">
      <div className="overline mb-2">// secure messaging</div>
      <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
        <MessageSquare className="text-praxium-accent" size={22} />
        Messages
      </h1>

      {matters.length > 1 && (
        <select
          value={matterId}
          onChange={(e) => setMatterId(e.target.value)}
          className="mt-4 w-full px-3 py-2 border border-praxium-line rounded-sm text-sm bg-white"
        >
          {matters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.case_number} — {m.title}
            </option>
          ))}
        </select>
      )}

      <div className="flex-1 data-card p-4 mt-4 flex flex-col min-h-[320px]">
        <div className="flex-1 overflow-y-auto space-y-3 mb-3">
          {messages.length === 0 && (
            <p className="text-sm text-praxium-subtle">Start a conversation with your legal team.</p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[85%] rounded-sm p-3 text-sm",
                m.author_kind === "client"
                  ? "ml-auto bg-praxium-accent/10 border border-praxium-accent/20"
                  : "bg-praxium-bg border border-praxium-line"
              )}
            >
              <div className="text-[10px] font-mono text-praxium-subtle mb-1">
                {m.author_name} · {timeAgo(m.created_at)}
              </div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="flex gap-2 pt-3 border-t border-praxium-line">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a message…"
            className="flex-1 px-3 py-2 border border-praxium-line rounded-sm text-sm"
          />
          <button type="submit" className="btn-praxium shrink-0">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
