import { Link } from "react-router-dom";

export default function EmptyState({ title, body, actionLabel, actionTo, testId }) {
  return (
    <div className="data-card p-10 text-center" data-testid={testId}>
      <div className="font-display font-black text-xl tracking-tight">{title}</div>
      {body && <p className="mt-2 text-sm text-praxium-subtle max-w-md mx-auto leading-relaxed">{body}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-praxium inline-flex mt-6 rounded-full">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
