import { Link } from "react-router-dom";
import { Check } from "lucide-react";

const DEFAULT_BULLETS = [
  "All modules included from day one",
  "Free migration from Filevine / Clio / MyCase",
  "CoCounsel AI included",
  "90-day money-back guarantee",
];

export default function AuthMarketingPanel({
  headline,
  headlineAccent,
  sub,
  bullets = DEFAULT_BULLETS,
}) {
  return (
    <div className="hidden lg:flex flex-col justify-between p-12 bg-praxium-ink text-white min-h-screen">
      <Link to="/" className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-sm bg-praxium-accent-text flex items-center justify-center font-display font-black text-sm">π</div>
        <span className="font-display font-black tracking-tight">PRAXIUM</span>
      </Link>
      <div>
        <h1 className="font-display font-black text-4xl tracking-tight leading-tight max-w-md">
          {headline}
          {headlineAccent && (
            <>
              <br />
              <span className="text-praxium-accent">{headlineAccent}</span>
            </>
          )}
        </h1>
        {sub && <p className="mt-4 text-white/60 max-w-md text-sm leading-relaxed">{sub}</p>}
        {bullets?.length > 0 && (
          <ul className="mt-8 space-y-2.5 text-sm text-white/80">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Check size={14} className="text-praxium-accent mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="text-xs font-mono text-white/50">// πραξις // praxis // action</div>
    </div>
  );
}
