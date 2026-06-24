import { Phone, MessageSquare, Mic, Volume2, AlertCircle } from "lucide-react";

export default function VoxLine() {
  return (
    <div className="px-6 py-6">
      <div className="overline mb-2">// voxline // textline // mailengine</div>
      <h1 className="font-display font-black text-3xl tracking-tight flex items-center gap-3"><Phone className="text-praxium-accent" /> VoxLine</h1>
      <p className="text-sm text-praxium-subtle mt-2 max-w-2xl">Native calling, SMS, email. Powered by self-hosted FreeSWITCH on wholesale carrier (Phase 2). AI call transcription and voice cloning.</p>

      <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-sm">
        <AlertCircle size={13} className="text-amber-700" />
        <span className="text-xs font-mono text-amber-900">MOCKED — Phase 2 wires Telnyx wholesale + ElevenLabs voice cloning</span>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-px bg-praxium-line border border-praxium-line">
        {[
          { icon: Phone, title: "VoxLine", body: "Click-to-call any contact. Auto-recording with consent. AI transcription via Whisper. Inbound IVR." },
          { icon: MessageSquare, title: "TextLine", body: "2-way SMS, group, MMS, drip campaigns. TCPA compliant opt-in tracking." },
          { icon: Volume2, title: "MailEngine", body: "Transactional + bulk marketing email. Templates, segments, A/B, open tracking." },
          { icon: Mic, title: "VoiceID", body: "ElevenLabs Professional clones. Personalized voicemails. AI receptionist." },
        ].map((m) => (
          <div key={m.title} className="bg-praxium-surface p-5">
            <m.icon size={20} className="text-praxium-accent mb-3" />
            <div className="font-display font-bold">{m.title}</div>
            <p className="mt-2 text-xs text-praxium-subtle">{m.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 data-card p-8 text-center">
        <div className="overline mb-3">// call history</div>
        <p className="text-sm text-praxium-subtle">No calls yet. Once Telnyx is wired, you'll see call recordings + AI transcripts here.</p>
      </div>
    </div>
  );
}
