import { MapPin, Star, Shield, ArrowRight } from "lucide-react";

const DOCTORS = [
  {
    name: "Dr. Sarah Jenkins, M.D.",
    specialty: "Orthopedic Surgeon",
    distance: "3.2 mi · Brickell",
    rating: 4.9,
    reviews: 412,
    badges: ["Accepts LOP", "Treats pain now"],
    next: "Tue · 10:30 AM",
    initial: "SJ",
    accent: "#D4A373",
  },
  {
    name: "Apex Chiropractic",
    specialty: "Physical Therapy",
    distance: "1.5 mi · Coral Gables",
    rating: 4.8,
    reviews: 289,
    badges: ["Accepts LOP", "Same-day"],
    next: "Today · 4:00 PM",
    initial: "AC",
    accent: "#8A9A86",
  },
  {
    name: "Coastal Imaging",
    specialty: "MRI · CT · X-Ray",
    distance: "2.1 mi · Doral",
    rating: 4.7,
    reviews: 156,
    badges: ["Accepts LOP"],
    next: "Wed · 9:00 AM",
    initial: "CI",
    accent: "#D4A373",
  },
];

export default function DoctorMatchMock() {
  return (
    <div className="relative" data-testid="showcase-doctor-match">
      <div className="bg-white rounded-3xl shadow-2xl border border-praxa-line overflow-hidden max-w-md mx-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-praxa-line flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-praxa-sage font-semibold">
              Doctor Network
            </div>
            <div className="font-consumer font-semibold text-praxa-ink text-xl">
              3 matches near you
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-praxa-subtle">
            Miami · 33131
          </div>
        </div>

        {/* Mini map */}
        <div className="h-32 bg-praxa-bg relative overflow-hidden border-b border-praxa-line">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 130" fill="none">
            <path
              d="M 0 80 Q 100 20 200 60 T 400 50"
              stroke="#EAE5D9"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M 0 100 Q 80 60 160 90 T 400 80"
              stroke="#EAE5D9"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M 80 0 Q 100 70 60 130"
              stroke="#EAE5D9"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M 280 0 Q 290 80 320 130"
              stroke="#EAE5D9"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          {/* Pins */}
          <div className="absolute top-6 left-12 w-2 h-2 rounded-full bg-praxa-accent ring-4 ring-praxa-accent/20" />
          <div className="absolute top-16 left-32 w-2 h-2 rounded-full bg-praxa-sage ring-4 ring-praxa-sage/20" />
          <div className="absolute top-10 right-20 w-2 h-2 rounded-full bg-praxa-accent ring-4 ring-praxa-accent/20" />
          {/* You marker */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-praxa-ink ring-4 ring-white" />
            <div className="text-[9px] uppercase tracking-[0.15em] text-praxa-ink mt-1 font-semibold">
              You
            </div>
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-praxa-line">
          {DOCTORS.map((d, i) => (
            <div
              key={d.name}
              className={`px-5 py-4 flex items-start gap-3 ${
                i === 0 ? "bg-praxa-bg/60" : "bg-white"
              }`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-consumer font-semibold shrink-0"
                style={{ background: d.accent }}
              >
                {d.initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-consumer font-semibold text-praxa-ink leading-tight">
                  {d.name}
                </div>
                <div className="text-[11px] text-praxa-subtle">{d.specialty}</div>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-praxa-subtle">
                  <MapPin size={10} />
                  <span>{d.distance}</span>
                  <Star size={10} className="ml-1 text-praxa-accent fill-praxa-accent" />
                  <span className="text-praxa-ink font-medium">{d.rating}</span>
                  <span>({d.reviews})</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {d.badges.map((b) => (
                    <span
                      key={b}
                      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] font-semibold px-1.5 py-0.5 rounded-full bg-praxa-sage/15 text-praxa-sage border border-praxa-sage/30"
                    >
                      {b === "Accepts LOP" && <Shield size={9} />}
                      {b}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase tracking-[0.15em] text-praxa-subtle">
                  Next slot
                </div>
                <div className="text-[12px] text-praxa-ink font-medium">{d.next}</div>
                <button className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] font-semibold text-white bg-praxa-ink px-2.5 py-1 rounded-full">
                  Book <ArrowRight size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-praxa-bg text-[11px] text-praxa-subtle flex items-center gap-2">
          <Shield size={11} className="text-praxa-sage" />
          <span>Zero upfront cost. All providers accept Letter of Protection.</span>
        </div>
      </div>
    </div>
  );
}
