import { useEffect, useState } from "react";
import api from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

export default function Calendar() {
  const [tasks, setTasks] = useState([]);
  const [matters, setMatters] = useState([]);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    api.get("/tasks").then((r) => setTasks(r.data));
    api.get("/matters").then((r) => setMatters(r.data));
  }, []);

  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const daysInMonth = end.getDate();
  const startDay = start.getDay();

  const events = [
    ...tasks.filter((t) => t.due_date).map((t) => ({ ...t, kind: "task", date: t.due_date })),
    ...matters.filter((m) => m.sol_date).map((m) => ({ ...m, kind: "sol", date: m.sol_date, title: `SOL: ${m.title}` })),
  ];

  const eventsOnDay = (day) => {
    const d = new Date(month.getFullYear(), month.getMonth(), day).toDateString();
    return events.filter((e) => new Date(e.date).toDateString() === d);
  };

  return (
    <div className="px-6 py-6">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="overline mb-2">// calendar</div>
          <h1 className="font-display font-black text-3xl tracking-tight" data-testid="calendar-title">
            {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h1>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="btn-ghost px-2 py-1" data-testid="calendar-prev"><ChevronLeft size={14} /></button>
          <button onClick={() => setMonth(new Date())} className="btn-ghost text-xs px-3" data-testid="calendar-today">Today</button>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="btn-ghost px-2 py-1" data-testid="calendar-next"><ChevronRight size={14} /></button>
        </div>
      </div>

      <div className="data-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-praxium-line">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
            <div key={d} className="px-3 py-2 overline">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: startDay }).map((_, i) => <div key={`pad-${i}`} className="border-r border-b border-praxium-line bg-praxium-bg min-h-[100px]" />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayEvents = eventsOnDay(day);
            const isToday = new Date().toDateString() === new Date(month.getFullYear(), month.getMonth(), day).toDateString();
            return (
              <div key={day} data-testid={`calendar-day-${day}`} className="border-r border-b border-praxium-line p-1.5 min-h-[100px] hover:bg-praxium-bg/50">
                <div className={cn("text-xs font-mono w-6 h-6 flex items-center justify-center rounded-sm", isToday && "bg-praxium-accent-text text-white font-bold")}>{day}</div>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <div key={i} className={cn("text-[10px] px-1.5 py-0.5 rounded-sm truncate", e.kind === "sol" ? "bg-rose-100 text-rose-900" : "bg-blue-100 text-blue-900")}>
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <div className="text-[10px] text-praxium-subtle">+{dayEvents.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
