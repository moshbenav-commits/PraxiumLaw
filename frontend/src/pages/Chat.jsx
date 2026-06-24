import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { Send, Hash } from "lucide-react";
import { timeAgo, initials } from "@/lib/utils";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  const load = () => api.get("/chat/messages?channel=general").then((r) => setMessages(r.data));
  useEffect(load, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    await api.post("/chat/messages", { channel: "general", content: input });
    setInput("");
    load();
  };

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      <aside className="w-56 border-r border-praxium-line bg-praxium-surface p-3">
        <div className="overline mb-3">// channels</div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-praxium-bg text-sm" data-testid="chat-channel-general">
            <Hash size={12} /> general
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <div className="h-12 border-b border-praxium-line bg-praxium-surface px-4 flex items-center gap-2">
          <Hash size={14} /> <span className="font-display font-bold">general</span>
          <span className="text-xs text-praxium-subtle ml-2">Firm-wide chat</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="flex gap-3" data-testid={`chat-msg-${m.id}`}>
              <div className="w-8 h-8 rounded-sm bg-praxium-ink text-white flex items-center justify-center text-xs font-bold font-display shrink-0">{initials(m.author_name)}</div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-sm">{m.author_name}</span>
                  <span className="text-[10px] font-mono text-praxium-subtle">{timeAgo(m.created_at)}</span>
                </div>
                <div className="text-sm">{m.content}</div>
              </div>
            </div>
          ))}
          {messages.length === 0 && <div className="text-sm text-praxium-subtle text-center py-12">Start the conversation.</div>}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="border-t border-praxium-line bg-praxium-surface p-3 flex gap-2" data-testid="chat-form">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message #general"
            className="flex-1 px-3 py-2 border border-praxium-line rounded-sm text-sm" data-testid="chat-input" />
          <button type="submit" className="btn-praxium" data-testid="chat-send"><Send size={14} /></button>
        </form>
      </div>
    </div>
  );
}
