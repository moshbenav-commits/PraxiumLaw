import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#truth", label: "The math" },
  { href: "#how", label: "Product" },
  { to: "/pricing", label: "Pricing" },
  { to: "/praxa", label: "Praxa" },
  { to: "/login", label: "Sign in" },
];

export default function LandingMobileNav() {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="p-2 -mr-2 text-praxium-ink hover:text-praxium-accent transition-colors"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu overlay"
            className="fixed inset-0 z-40 bg-praxium-ink/20 backdrop-blur-sm"
            onClick={close}
          />
          <nav className="fixed top-16 left-0 right-0 z-50 bg-praxium-bg border-b border-praxium-line shadow-lg px-6 py-4 flex flex-col gap-1">
            {LINKS.map((item) =>
              item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={close}
                  className="py-3 text-sm font-mono uppercase tracking-[0.15em] text-praxium-ink hover:text-praxium-accent border-b border-praxium-line/60 last:border-0"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={close}
                  className="py-3 text-sm font-mono uppercase tracking-[0.15em] text-praxium-ink hover:text-praxium-accent border-b border-praxium-line/60 last:border-0"
                >
                  {item.label}
                </a>
              ),
            )}
            <Link
              to="/signup"
              onClick={close}
              className="mt-3 bg-praxium-accent text-white text-center py-3 rounded-full text-xs font-mono uppercase tracking-[0.15em]"
            >
              Start free
            </Link>
          </nav>
        </>
      )}
    </div>
  );
}
