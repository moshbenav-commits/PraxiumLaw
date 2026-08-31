import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

/** Contextual training link for matter tabs (UX-023). */
export default function MatterTabHelp({ to, label = "Training guide" }) {
  if (!to) return null;
  const href = to.startsWith("/") ? to : `/training/article/${to}`;
  return (
    <Link
      to={href}
      className="text-xs font-mono text-praxium-accent-text hover:underline inline-flex items-center gap-1 shrink-0"
      data-testid="matter-tab-help"
    >
      {label} <ExternalLink size={10} />
    </Link>
  );
}
