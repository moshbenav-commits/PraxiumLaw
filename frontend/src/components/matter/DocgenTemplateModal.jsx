import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { X, FileText, Search, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { previewDocgen, generateDocgen } from "@/lib/docgenApi";

/**
 * "Generate from template" — matter-aware DocGen.
 *
 * Step 1: pick one of the 106 white-label templates (+ optional 3P/1P side,
 * + optional medical provider for meds.provider.* tokens).
 * Step 2: preview shows how many merge fields were filled from matter data
 * and which ones need staff review (never fabricated) — mirrors
 * AiIntakeFillModal's propose-then-confirm flow. Confirming files a
 * watermarked DRAFT document on the matter (attorney review required).
 */
export default function DocgenTemplateModal({ matterId, open, onClose, onGenerated }) {
  const [step, setStep] = useState(1);
  const [catalog, setCatalog] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [providers, setProviders] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState(null); // template row
  const [side, setSide] = useState("");
  const [providerId, setProviderId] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null); // { filled_count, needs_review }
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelected(null);
    setSide("");
    setProviderId("");
    setPreview(null);
    setQuery("");
    setCategory("all");
    setLoadingCatalog(true);
    api
      .get("/training/templates")
      .then((r) => setCatalog(r.data))
      .catch(() => toast.error("Could not load template catalog"))
      .finally(() => setLoadingCatalog(false));
    api
      .get("/providers")
      .then((r) => setProviders(r.data || []))
      .catch(() => {});
  }, [open]);

  const filtered = useMemo(() => {
    if (!catalog?.templates) return [];
    return catalog.templates.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (query.trim().length >= 2 && !t.filename.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [catalog, category, query]);

  if (!open) return null;

  const pickTemplate = async (t) => {
    setSelected(t);
    setSide("");
    setPreview(null);
    setStep(2);
  };

  const runPreview = async () => {
    if (!selected) return;
    setPreviewing(true);
    try {
      const r = await previewDocgen(matterId, {
        filename: selected.filename,
        side: side || undefined,
        providerId: providerId || undefined,
      });
      setPreview(r);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not preview template merge");
    } finally {
      setPreviewing(false);
    }
  };

  const confirmGenerate = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const r = await generateDocgen(matterId, {
        filename: selected.filename,
        side: side || undefined,
        providerId: providerId || undefined,
      });
      toast.success(
        `${r.name} filed on the matter — DRAFT watermark until attorney review` +
          (r.needs_review?.length ? ` (${r.needs_review.length} field(s) need review)` : "")
      );
      onGenerated?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Template generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" data-testid="docgen-template-modal">
      <div className="data-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="overline mb-1 flex items-center gap-2">
              <FileText size={12} /> // generate from template
            </div>
            <p className="text-sm text-praxium-subtle max-w-xl">
              Fill a white-label template with this matter's client, insurance, and medical data. Fields we
              can't confidently fill are left for staff review — never guessed.
            </p>
          </div>
          <button type="button" className="btn-ghost p-2" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {step === 1 ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-praxium-subtle" />
                <input
                  type="search"
                  placeholder="Search templates…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-praxium-line rounded-sm"
                  data-testid="docgen-template-search"
                />
              </div>
              <select
                className="text-sm border border-praxium-line rounded-sm px-2 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All categories</option>
                {(catalog?.categories || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {loadingCatalog ? (
              <p className="text-sm text-praxium-subtle">Loading templates…</p>
            ) : (
              <ul className="divide-y divide-praxium-line border border-praxium-line rounded-sm max-h-96 overflow-y-auto">
                {filtered.map((t) => (
                  <li key={t.filename}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-praxium-bg text-sm flex items-center justify-between gap-2"
                      onClick={() => pickTemplate(t)}
                      data-testid={`docgen-template-${t.filename}`}
                    >
                      <span className="truncate">{t.filename}</span>
                      <span className="text-[10px] font-mono uppercase text-praxium-subtle shrink-0">
                        {t.jurisdiction} · {t.category}
                      </span>
                    </button>
                  </li>
                ))}
                {filtered.length === 0 ? (
                  <li className="px-3 py-6 text-center text-xs text-praxium-subtle">No templates match.</li>
                ) : null}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="data-card p-3">
              <p className="text-sm font-medium truncate">{selected?.filename}</p>
              <p className="text-xs text-praxium-subtle">{selected?.jurisdiction} · {selected?.category}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-xs font-mono uppercase text-praxium-subtle">Insurance side (if applicable)</span>
                <select
                  className="mt-1 w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5"
                  value={side}
                  onChange={(e) => { setSide(e.target.value); setPreview(null); }}
                  data-testid="docgen-side"
                >
                  <option value="">Auto-detect from filename</option>
                  <option value="third_party">3P (adverse carrier)</option>
                  <option value="first_party">1P (own carrier)</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="text-xs font-mono uppercase text-praxium-subtle">Medical provider (if applicable)</span>
                <select
                  className="mt-1 w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5"
                  value={providerId}
                  onChange={(e) => { setProviderId(e.target.value); setPreview(null); }}
                  data-testid="docgen-provider"
                >
                  <option value="">None selected</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="btn-ghost text-sm"
                disabled={previewing}
                onClick={runPreview}
                data-testid="docgen-preview"
              >
                {previewing ? "Checking matter data…" : "Preview merge fields"}
              </button>
            </div>

            {preview ? (
              <div className="data-card p-4 space-y-2">
                <div className="overline text-[10px]">// merge preview</div>
                <p className="text-sm">
                  <span className="font-medium">{preview.filled_count}</span> field(s) filled from matter data.
                </p>
                {preview.needs_review?.length ? (
                  <div>
                    <p className="text-xs font-mono uppercase text-amber-800 flex items-center gap-1 mb-1">
                      <AlertTriangle size={11} /> {preview.needs_review.length} need staff review
                    </p>
                    <ul className="text-xs text-praxium-subtle space-y-0.5 max-h-40 overflow-y-auto" data-testid="docgen-needs-review">
                      {preview.needs_review.map((r) => (
                        <li key={r.token}>• {r.label}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-700">No gaps — every recognized field had matter data.</p>
                )}
                <p className="text-xs text-praxium-subtle pt-1">
                  The generated DOCX is filed as a DRAFT with a watermark until an attorney reviews it. Unresolved
                  fields are marked "[NEEDS REVIEW: …]" directly in the document — nothing is invented.
                </p>
              </div>
            ) : null}

            <div className="flex justify-between gap-2">
              <button type="button" className="btn-ghost text-sm" onClick={() => setStep(1)}>
                Back
              </button>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost text-sm" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-praxium text-sm"
                  disabled={generating || !preview}
                  onClick={confirmGenerate}
                  data-testid="docgen-generate"
                  title={!preview ? "Preview the merge fields first" : undefined}
                >
                  {generating ? "Generating…" : "Generate DRAFT"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
