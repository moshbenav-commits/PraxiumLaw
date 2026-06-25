import { Sparkles } from "lucide-react";

const MESSAGES = [
  {
    role: "user",
    text: "The adjuster wants a recorded statement tomorrow. What do I say?",
  },
  {
    role: "coach",
    text: "You can decline a recorded statement until you've spoken with counsel. If you do speak, stick to facts only — date, location, vehicles. Never say \"I'm fine.\"",
  },
  {
    role: "coach",
    text: "For specific legal advice about your case, talk to a licensed attorney in your state.",
    disclaimer: true,
  },
];

export default function InsuranceCoachMock() {
  return (
    <div className="relative max-w-md mx-auto" data-testid="showcase-insurance-coach">
      <div className="bg-praxa-ink rounded-[2.5rem] p-2 shadow-2xl border border-praxa-line/30">
        <div className="bg-white rounded-[2rem] overflow-hidden min-h-[340px] flex flex-col">
          <div className="h-6 flex items-center justify-center bg-white">
            <div className="w-16 h-1 bg-praxa-ink/10 rounded-full" />
          </div>
          <div className="px-5 py-3 border-b border-praxa-line flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-praxa-sage/20 flex items-center justify-center">
              <Sparkles size={14} className="text-praxa-sage" />
            </div>
            <div>
              <div className="font-consumer font-semibold text-sm text-praxa-ink">Insurance Coach</div>
              <div className="text-[10px] text-praxa-subtle">Legal information · not legal advice</div>
            </div>
          </div>
          <div className="flex-1 px-4 py-4 space-y-3 overflow-hidden">
            {MESSAGES.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-praxa-accent text-white rounded-br-md"
                      : m.disclaimer
                        ? "bg-praxa-bg text-praxa-subtle text-xs border border-praxa-line rounded-bl-md"
                        : "bg-praxa-bg text-praxa-ink border border-praxa-line rounded-bl-md"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
