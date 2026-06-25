import { Link } from "react-router-dom";
import usePageMeta from "@/components/landing/usePageMeta";

export default function NotFound() {
  usePageMeta({ title: "Page Not Found — Praxium", description: "The page you requested does not exist." });

  return (
    <div className="min-h-screen bg-praxium-bg flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-praxium-subtle mb-4">// 404</div>
        <h1 className="font-display font-black text-5xl tracking-tight">Not found.</h1>
        <p className="mt-4 text-praxium-subtle">That route doesn&apos;t exist in Praxium Suite.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-praxium rounded-full">Home</Link>
          <Link to="/dashboard" className="btn-ghost rounded-full">Dashboard</Link>
          <Link to="/praxa" className="btn-ghost rounded-full">Praxa</Link>
        </div>
      </div>
    </div>
  );
}
