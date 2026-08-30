import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import TrustStrip from "./TrustStrip";

/**
 * One mid-page program banner for the 30-days-free trial — the only signup
 * program on the site, placed once, not stacked with other banners (Site
 * Standard: promoBanners). Copy matches SITE_DIRECTION_PACK.json ctaPrimary
 * "Start 30 days free" + the locked trust-rail line.
 */
export default function SignupBanner() {
  return (
    <section className="px-6" data-testid="signup-banner">
      <div className="max-w-7xl mx-auto">
        <div className="border border-praxium-line bg-praxium-ink text-white rounded-sm p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-praxium-accent mb-3">// 30-day trial // no card</div>
            <h3 className="font-display font-black text-2xl lg:text-3xl tracking-[-0.02em]">Start 30 days free.</h3>
            <TrustStrip tone="dark" className="mt-4" />
          </div>
          <Link
            to="/signup"
            data-testid="signup-banner-cta"
            className="shrink-0 group bg-praxium-accent-hover text-white px-8 py-4 rounded-full text-sm font-mono uppercase tracking-[0.15em] hover:bg-praxium-accent transition-colors flex items-center gap-3"
          >
            Start 30 days free <ArrowUpRight size={16} className="group-hover:rotate-45 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
