import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import PageLoader from "@/components/common/PageLoader";
import { ChevronLeft, Download, FileText, Printer, Search } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABELS = {
  intake: "Intake & signatures",
  medical: "Medical records",
  insurance: "Insurance LOR",
  settlement: "Settlement & negotiation",
  litigation: "Litigation",
  pd: "Property damage",
  other: "Other",
};

export default function SettingsTemplates() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [jurisdiction, setJurisdiction] = useState("all");
  const [query, setQuery] = useState("");
  const [mergeProfile, setMergeProfile] = useState(null);

  useEffect(() => {
    api
      .get("/training/templates")
      .then((r) => setData(r.data))
      .catch(() => toast.error("Could not load template catalog"))
      .finally(() => setLoading(false));
    api.get("/training/templates/merge-tokens").then((r) => setMergeProfile(r.data)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!data?.templates) return [];
    return data.templates.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (jurisdiction !== "all" && t.jurisdiction !== jurisdiction && t.jurisdiction !== "General") return false;
      if (query.trim().length >= 2 && !t.filename.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [data, category, jurisdiction, query]);

  const downloadTemplate = async (filename) => {
    try {
      const res = await api.get(`/training/templates/download/${encodeURIComponent(filename)}`, {
        responseType: "blob",
        params: { merge: true },
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.replace(/\.docx$/i, "-merged.docx");
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Merged DOCX downloaded — counsel review still required");
    } catch {
      toast.error("Download failed — template files may only be on local/dev server");
    }
  };

  const downloadChecklistPdf = async () => {
    try {
      const res = await api.get("/training/intake-checklist.pdf", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "intake-packet-checklist.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not generate checklist PDF");
    }
  };

  if (loading) return <PageLoader label="Loading templates…" />;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl" data-testid="settings-templates">
      <Link to="/settings" className="text-xs font-mono text-praxium-subtle hover:text-praxium-accent flex items-center gap-1 mb-3">
        <ChevronLeft size={12} /> Settings
      </Link>
      <div className="overline mb-2">// document library</div>
      <h1 className="font-display font-black text-2xl tracking-tight flex items-center gap-2">
        <FileText className="text-praxium-accent" /> PI Template Library
      </h1>
      <p className="text-sm text-praxium-subtle mt-2 max-w-2xl">
        White-label DOCX templates from the PI Case OS corpus. Downloads merge your firm profile into{" "}
        <code className="text-xs">{`{{FIRM_NAME}}`}</code> placeholders. Counsel must review before live use.
        {" "}
        <Link to="/settings" className="text-praxium-accent-text hover:underline">Edit firm profile →</Link>
        {" · "}
        <Link to="/training/article/23-intake-forms-and-signature-packet" className="text-praxium-accent-text hover:underline">
          Intake forms guide →
        </Link>
      </p>

      {mergeProfile && mergeProfile.missing_count > 0 && (
        <div className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          {mergeProfile.missing_count} merge field(s) empty — complete your{" "}
          <Link to="/settings" className="underline font-medium">white-label profile</Link> in Settings for full letterhead.
        </div>
      )}

      {!data?.download_available && (
        <div className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Template files are not on this server — browse the catalog here; download from your local clone at{" "}
          <code className="text-xs">docs/pi-case-os/sources/docs/white-label-templates/docx/</code>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/training/intake-checklist"
          className="btn-primary text-sm inline-flex items-center gap-2"
          data-testid="open-intake-checklist"
        >
          <Printer size={14} /> Print intake packet checklist
        </Link>
        <button type="button" onClick={downloadChecklistPdf} className="btn-ghost text-sm inline-flex items-center gap-2">
          <Download size={14} /> Download checklist PDF
        </button>
      </div>

      <div className="mt-6 data-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-praxium-subtle" />
          <input
            type="search"
            placeholder="Search templates…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-praxium-line rounded-lg bg-white"
            data-testid="template-search"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-sm border border-praxium-line rounded-lg px-3 py-2 bg-white"
        >
          <option value="all">All categories</option>
          {(data?.categories || []).map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
          ))}
        </select>
        <select
          value={jurisdiction}
          onChange={(e) => setJurisdiction(e.target.value)}
          className="text-sm border border-praxium-line rounded-lg px-3 py-2 bg-white"
        >
          <option value="all">All jurisdictions</option>
          <option value="WA">Washington (WA)</option>
          <option value="NV">Nevada (NV)</option>
          <option value="General">General</option>
        </select>
      </div>

      <div className="mt-4 text-xs font-mono text-praxium-subtle">
        Showing {filtered.length} of {data?.total || 0} templates
      </div>

      <div className="mt-3 divide-y divide-praxium-line data-card">
        {filtered.map((t) => (
          <div key={t.filename} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-medium break-words">{t.filename}</div>
              <div className="text-xs font-mono text-praxium-subtle mt-1 flex flex-wrap gap-2">
                <span className="uppercase">{t.jurisdiction}</span>
                <span>·</span>
                <span>{CATEGORY_LABELS[t.category] || t.category}</span>
                {t.has_pdf && <span>· PDF mirror</span>}
              </div>
            </div>
            {data?.download_available && (
              <button
                type="button"
                onClick={() => downloadTemplate(t.filename)}
                className="btn-ghost text-xs shrink-0 self-start sm:self-center"
              >
                <Download size={12} /> Merged DOCX
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-6 text-sm text-praxium-subtle text-center">No templates match your filters.</div>
        )}
      </div>
    </div>
  );
}
