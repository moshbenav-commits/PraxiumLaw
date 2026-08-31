import { useState } from "react";
import { Scale, Search, Download, AlertCircle } from "lucide-react";

export default function CourtConnect() {
  const [search, setSearch] = useState("");

  return (
    <div className="px-6 py-6">
      <div className="overline mb-2">// courtconnect</div>
      <h1 className="font-display font-black text-3xl tracking-tight flex items-center gap-3"><Scale className="text-praxium-accent" /> CourtConnect</h1>
      <p className="text-sm text-praxium-subtle mt-2 max-w-2xl">PACER docket pull via CourtListener. Filing prep with cover sheets, deadline calc, and submission tracking.</p>

      <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-sm">
        <AlertCircle size={13} className="text-amber-700" />
        <span className="text-xs font-mono text-amber-900">MOCKED — provide CourtListener API token to activate live PACER reads</span>
      </div>

      {/* Search */}
      <div className="data-card p-5 mt-6" data-testid="courtconnect-search">
        <div className="overline mb-3">// search federal cases</div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-praxium-subtle" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Case number, party name, or court..."
              data-testid="courtconnect-search-input"
              className="w-full pl-9 pr-3 py-2 border border-praxium-line rounded-sm text-sm font-mono" />
          </div>
          <button className="btn-praxium" data-testid="courtconnect-search-btn">Search</button>
        </div>
        <div className="mt-3 text-xs text-praxium-subtle">Example: <code className="font-mono bg-praxium-bg px-1.5 py-0.5 rounded-sm">3:23-cv-01234</code></div>
      </div>

      {/* Mock results */}
      <div className="data-card p-5 mt-4">
        <div className="overline mb-3">// linked dockets (sample)</div>
        <div className="space-y-3">
          {[
            { case: "Smith v. Acme Corp.", court: "S.D.N.Y.", judge: "Hon. R. Johnson", entries: 47, status: "Active" },
            { case: "Doe v. United States", court: "D.D.C.", judge: "Hon. T. Lee", entries: 23, status: "Discovery" },
          ].map((d) => (
            <div key={d.case} className="border border-praxium-line rounded-sm p-3 hover:bg-praxium-bg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display font-bold">{d.case}</div>
                  <div className="text-xs font-mono text-praxium-subtle mt-0.5">{d.court} · {d.judge}</div>
                </div>
                <span className="status-pip bg-emerald-100 text-emerald-900">{d.status}</span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="font-mono text-praxium-subtle">{d.entries} docket entries</span>
                <button className="text-praxium-accent-text hover:underline">View docket →</button>
                <button className="text-praxium-accent-text hover:underline flex items-center gap-1"><Download size={11} /> Pull filings</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CourtFile */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="data-card p-4">
          <div className="overline mb-2">// filing bundle</div>
          <div className="text-sm">Assemble PDF/A bundle with auto cover sheet, captions, and exhibit tabs.</div>
        </div>
        <div className="data-card p-4">
          <div className="overline mb-2">// pre-flight check</div>
          <div className="text-sm">AI validates margins, page limits, signature blocks, COS.</div>
        </div>
        <div className="data-card p-4">
          <div className="overline mb-2">// submission</div>
          <div className="text-sm">Track filed → accepted → served. <span className="text-amber-700 font-mono text-xs">Mocked Phase 1</span></div>
        </div>
      </div>
    </div>
  );
}
