import { BookOpen, Sparkles, Calendar } from "lucide-react";

const ENTRIES = [
  {
    date: "Today · 8:00 AM",
    score: 7,
    note: "Couldn't sleep on right side. Sharp pain down left leg.",
    tags: ["sleep affected", "radiating pain"],
  },
  {
    date: "Yesterday · 9:15 PM",
    score: 6,
    note: "PT helped for ~2 hrs, then stiffness returned.",
    tags: ["PT"],
  },
  {
    date: "Mon · 7:40 AM",
    score: 8,
    note: "Can't bend to put on socks. Wife had to help.",
    tags: ["mobility"],
  },
];

export default function PainJournalMock() {
  return (
    <div className="relative max-w-md mx-auto" data-testid="showcase-pain-journal">
      {/* Phone frame */}
      <div className="bg-praxa-ink rounded-[2.5rem] p-2 shadow-2xl border border-praxa-line/30">
        <div className="bg-white rounded-[2rem] overflow-hidden">
          {/* Phone notch */}
          <div className="h-6 flex items-center justify-center bg-white">
            <div className="w-16 h-1 bg-praxa-ink/10 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-6 pb-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-praxa-sage font-medium">
                Today
              </div>
              <div className="font-consumer font-semibold text-praxa-ink text-2xl">
                How's the pain?
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-praxa-bg flex items-center justify-center text-praxa-ink font-semibold">
              JS
            </div>
          </div>

          {/* Pain scale */}
          <div className="px-6 pb-5">
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className={`h-10 rounded-md ${
                    i < 7
                      ? "bg-praxa-accent"
                      : "bg-praxa-line"
                  } ${i === 6 ? "ring-2 ring-praxa-ink" : ""}`}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-praxa-subtle font-medium">
              <span>fine</span>
              <span className="text-praxa-ink font-semibold">7/10 · same as Monday</span>
              <span>severe</span>
            </div>
          </div>

          {/* AI coach */}
          <div className="mx-6 mb-5 bg-praxa-bg rounded-2xl p-4 border border-praxa-line">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-praxa-sage font-semibold">
              <Sparkles size={11} className="text-praxa-accent" />
              Praxa coach
            </div>
            <div className="mt-2 text-[13px] text-praxa-ink leading-relaxed">
              "Be accurate. Not strong. If your back hurts at a 7, say a 7. Don't say 'I'm fine'."
            </div>
          </div>

          {/* Timeline */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-praxa-sage font-semibold">
                <BookOpen size={11} /> Symptom log
              </div>
              <span className="text-[10px] text-praxa-subtle">12 days · exportable</span>
            </div>
            <div className="space-y-3">
              {ENTRIES.map((e, i) => (
                <div key={i} className="border-l-2 border-praxa-accent/60 pl-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={10} className="text-praxa-sage" />
                    <span className="text-[10px] uppercase tracking-[0.15em] text-praxa-subtle">
                      {e.date}
                    </span>
                    <span className="ml-auto font-consumer font-semibold text-praxa-ink text-sm tabular">
                      {e.score}/10
                    </span>
                  </div>
                  <div className="mt-1 text-[13px] text-praxa-ink leading-snug">
                    {e.note}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {e.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-praxa-bg text-praxa-sage border border-praxa-line"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating note */}
      <div className="hidden md:block absolute -right-6 top-32 translate-x-full bg-white border border-praxa-line shadow-xl rounded-xl p-3 max-w-[180px]">
        <div className="text-[10px] uppercase tracking-[0.18em] text-praxa-sage font-semibold">
          Insurance-grade
        </div>
        <div className="mt-1 text-[12px] text-praxa-ink leading-snug">
          Timestamped & exportable as a PDF for your attorney.
        </div>
      </div>
    </div>
  );
}
