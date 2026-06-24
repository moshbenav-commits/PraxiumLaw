import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Scale, Stethoscope, Phone, Network, Briefcase, ShieldCheck, Check, Command } from "lucide-react";

const FEATURES = [
  { icon: Briefcase, title: "Matter OS", body: "Kanban pipelines, custom fields, every practice area pre-configured." },
  { icon: Sparkles, title: "CoCounsel AI", body: "Claude 4.5 sidebar that knows every matter. Drafts. Summarizes. Extracts deadlines." },
  { icon: Stethoscope, title: "MedConnect", body: "Records collection that doesn't take 90 days. Doctor portal. Patient IDs. Auto-summarize." },
  { icon: Scale, title: "CourtConnect", body: "PACER docket pull, filing prep, deadline calc — all native." },
  { icon: Phone, title: "VoxLine", body: "Native calling, SMS, voicemail, voice cloning for personalized client outreach." },
  { icon: Network, title: "LawMatch", body: "Marketplace leads delivered to your firm. Built into the platform — no extra subscriptions." },
];

const TIERS = [
  { name: "Starter", price: 99, features: ["Core firm OS", "Unlimited matters", "Tasks, calendar, notes", "Basic CoCounsel AI", "5 GB documents"] },
  { name: "Pro", price: 199, features: ["Everything in Starter", "MedConnect + CourtConnect", "VoxLine + TextLine", "Client mobile app", "Voice cloning (1 voice)", "Smart folders + Universal Inbox"], popular: true },
  { name: "Marketplace", price: 299, features: ["Everything in Pro", "LawMatch lead delivery", "Settlement comparables DB", "Subrogation engine", "Co-counsel mode", "Priority support"] },
  { name: "Enterprise", price: 499, features: ["Everything in Marketplace", "Multi-office", "White-label portal", "Dedicated CSM", "SLA + custom integrations"] },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-praxium-bg text-praxium-ink">
      {/* Header */}
      <header className="border-b border-praxium-line bg-praxium-bg sticky top-0 z-40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" data-testid="landing-logo">
            <div className="w-7 h-7 rounded-sm bg-praxium-accent flex items-center justify-center font-display font-black text-white text-sm">π</div>
            <span className="font-display font-black tracking-tight">PRAXIUM <span className="text-praxium-subtle font-normal text-xs ml-1 font-mono uppercase tracking-widest">suite</span></span>
          </Link>
          <div className="flex items-center gap-1">
            <a href="#features" className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-praxium-subtle hover:text-praxium-ink">Features</a>
            <a href="#pricing" className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-praxium-subtle hover:text-praxium-ink">Pricing</a>
            <Link to="/praxa" className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-praxium-subtle hover:text-praxium-ink" data-testid="landing-praxa-link">Praxa (Consumer)</Link>
            <Link to="/login" className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider hover:text-praxium-accent" data-testid="landing-login">Sign in</Link>
            <Link to="/signup" data-testid="landing-cta-signup" className="btn-praxium ml-1">
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24">
        <div className="grid grid-cols-12 gap-8 items-end">
          <div className="col-span-12 lg:col-span-8">
            <div className="overline mb-6">// the legal os // built 2026</div>
            <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[0.95]">
              The operating system<br />
              for the modern<br />
              <span className="text-praxium-accent">law firm.</span>
            </h1>
            <p className="mt-8 text-lg text-praxium-subtle max-w-2xl">
              Matters. Records. Court. Calls. AI. Marketplace leads. All in one. Migrate from Filevine in a weekend. Cut your software stack by 70%.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/signup" data-testid="hero-cta-signup" className="btn-praxium text-base px-6 py-3">
                Start free — 30 days <ArrowRight size={16} />
              </Link>
              <a href="#features" className="btn-ghost text-base px-6 py-3">See it work</a>
            </div>
            <div className="mt-8 flex items-center gap-4 text-xs font-mono text-praxium-subtle">
              <div className="flex items-center gap-1.5"><Check size={12} className="text-praxium-accent" /> No credit card</div>
              <div className="flex items-center gap-1.5"><Check size={12} className="text-praxium-accent" /> Free migration</div>
              <div className="flex items-center gap-1.5"><Check size={12} className="text-praxium-accent" /> 90-day money back</div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4">
            <div className="data-card p-5 space-y-3">
              <div className="overline">your stack today</div>
              <div className="space-y-1.5 text-sm font-mono">
                <div className="flex justify-between"><span>Filevine + addons</span><span className="text-praxium-subtle">$4,500</span></div>
                <div className="flex justify-between"><span>RingCentral</span><span className="text-praxium-subtle">$1,200</span></div>
                <div className="flex justify-between"><span>DocuSign</span><span className="text-praxium-subtle">$600</span></div>
                <div className="flex justify-between"><span>Mailchimp</span><span className="text-praxium-subtle">$300</span></div>
                <div className="flex justify-between"><span>ChartSwap</span><span className="text-praxium-subtle">$800</span></div>
                <div className="flex justify-between"><span>LeanLaw</span><span className="text-praxium-subtle">$450</span></div>
                <div className="flex justify-between"><span>Misc + IT</span><span className="text-praxium-subtle">$2,300</span></div>
                <div className="border-t border-praxium-line pt-2 mt-2 flex justify-between font-bold text-praxium-ink">
                  <span>Total / mo</span><span>$10,150</span>
                </div>
              </div>
              <div className="bg-praxium-ink text-white -mx-5 -mb-5 mt-3 p-4">
                <div className="overline text-white/60 mb-2">with praxium</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-display font-black">$2,985</span>
                  <span className="text-xs font-mono text-white/60">/mo • 15 users</span>
                </div>
                <div className="text-xs text-emerald-300 font-mono mt-1">save $85,980/year</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="border-t border-praxium-line bg-praxium-surface">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="overline mb-4">// everything bundled // nothing extra</div>
          <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tight leading-[1.05] max-w-3xl">
            Built for how law firms <span className="text-praxium-accent">actually</span> run.
          </h2>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-praxium-line border border-praxium-line">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-praxium-surface p-8 hover:bg-praxium-bg transition-colors" data-testid={`feature-${f.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <f.icon size={22} className="text-praxium-accent" strokeWidth={1.5} />
                <h3 className="mt-4 font-display font-bold text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-praxium-subtle">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Command palette teaser */}
      <section className="bg-praxium-ink text-white">
        <div className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-12 gap-8 items-center">
          <div className="col-span-12 lg:col-span-6">
            <div className="overline text-white/50 mb-4">// power user mode</div>
            <h2 className="font-display font-black text-4xl tracking-tight">Built keyboard-first.</h2>
            <p className="mt-4 text-white/70 max-w-md">
              Press <kbd className="px-2 py-0.5 bg-white/10 rounded-sm font-mono text-sm">⌘K</kbd> from anywhere. Find any matter, run any action, ask CoCounsel. Your hands never leave the keyboard.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-white/5 border border-white/10 rounded-sm p-4">
              <div className="flex items-center gap-2 px-3 py-2 border border-white/10 rounded-sm font-mono text-xs">
                <Command size={12} /> <span className="text-white/50">search or run command...</span>
              </div>
              <div className="mt-2 space-y-1 font-mono text-xs">
                <div className="px-3 py-1.5 bg-praxium-accent rounded-sm">→ Smith v. Acme — M-2026-0034</div>
                <div className="px-3 py-1.5 text-white/60">→ Create new task</div>
                <div className="px-3 py-1.5 text-white/60">→ Ask CoCounsel...</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-praxium-line">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="overline mb-4">// pricing</div>
          <h2 className="font-display font-black text-4xl sm:text-5xl tracking-tight">All-inclusive. <span className="text-praxium-accent">Not piecemeal.</span></h2>
          <p className="mt-4 text-praxium-subtle max-w-2xl">Every tier includes the full platform. Upgrade unlocks more features — never more modules.</p>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-praxium-line border border-praxium-line">
            {TIERS.map((t) => (
              <div key={t.name} data-testid={`pricing-tier-${t.name.toLowerCase()}`} className={`bg-praxium-surface p-6 ${t.popular ? "relative" : ""}`}>
                {t.popular && (
                  <div className="absolute -top-3 left-6 px-2 py-0.5 bg-praxium-accent text-white text-[10px] font-mono uppercase tracking-widest">Most Popular</div>
                )}
                <div className="font-display font-black text-xl">{t.name}</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-display font-black">${t.price}</span>
                  <span className="text-xs text-praxium-subtle font-mono">/user/mo</span>
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={14} className="text-praxium-accent mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className={`mt-6 w-full block text-center ${t.popular ? "btn-praxium" : "btn-ghost"}`}>
                  Start
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-praxium-line">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-praxium-subtle">
            <div className="w-5 h-5 rounded-sm bg-praxium-accent flex items-center justify-center font-display font-black text-white text-xs">π</div>
            <span className="font-display font-bold text-sm">PRAXIUM</span>
            <span className="text-xs font-mono">© 2026</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-praxium-subtle">
            <Link to="/praxa" className="hover:text-praxium-accent">Praxa for consumers</Link>
            <a href="#features" className="hover:text-praxium-accent">Features</a>
            <a href="#pricing" className="hover:text-praxium-accent">Pricing</a>
            <Link to="/login" className="hover:text-praxium-accent">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
