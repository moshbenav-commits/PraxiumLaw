import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Password input with a show/hide eye toggle. Wraps a plain <input> so it
 * drops into existing auth forms with the same prop wiring (value, onChange,
 * name, autoComplete, data-testid, etc.) — pass the page's own input
 * className through unchanged; this component only adds room for the toggle
 * button via `pr-10`.
 */
export default function PasswordInput({ className, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(className, "pr-10")}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-praxium-subtle hover:text-praxium-accent transition-colors"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
