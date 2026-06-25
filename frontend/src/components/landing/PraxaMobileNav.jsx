import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#truth", label: "Why Praxa" },
  { href: "#doctors", label: "Doctors" },
  { href: "#pricing", label: "Pricing" },
  { to: "/", label: "For law firms" },
];

export default function PraxaMobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="p-2 -mr-2 text-praxa-ink"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close overlay" className="fixed inset-0 z-40 bg-praxa-ink/15" onClick={close} />
          <nav className="fixed top-16 left-0 right-0 z-50 bg-praxa-bg border-b border-praxa-line shadow-lg px-6 py-4 flex flex-col">
            {LINKS.map((item) =>
              item.to ? (
                <Link key={item.label} to={item.to} onClick={close} className="py-3 text-sm font-medium text-praxa-ink border-b border-praxa-line/60">
                  {item.label}
                </Link>
              ) : (
                <a key={item.label} href={item.href} onClick={close} className="py-3 text-sm font-medium text-praxa-ink border-b border-praxa-line/60">
                  {item.label}
                </a>
              ),
            )}
            <Link to="/praxa/signup" onClick={close} className="mt-3 bg-praxa-accent text-white text-center py-3 rounded-full text-sm font-medium">
              Start free
            </Link>
          </nav>
        </>
      )}
    </div>
  );
}
