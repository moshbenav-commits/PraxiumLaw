import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Briefcase, Users, Plus, BarChart3, Stethoscope, Scale, Sparkles, GraduationCap, FileText } from "lucide-react";
import api from "@/lib/api";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { label: "PI Training Center", icon: GraduationCap, path: "/training", testid: "cmd-training" },
  { label: "PI template library", icon: FileText, path: "/settings/templates", testid: "cmd-templates" },
  { label: "Create new matter", icon: Plus, path: "/matters/new", testid: "cmd-new-matter" },
  { label: "Add contact", icon: Plus, path: "/contacts/new", testid: "cmd-new-contact" },
  { label: "Open dashboard", icon: BarChart3, path: "/dashboard", testid: "cmd-dashboard" },
  { label: "MedConnect", icon: Stethoscope, path: "/medconnect", testid: "cmd-medconnect" },
  { label: "CourtConnect", icon: Scale, path: "/courtconnect", testid: "cmd-courtconnect" },
  { label: "LawMatch marketplace", icon: Sparkles, path: "/marketplace", testid: "cmd-marketplace" },
];

export default function CommandPalette({ open, onOpenChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ matters: [], contacts: [], notes: [] });
  const [highlight, setHighlight] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({ matters: [], contacts: [], notes: [] });
      setHighlight(0);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ matters: [], contacts: [], notes: [] });
      return;
    }
    const t = setTimeout(() => {
      api.get(`/search?q=${encodeURIComponent(query)}`).then((r) => setResults(r.data)).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const filteredActions = QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));
  const flat = [
    ...filteredActions.map((a) => ({ kind: "action", ...a })),
    ...results.matters.map((m) => ({ kind: "matter", id: m.id, title: m.title, sub: m.case_number, path: `/matters/${m.id}` })),
    ...results.contacts.map((c) => ({ kind: "contact", id: c.id, title: c.name, sub: c.email || c.phone, path: `/contacts/${c.id}` })),
  ];

  const handleSelect = (item) => {
    onOpenChange(false);
    navigate(item.path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl bg-white/95 backdrop-blur-xl border border-praxium-line rounded-sm shadow-2xl" data-testid="command-palette">
        <div className="flex items-center px-4 py-3 border-b border-praxium-line">
          <Search size={16} className="text-praxium-subtle" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { setHighlight((h) => Math.min(h + 1, flat.length - 1)); }
              if (e.key === "ArrowUp") { setHighlight((h) => Math.max(h - 1, 0)); }
              if (e.key === "Enter" && flat[highlight]) handleSelect(flat[highlight]);
            }}
            data-testid="command-palette-input"
            placeholder="Search or run command..."
            className="flex-1 px-3 py-1 font-mono text-sm bg-transparent outline-none placeholder:text-praxium-subtle"
          />
          <kbd className="text-[10px] font-mono text-praxium-subtle">ESC</kbd>
        </div>
        <div className="max-h-[420px] overflow-y-auto py-2">
          {filteredActions.length > 0 && (
            <div className="px-3 py-1">
              <div className="overline mb-1">Quick actions</div>
              {filteredActions.map((a, i) => {
                const Icon = a.icon;
                const idx = i;
                return (
                  <button
                    key={a.label}
                    data-testid={a.testid}
                    onClick={() => handleSelect(a)}
                    className={cn("w-full flex items-center gap-3 px-2 py-1.5 rounded-sm text-sm text-left", highlight === idx ? "bg-praxium-bg" : "hover:bg-praxium-bg")}
                  >
                    <Icon size={14} className="text-praxium-subtle" />
                    <span>{a.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          {results.matters.length > 0 && (
            <div className="px-3 py-1 mt-2">
              <div className="overline mb-1">Matters</div>
              {results.matters.map((m, i) => {
                const idx = filteredActions.length + i;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelect({ path: `/matters/${m.id}` })}
                    className={cn("w-full flex items-center gap-3 px-2 py-1.5 rounded-sm text-sm text-left", highlight === idx ? "bg-praxium-bg" : "hover:bg-praxium-bg")}
                  >
                    <Briefcase size={14} className="text-praxium-subtle" />
                    <span className="flex-1">{m.title}</span>
                    <span className="text-[10px] font-mono text-praxium-subtle">{m.case_number}</span>
                  </button>
                );
              })}
            </div>
          )}
          {results.contacts.length > 0 && (
            <div className="px-3 py-1 mt-2">
              <div className="overline mb-1">Contacts</div>
              {results.contacts.map((c, i) => {
                const idx = filteredActions.length + results.matters.length + i;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelect({ path: `/contacts/${c.id}` })}
                    className={cn("w-full flex items-center gap-3 px-2 py-1.5 rounded-sm text-sm text-left", highlight === idx ? "bg-praxium-bg" : "hover:bg-praxium-bg")}
                  >
                    <Users size={14} className="text-praxium-subtle" />
                    <span className="flex-1">{c.name}</span>
                    <span className="text-[10px] font-mono text-praxium-subtle">{c.email || c.phone}</span>
                  </button>
                );
              })}
            </div>
          )}
          {flat.length === 0 && query && (
            <div className="px-6 py-8 text-center text-sm text-praxium-subtle">
              No results for "{query}"
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
