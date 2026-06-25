/** Consistent loading state for firm OS pages */
export default function PageLoader({ label = "Loading…" }) {
  return (
    <div className="p-8 flex items-center gap-3" role="status" aria-live="polite">
      <div className="w-1.5 h-1.5 rounded-full bg-praxium-accent animate-pulse" />
      <span className="font-mono text-xs uppercase tracking-widest text-praxium-subtle">{label}</span>
    </div>
  );
}
