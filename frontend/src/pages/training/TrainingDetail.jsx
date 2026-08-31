import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import PageLoader from "@/components/common/PageLoader";
import MarkdownContent, { TrainingBreadcrumb } from "@/components/training/MarkdownContent";
import { ChevronLeft } from "lucide-react";

const TYPE_LABEL = { guide: "Guide", article: "Article", doc: "Document" };

export default function TrainingDetail() {
  const { type, slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/training/content/${type}/${slug}`)
      .then((r) => setData(r.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load content"))
      .finally(() => setLoading(false));
  }, [type, slug]);

  if (loading) return <PageLoader label="Loading…" />;
  if (error) {
    return (
      <div className="px-6 py-8 max-w-3xl">
        <Link to="/training" className="text-sm text-praxium-accent-text hover:underline flex items-center gap-1 mb-4">
          <ChevronLeft size={14} /> Back to Training
        </Link>
        <div className="data-card p-6 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl" data-testid="training-detail">
      <TrainingBreadcrumb
        items={[
          { label: "Training", to: "/training" },
          { label: TYPE_LABEL[type] || type },
          { label: data.title },
        ]}
      />
      <Link to="/training" className="text-xs text-praxium-accent-text hover:underline flex items-center gap-1 mb-4">
        <ChevronLeft size={12} /> All training
      </Link>
      <MarkdownContent
        markdown={data.markdown}
        onInternalLink={(t, s) => navigate(`/training/${t}/${s}`)}
      />
      <div className="mt-10 pt-6 border-t border-praxium-line">
        <Link to="/training" className="btn-ghost text-sm">← Back to Training Center</Link>
      </div>
    </div>
  );
}
