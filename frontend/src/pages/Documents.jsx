import { useEffect, useState } from "react";
import api from "@/lib/api";
import { FileText } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import PageLoader from "@/components/common/PageLoader";
import EmptyState from "@/components/common/EmptyState";

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/documents")
      .then((r) => setDocs(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader label="Loading documents…" />;

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="overline mb-2">// documents // {docs.length} files</div>
      <h1 className="font-display font-black text-3xl tracking-tight">Documents</h1>
      <p className="text-sm text-praxium-subtle mt-2">Upload files directly inside a matter&apos;s Documents tab.</p>

      {docs.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No documents yet"
            body="Open a matter and use the Documents tab to upload pleadings, medical records, and correspondence."
            actionLabel="View matters"
            actionTo="/matters"
            testId="documents-empty"
          />
        </div>
      ) : (
      <div className="mt-6 data-card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
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
                <td className="px-4 py-2 flex items-center gap-2"><FileText size={14} className="text-praxium-subtle shrink-0" /> {d.name}</td>
                <td className="px-4 py-2 text-xs font-mono">{d.folder}</td>
                <td className="px-4 py-2 text-xs font-mono text-praxium-subtle">{d.matter_id?.slice(0, 8)}</td>
                <td className="px-4 py-2 text-xs font-mono text-praxium-subtle">{timeAgo(d.uploaded_at)}</td>
                <td className="px-4 py-2 text-right font-mono text-xs">{Math.round(d.size_bytes / 1024)} KB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
