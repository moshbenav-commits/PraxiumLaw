import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

/** Stack $/attorney/mo derived from 15-attorney benchmark ($10,150 total). */
const STACK_PER_ATTY = 10150 / 15;
const PRO_PER_ATTY = 199;

const fmt = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function SavingsCalculator() {
  const [attorneys, setAttorneys] = useState(15);

  const { stackMonthly, praxiumMonthly, annualSavings } = useMemo(() => {
    const stackMonthly = Math.round(attorneys * STACK_PER_ATTY);
    const praxiumMonthly = attorneys * PRO_PER_ATTY;
    const annualSavings = (stackMonthly - praxiumMonthly) * 12;
    return { stackMonthly, praxiumMonthly, annualSavings };
  }, [attorneys]);

  return (
    <div className="mt-10 p-6 lg:p-8 bg-praxium-bg border border-praxium-line">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-praxium-subtle mb-2">
            // your firm size
          </div>
          <div className="font-display font-black text-2xl tabular">
            {attorneys} {attorneys === 1 ? "attorney" : "attorneys"}
          </div>
        </div>
        <div className="text-xs font-mono text-praxium-subtle">Pro tier · $199/user/mo</div>
      </div>

      <label htmlFor="attorney-slider" className="sr-only">
        Number of attorneys
      </label>
      <input
        id="attorney-slider"
        type="range"
        min={1}
        max={50}
        value={attorneys}
        onChange={(e) => setAttorneys(Number(e.target.value))}
        className="w-full h-1.5 appearance-none rounded-full bg-praxium-line accent-praxium-accent cursor-pointer"
        data-testid="savings-calculator-slider"
      />
      <div className="flex justify-between mt-2 text-[10px] font-mono text-praxium-subtle uppercase tracking-wider">
        <span>1</span>
        <span>50</span>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-px bg-praxium-line border border-praxium-line">
        <div className="bg-praxium-surface p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-praxium-subtle">Stack today</div>
          <div className="mt-2 font-display font-black text-3xl tabular">{fmt(stackMonthly)}</div>
          <div className="text-[10px] font-mono text-praxium-subtle mt-1">/mo estimated</div>
        </div>
        <div className="bg-praxium-ink text-white p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/50">With Praxium</div>
          <div className="mt-2 font-display font-black text-3xl tabular text-praxium-accent">{fmt(praxiumMonthly)}</div>
          <div className="text-[10px] font-mono text-white/50 mt-1">/mo all-in</div>
        </div>
        <div className="bg-praxium-surface p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-praxium-subtle">You save</div>
          <div className="mt-2 font-display font-black text-3xl tabular text-praxium-accent">{fmt(annualSavings)}</div>
          <div className="text-[10px] font-mono text-praxium-subtle mt-1">/year</div>
        </div>
      </div>

      <Link
        to="/signup"
        className="mt-6 inline-flex items-center gap-2 text-sm font-mono uppercase tracking-[0.15em] text-praxium-accent-text hover:underline group"
        data-testid="savings-calculator-cta"
      >
        Start with {attorneys} seats
        <ArrowUpRight size={14} className="group-hover:rotate-45 transition-transform" />
      </Link>
    </div>
  );
}
