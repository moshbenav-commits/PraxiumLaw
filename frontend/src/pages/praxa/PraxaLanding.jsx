import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, BookOpen, Heart, Phone, Check, Sparkles } from "lucide-react";
import PainJournalMock from "../../components/showcase/PainJournalMock";
import DoctorMatchMock from "../../components/showcase/DoctorMatchMock";
import InsuranceCoachMock from "../../components/showcase/InsuranceCoachMock";
import ScrollReveal from "../../components/landing/ScrollReveal";
import PraxaMobileNav from "../../components/landing/PraxaMobileNav";
import usePageMeta from "../../components/landing/usePageMeta";
import { PRAXA_TIERS } from "@/data/marketing";

export default function PraxaLanding() {
  const signedIn = useMemo(
    () => typeof window !== "undefined" && !!localStorage.getItem("praxa_token"),
    [],
  );
  const appHref = signedIn ? "/praxa/app" : "/praxa/signup";
  const ctaLabel = signedIn ? "Open app" : "Start free";

  usePageMeta({
    title: "Praxa HQ — Navigate Insurance After an Injury",
    description:
      "Track symptoms, get coached on what to say to adjusters, and request doctor matches. Free to start. Legal information, not legal advice.",
  });

  return (
    <div className="min-h-screen bg-praxa-bg text-praxa-ink praxa-surface overflow-x-hidden">
      <header className="border-b border-praxa-line sticky top-0 bg-praxa-bg/90 backdrop-blur-md z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/praxa" className="flex items-center gap-2" data-testid="praxa-logo">
            <div className="w-8 h-8 rounded-full bg-praxa-accent flex items-center justify-center text-white font-bold">π</div>
            <span className="font-semibold text-lg tracking-tight">
              Praxa <span className="text-praxa-sage text-xs font-normal ml-0.5 uppercase tracking-widest">HQ</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-praxa-subtle">
            <a href="#truth" className="hover:text-praxa-ink transition-colors">Why Praxa</a>
            <a href="#doctors" className="hover:text-praxa-ink transition-colors">Doctors</a>
            <a href="#pricing" className="hover:text-praxa-ink transition-colors">Pricing</a>
            <a href="https://www.praxiumlaw.com/" className="hover:text-praxa-ink transition-colors">
              For law firms
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to={appHref}
              className="hidden md:inline-flex bg-praxa-ink text-white px-5 py-2 rounded-full text-sm font-medium hover:opacity-90"
              data-testid="praxa-cta-top"
            >
              {ctaLabel}
            </Link>
            <PraxaMobileNav />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 lg:pt-24 pb-16 lg:pb-20">
        <ScrollReveal>
          <div className="text-xs uppercase tracking-[0.25em] text-praxa-sage mb-6">For people who got hurt</div>
          <h1 className="font-light text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05] max-w-3xl">
            Be accurate.{" "}
            <span className="text-praxa-accent font-semibold">Not strong.</span>
          </h1>
          <p className="mt-8 text-lg lg:text-xl text-praxa-subtle max-w-2xl leading-relaxed">
            Praxa is the streetwise friend who knows insurance. Track symptoms. Log conversations. Get coached on what to say — and what never to say on a recorded line.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to={appHref}
              className="bg-praxa-accent text-white px-7 py-3.5 rounded-full text-base font-medium hover:opacity-90 flex items-center gap-2"
              data-testid="praxa-cta-hero"
            >
              {signedIn ? (
                <>
                  Open your app <ArrowRight size={16} />
                </>
              ) : (
                <>
                  Get started — free <ArrowRight size={16} />
                </>
              )}
            </Link>
            <a
              href="#pricing"
              className="border border-praxa-line px-6 py-3.5 rounded-full text-base font-medium text-praxa-ink hover:border-praxa-accent transition-colors"
            >
              See pricing
            </a>
          </div>
          <p className="mt-4 text-xs text-praxa-subtle">No card · No commitment · Your data is yours</p>
        </ScrollReveal>
      </section>

      {/* Truth + journal */}
      <section id="truth" className="bg-white border-y border-praxa-line">
        <div className="max-w-5xl mx-auto px-6 py-16 lg:py-24 grid grid-cols-12 gap-10 lg:gap-12 items-center">
          <ScrollReveal className="col-span-12 lg:col-span-6 order-2 lg:order-1">
            <div className="text-xs uppercase tracking-[0.2em] text-praxa-sage mb-3">The truth nobody tells you</div>
            <h2 className="font-semibold text-3xl lg:text-4xl tracking-tight leading-tight">
              Insurance loves when you say &ldquo;I&apos;m fine.&rdquo;
            </h2>
            <p className="mt-5 text-praxa-subtle leading-relaxed">
              After an accident, people downplay pain to be polite or tough. Six months later, adjusters pull up that recording. Praxa helps you describe what you actually feel — accurately — every day.
            </p>
            <p className="mt-4 text-praxa-subtle leading-relaxed">
              Logged. Timestamped. Exportable. So the truth has a record when it matters.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100} className="col-span-12 lg:col-span-6 order-1 lg:order-2">
            <PainJournalMock />
          </ScrollReveal>
        </div>
      </section>

      {/* Insurance coach */}
      <section className="max-w-5xl mx-auto px-6 py-16 lg:py-24 grid grid-cols-12 gap-10 lg:gap-12 items-center">
        <ScrollReveal className="col-span-12 lg:col-span-6">
          <InsuranceCoachMock />
        </ScrollReveal>
        <ScrollReveal delay={100} className="col-span-12 lg:col-span-6">
          <div className="text-xs uppercase tracking-[0.2em] text-praxa-sage mb-3 flex items-center gap-2">
            <Sparkles size={14} /> Insurance Coach AI
          </div>
          <h2 className="font-light text-3xl lg:text-4xl tracking-tight leading-tight">
            Know what to say <span className="text-praxa-accent font-semibold">before</span> the adjuster calls.
          </h2>
          <p className="mt-5 text-praxa-subtle leading-relaxed">
            Translate scary letters into plain English. Practice recorded-statement scripts. Get UPL-safe coaching that always ends with: talk to a licensed attorney for case-specific advice.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-praxa-ink/80">
            {["Recorded statement prep", "Demand letter decoder", "Adjuster call scripts", "Settlement offer context"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check size={14} className="text-praxa-sage shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </section>

      {/* Doctors */}
      <section id="doctors" className="bg-white border-y border-praxa-line">
        <div className="max-w-5xl mx-auto px-6 py-16 lg:py-24 grid grid-cols-12 gap-10 lg:gap-12 items-center">
          <ScrollReveal className="col-span-12 lg:col-span-6">
            <div className="text-xs uppercase tracking-[0.2em] text-praxa-sage mb-3">Doctor match</div>
            <h2 className="font-light text-3xl lg:text-4xl tracking-tight leading-tight">
              Request care that fits{" "}
              <span className="text-praxa-accent font-semibold">your ZIP.</span>
            </h2>
            <p className="mt-5 text-praxa-subtle leading-relaxed max-w-md">
              Tell us where you are and what you need. A coordinator follows up with vetted options —
              including providers who may accept a Letter of Protection. No fake instant map of
              doctors we don&apos;t have.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-praxa-ink/80 max-w-md">
              {[
                "Real match request — not a stock provider list",
                "Orthopedics, PT, imaging, chiropractic, mental health",
                "LOP preference when you need treatment before settlement",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check size={14} className="text-praxa-sage shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </ScrollReveal>
          <ScrollReveal delay={100} className="col-span-12 lg:col-span-6">
            <DoctorMatchMock />
          </ScrollReveal>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-16 lg:py-20">
        <ScrollReveal>
          <h2 className="font-semibold text-2xl lg:text-3xl tracking-tight text-center mb-10">Everything in your pocket</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: BookOpen, title: "Symptom Journal", body: "Daily pain log, sleep, activities, optional photo. Timestamped CSV export when you need a record." },
              { icon: Phone, title: "Insurance Coach", body: "Adjuster called? Here's what to say — and what never to say on a recorded line." },
              { icon: ShieldCheck, title: "Doctor Match", body: "Request vetted care near you. We follow up — we don't invent a live network on the screen." },
              { icon: Heart, title: "Settlement estimator", body: "Educational dollar bands from injury + treatment + liability clarity. Not a valuation of your case." },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-praxa-line hover:shadow-md transition-shadow">
                <f.icon className="text-praxa-accent mb-3" size={22} strokeWidth={1.6} />
                <div className="font-semibold text-lg">{f.title}</div>
                <p className="mt-2 text-sm text-praxa-subtle leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white border-y border-praxa-line">
        <div className="max-w-5xl mx-auto px-6 py-16 lg:py-24">
          <ScrollReveal>
            <div className="text-xs uppercase tracking-[0.2em] text-praxa-sage mb-3 text-center">Pricing</div>
            <h2 className="font-semibold text-3xl lg:text-4xl tracking-tight text-center">Honest numbers. No surprises.</h2>
            <p className="mt-4 text-praxa-subtle text-center max-w-lg mx-auto">
              Free forever for the basics — including one educational settlement estimate.
              Premium unlocks unlimited runs. Card checkout is not live yet; request Premium or redeem a code.
            </p>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              {PRAXA_TIERS.map((t) => (
                <div
                  key={t.name}
                  data-testid={`praxa-tier-${t.name.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`rounded-2xl p-6 lg:p-8 flex flex-col border ${
                    t.popular ? "border-praxa-accent bg-praxa-ink text-white shadow-xl md:scale-[1.02]" : "border-praxa-line bg-praxa-bg"
                  }`}
                >
                  {t.popular && (
                    <div className="text-[10px] uppercase tracking-[0.2em] text-praxa-accent mb-2 font-semibold">Most popular</div>
                  )}
                  <div className={`font-semibold text-xl ${t.popular ? "text-white" : ""}`}>{t.name}</div>
                  <div className={`text-xs mt-1 ${t.popular ? "text-white/60" : "text-praxa-subtle"}`}>{t.sub}</div>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className={`text-4xl font-semibold tabular ${t.popular ? "text-white" : ""}`}>
                      {t.price === 0 ? "Free" : `$${t.price}`}
                    </span>
                    {t.price > 0 && !t.once && (
                      <span className={`text-xs ${t.popular ? "text-white/60" : "text-praxa-subtle"}`}>/mo</span>
                    )}
                    {t.once && <span className={`text-xs ${t.popular ? "text-white/60" : "text-praxa-subtle"}`}> once</span>}
                  </div>
                  <ul className={`mt-6 space-y-2 text-sm flex-1 ${t.popular ? "text-white/85" : "text-praxa-ink/80"}`}>
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check size={12} className="text-praxa-accent mt-1 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={appHref}
                    className={`mt-8 block text-center py-3 rounded-full text-sm font-medium transition-opacity ${
                      t.popular ? "bg-praxa-accent text-white hover:opacity-90" : "bg-praxa-ink text-white hover:opacity-90"
                    }`}
                  >
                    {signedIn ? "Open app" : t.price === 0 ? "Start free" : "Get started"}
                  </Link>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-16 lg:py-20">
        <ScrollReveal>
          <div className="bg-praxa-ink text-white rounded-3xl p-10 lg:p-14 text-center">
            <h2 className="font-semibold text-3xl lg:text-4xl tracking-tight">Start tonight.</h2>
            <p className="mt-4 text-white/70 max-w-lg mx-auto leading-relaxed">
              Five minutes to set up. Log today&apos;s pain before you forget how it actually felt.
            </p>
            <Link
              to={appHref}
              className="mt-8 inline-flex items-center gap-2 bg-praxa-accent text-white px-8 py-3.5 rounded-full font-medium hover:opacity-90"
              data-testid="praxa-cta-bottom"
            >
              {signedIn ? (
                <>
                  Open app <ArrowRight size={16} />
                </>
              ) : (
                <>
                  Sign up free <ArrowRight size={16} />
                </>
              )}
            </Link>
          </div>
          <p className="mt-8 text-xs text-praxa-subtle text-center max-w-2xl mx-auto leading-relaxed">
            Praxa provides legal information, not legal advice. For specific legal advice about your case, talk to a licensed attorney in your state. We can connect you with one from our partner network.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center">
            <a
              href="https://www.goldmedalinjury.com/free-consultation"
              className="text-sm text-praxa-sage hover:underline"
              data-testid="praxa-gmi-intake"
            >
              Need a free case review? Gold Medal Injury →
            </a>
            <span className="hidden text-praxa-line sm:inline" aria-hidden>
              ·
            </span>
            <a
              href="https://www.praxiumlaw.com/"
              className="text-sm text-praxa-sage hover:underline"
              data-testid="praxa-firm-os"
            >
              For law firms? Praxium Suite →
            </a>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
