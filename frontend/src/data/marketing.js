export const TIERS = [
  { name: "Solo", price: 49, sub: "for the lone gunner", features: ["Core firm OS", "Matters · Contacts · Tasks", "Documents + Notes", "Basic CoCounsel AI"] },
  { name: "Starter", price: 99, sub: "small firms (1–5 attys)", features: ["Everything in Solo", "CaseChat + NativeSign", "Report Studio + DocGen", "Intake Hub + Client Portal", "Conflict Checker"] },
  { name: "Pro", price: 199, sub: "most firms land here", popular: true, features: ["Everything in Starter", "CourtConnect + CourtFile", "MedConnect + DocScheduler", "VoxLine + TextLine", "Voice cloning (1 voice)", "Client mobile app", "Universal Inbox + Smart Folders", "Glass-Box AI"] },
  { name: "Marketplace", price: 299, sub: "lead-hungry firms", features: ["Everything in Pro", "LawMatch lead delivery", "AI MedChron summarizer", "Subrogation engine", "Settlement Comparables DB", "Co-counsel mode", "3 voice clones", "Priority support"] },
  { name: "Enterprise", price: 499, sub: "multi-office firms", features: ["Everything in Marketplace", "Multi-office + white-label", "Dedicated CSM + SLA", "MSA + mass-tort modules", "Custom integrations", "EMR pulls (Phase 3)"] },
];

export const LEAD_FEES = [
  { type: "Slip & fall / minor MVA", fee: 50 },
  { type: "Standard PI / soft tissue", fee: 150 },
  { type: "Catastrophic injury / wrongful death", fee: 500 },
  { type: "Mass tort qualifier", fee: 1000 },
];

export const PRAXA_TIERS = [
  { name: "Free", price: 0, sub: "Start tonight", features: ["Symptom journal", "Document locker", "Basic education", "Doctor directory browse"] },
  { name: "Premium", price: 9.99, sub: "most people upgrade here", popular: true, features: ["Full Insurance Coach AI", "Settlement estimator", "Priority attorney match", "Export-ready journal"] },
  { name: "Second opinion", price: 99, sub: "one-time", once: true, features: ["Partner attorney document review", "Written summary in 48 hrs", "Plain-English next steps"] },
];
