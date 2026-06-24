import { useEffect, useState } from "react";
import api from "@/lib/api";
import { FileText, Folder } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export default function Documents() {
  const [docs, setDocs] = useState([]);
  useEffect(() => { api.get("/documents").then((r) => setDocs(r.data)); }, []);
  return (
    <div className="px-6 py-6">
      <div className="overline mb-2">// documents // {docs.length} files</div>
      <h1 className="font-display font-black text-3xl tracking-tight">Documents</h1>
      <p className="text-sm text-praxium-subtle mt-2">Upload files directly inside a matter's Documents tab.</p>

      <div className="mt-6 data-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-praxium-bg border-b border-praxium-line">
            <th className="text-left px-4 py-2 overline">Name</th>
            <th className="text-left px-4 py-2 overline">Folder</th>
            <th className="text-left px-4 py-2 overline">Matter</th>
            <th className="text-left px-4 py-2 overline">Uploaded</th>
            <th className="text-right px-4 py-2 overline">Size</th>
          </tr></thead>
          <tbody className="divide-y divide-praxium-line">
            {docs.map((d) => (
              <tr key={d.id} className="hover:bg-praxium-bg" data-testid={`doc-${d.id}`}>
                <td className="px-4 py-2 flex items-center gap-2"><FileText size={14} className="text-praxium-subtle" /> {d.name}</td>
                <td className="px-4 py-2 text-xs font-mono">{d.folder}</td>
                <td className="px-4 py-2 text-xs font-mono text-praxium-subtle">{d.matter_id?.slice(0, 8)}</td>
                <td className="px-4 py-2 text-xs font-mono text-praxium-subtle">{timeAgo(d.uploaded_at)}</td>
                <td className="px-4 py-2 text-right font-mono text-xs">{Math.round(d.size_bytes / 1024)} KB</td>
              </tr>
            ))}
            {docs.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-praxium-subtle">No documents yet. Upload from a matter.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
