import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import PageLoader from "@/components/common/PageLoader";
import { ChevronLeft, Download, Printer } from "lucide-react";
import { toast } from "sonner";

function ChecklistItem({ item }) {
  if (typeof item === "string") {
    return (
      <label className="flex items-start gap-3 py-1.5 text-sm cursor-pointer print:cursor-default">
        <input type="checkbox" className="mt-1 shrink-0 print:hidden" />
        <span className="print:before:content-['☐_']">{item}</span>
      </label>
    );
  }
  const req = item.required;
  const suffix = req === true ? " *" : req === false && item.template ? " (optional)" : "";
  return (
    <label className="flex items-start gap-3 py-1.5 text-sm cursor-pointer print:cursor-default">
      <input type="checkbox" className="mt-1 shrink-0 print:hidden" />
      <span>
        <span className="print:before:content-['☐_']">{item.label}{suffix}</span>
        {item.template && (
          <span className="block text-xs font-mono text-praxium-subtle mt-0.5">{item.template}</span>
        )}
      </span>
    </label>
  );
}

export default function IntakePacketChecklist() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/training/intake-checklist")
      .then((r) => setData(r.data))
      .catch(() => toast.error("Could not load checklist"))
      .finally(() => setLoading(false));
  }, []);

  const printPage = () => window.print();

  const downloadPdf = async () => {
    try {
      const res = await api.get("/training/intake-checklist.pdf", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "intake-packet-checklist.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("PDF download failed");
    }
  };

  if (loading) return <PageLoader label="Loading checklist…" />;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl print:max-w-none print:px-8" data-testid="intake-checklist">
      <div className="print:hidden">
        <Link to="/settings/templates" className="text-xs font-mono text-praxium-subtle hover:text-praxium-accent flex items-center gap-1 mb-3">
          <ChevronLeft size={12} /> Template library
        </Link>
        <div className="flex flex-wrap gap-2 mb-6">
          <button type="button" onClick={printPage} className="btn-primary text-sm inline-flex items-center gap-2">
            <Printer size={14} /> Print
          </button>
          <button type="button" onClick={downloadPdf} className="btn-ghost text-sm inline-flex items-center gap-2">
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      <article className="data-card p-6 sm:p-8 print:border-0 print:shadow-none">
        <h1 className="font-display font-black text-xl sm:text-2xl tracking-tight">{data?.title}</h1>
        {data?.disclaimer && (
          <p className="text-xs text-praxium-subtle mt-3 italic print:text-gray-600">{data.disclaimer}</p>
        )}

        <div className="mt-8 space-y-8">
          {data?.sections?.map((section) => (
            <section key={section.id}>
              <h2 className="font-semibold text-sm uppercase tracking-wide text-praxium-subtle border-b border-praxium-line pb-2 mb-3">
                {section.title}
              </h2>
              <div className="space-y-1">
                {section.items?.map((item, i) => (
                  <ChecklistItem key={`${section.id}-${i}`} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 text-xs text-praxium-subtle print:text-gray-600">
          * Required for standard MVA intake. See{" "}
          <Link to="/training/article/23-intake-forms-and-signature-packet" className="text-praxium-accent print:hidden">
            intake forms article
          </Link>
          <span className="hidden print:inline">training article 23</span> for full template catalog.
        </p>
      </article>
    </div>
  );
}
