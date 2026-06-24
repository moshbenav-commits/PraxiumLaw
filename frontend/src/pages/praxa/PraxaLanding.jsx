import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, BookOpen, Heart, Phone } from "lucide-react";
import PainJournalMock from "../../components/showcase/PainJournalMock";
import DoctorMatchMock from "../../components/showcase/DoctorMatchMock";

export default function PraxaLanding() {
  return (
    <div className="min-h-screen bg-praxa-bg text-praxa-ink praxa-surface">
      {/* Top */}
      <header className="border-b border-praxa-line backdrop-blur sticky top-0 bg-praxa-bg/70 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/praxa" className="flex items-center gap-2" data-testid="praxa-logo">
            <div className="w-8 h-8 rounded-full bg-praxa-accent flex items-center justify-center text-white font-bold">π</div>
            <span className="font-semibold text-lg tracking-tight">Praxa <span className="text-praxa-sage text-xs font-normal ml-0.5 uppercase tracking-widest">HQ</span></span>
          </Link>
          <Link to="/praxa/signup" className="bg-praxa-ink text-white px-5 py-2 rounded-full text-sm font-medium hover:opacity-90" data-testid="praxa-cta-top">
            Start free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div className="text-xs uppercase tracking-[0.2em] text-praxa-sage mb-6">For people who got hurt.</div>
        <h1 className="font-light text-5xl sm:text-6xl tracking-tight leading-[1.05] max-w-3xl">
          Don't let the insurance<br />
          <span className="text-praxa-accent font-semibold">play you.</span>
        </h1>
        <p className="mt-8 text-lg text-praxa-subtle max-w-2xl">
          Praxa is the streetwise friend who knows insurance. Track symptoms. Log conversations. Get coached on what to say (and not say). Find vetted doctors who treat now and bill the settlement.
        </p>
        <div className="mt-10 flex gap-3">
          <Link to="/praxa/signup" className="bg-praxa-accent text-white px-6 py-3 rounded-full text-base font-medium hover:opacity-90 flex items-center gap-2" data-testid="praxa-cta-hero">
            Get started — free <ArrowRight size={16} />
          </Link>
        </div>
        <div className="mt-3 text-xs text-praxa-subtle">No card. No commitment. Your data is yours.</div>
      </section>

      {/* The truth */}
      <section className="bg-white border-y border-praxa-line">
        <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-12 gap-8 items-center">
          <div className="col-span-12 lg:col-span-7">
            <div className="text-xs uppercase tracking-[0.2em] text-praxa-sage mb-3">The truth nobody tells you</div>
            <h2 className="font-semibold text-3xl tracking-tight">Be accurate. Not strong.</h2>
            <p className="mt-4 text-praxa-subtle leading-relaxed">
              After an accident, people say "I'm fine" when they're not — to be polite, to be tough, to avoid drama. Insurance companies <em>love</em> that. Six months later when your back still hurts, they pull up your "I'm fine" recording.
            </p>
            <p className="mt-4 text-praxa-subtle leading-relaxed">
              Praxa helps you describe what you actually feel — accurately — every day. Logged. Timestamped. Yours. So the truth has a record.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-5">
            <PainJournalMock />
          </div>
        </div>
      </section>

      {/* Doctor Match showcase */}
      <section className="bg-white border-y border-praxa-line">
        <div className="max-w-5xl mx-auto px-6 py-20 grid grid-cols-12 gap-10 items-center">
          <div className="col-span-12 lg:col-span-6">
            <div className="text-xs uppercase tracking-[0.2em] text-praxa-sage mb-3">Doctor Network · in-app</div>
            <h2 className="font-light text-4xl tracking-tight leading-[1.05]">
              Find treatment <span className="text-praxa-accent font-semibold">today.</span><br />
              Pay from settlement.
            </h2>
            <p className="mt-5 text-praxa-subtle leading-relaxed max-w-md">
              Every doctor in Praxa accepts a Letter of Protection — meaning zero out-of-pocket while your case resolves. Orthopedics, chiropractic, imaging, mental health. Vetted. Local. Bookable in 60 seconds.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 max-w-sm">
              {[
                { k: "Provider network", v: "2,400+" },
                { k: "LOP-accepting", v: "100%" },
                { k: "Avg wait", v: "< 48 hrs" },
                { k: "Out-of-pocket", v: "$0" },
              ].map((s) => (
                <div key={s.k} className="bg-praxa-bg rounded-xl p-3 border border-praxa-line">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-praxa-sage font-semibold">{s.k}</div>
                  <div className="font-consumer font-semibold text-praxa-ink text-lg mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6">
            <DoctorMatchMock />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: BookOpen, title: "Symptom Journal", body: "Daily pain log, sleep, activities affected. Photos of bruises over time. Timestamped, exportable, undeniable." },
            { icon: Phone, title: "Insurance Coach AI", body: "Adjuster called? Here's exactly what to say (and not say). Translate scary letters into plain English." },
            { icon: ShieldCheck, title: "Doctor Network", body: "Vetted doctors who treat now and accept Letter of Protection. No upfront cost." },
            { icon: Heart, title: "Settlement Estimator", body: "See what comparable cases settled for. No more guessing if an offer is fair." },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-6 border border-praxa-line">
              <f.icon className="text-praxa-accent mb-3" size={22} />
              <div className="font-semibold text-lg">{f.title}</div>
              <p className="mt-2 text-sm text-praxa-subtle leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-praxa-ink text-white rounded-3xl p-10 text-center">
          <h2 className="font-semibold text-3xl tracking-tight">Start tonight.</h2>
          <p className="mt-3 text-white/70 max-w-lg mx-auto">
            5 minutes to set up. Free forever for the basics. Premium $9.99/mo unlocks AI coach and settlement intelligence.
          </p>
          <Link to="/praxa/signup" className="mt-6 inline-flex items-center gap-2 bg-praxa-accent text-white px-6 py-3 rounded-full font-medium hover:opacity-90" data-testid="praxa-cta-bottom">
            Sign up free <ArrowRight size={16} />
          </Link>
        </div>
        <p className="mt-8 text-xs text-praxa-subtle text-center max-w-2xl mx-auto">
          Praxa provides legal information, not legal advice. For specific legal advice about your case, talk to a licensed attorney in your state. We can connect you with one from our partner network.
        </p>
        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-praxa-sage hover:underline">For law firms? Visit Praxium Suite at www.praxiumlaw.com →</Link>
        </div>
      </section>
    </div>
  );
}
