import { useEffect, useRef, useState } from "react";
import { X, Sparkles, Send, Loader2 } from "lucide-react";
import { streamAiChat } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useParams } from "react-router-dom";

const QUICK_PROMPTS = [
  "Summarize this matter",
  "Draft a demand letter outline",
  "Extract deadlines from this case",
  "What are the next best actions?",
];

export default function CoCounselSidebar({ open, onClose }) {
  const params = useParams();
  const matterId = params.id;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    if (!text.trim() || streaming) return;
    const userMsg = { role: "user", content: text };
    setMessages((m) => [...m, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    try {
      await streamAiChat({
        matterId, message: text, sessionId,
        onChunk: (_, full) => {
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: "assistant", content: full };
            return copy;
          });
        },
        onDone: (_, sid) => setSessionId(sid),
      });
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: `Error: ${e.message}` };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  if (!open) return null;

  return (
    <aside className="w-96 shrink-0 bg-[#F0EFEA] border-l border-praxium-line flex flex-col" data-testid="cocounsel-sidebar">
      <div className="h-12 border-b border-praxium-line bg-praxium-surface flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-sm bg-praxium-accent flex items-center justify-center">
            <Sparkles size={11} className="text-white" />
          </div>
          <div className="font-display font-black tracking-tight text-sm">CoCounsel</div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-praxium-subtle">claude 4.5</div>
        </div>
        <button onClick={onClose} className="text-praxium-subtle hover:text-praxium-ink" data-testid="cocounsel-close">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-sm text-praxium-subtle">
            <p className="mb-3">Hey. I'm CoCounsel — your AI legal partner. {matterId ? "I have context on this matter." : "Open a matter and I'll have full context."}</p>
            <div className="overline mb-2">Quick prompts</div>
            <div className="space-y-1.5">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  data-testid={`cocounsel-quick-${p.toLowerCase().replace(/\s+/g, "-")}`}
                  className="w-full text-left px-3 py-2 bg-praxium-surface border border-praxium-line rounded-sm text-xs hover:border-praxium-accent transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("animate-fade-in", m.role === "user" ? "flex justify-end" : "flex justify-start")}>
            <div className={cn(
              "max-w-[85%] px-3 py-2 rounded-sm text-sm whitespace-pre-wrap break-words",
              m.role === "user"
                ? "bg-praxium-accent text-white"
                : "bg-praxium-surface border border-praxium-line text-praxium-ink"
            )}>
              {m.content || (streaming && i === messages.length - 1 ? <Loader2 className="animate-spin" size={14} /> : "")}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-praxium-line bg-praxium-surface p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask CoCounsel..."
            data-testid="cocounsel-input"
            rows={2}
            className="flex-1 resize-none px-3 py-2 border border-praxium-line rounded-sm text-sm font-sans outline-none focus:border-praxium-accent"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            data-testid="cocounsel-send"
            className="w-9 h-9 flex items-center justify-center bg-praxium-accent text-white rounded-sm hover:bg-praxium-accent-hover disabled:opacity-50"
          >
            {streaming ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
