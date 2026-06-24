import { ScrollText, Upload, Users } from "lucide-react";

export default function NativeSign() {
  return (
    <div className="px-6 py-6">
      <div className="overline mb-2">// nativesign</div>
      <h1 className="font-display font-black text-3xl tracking-tight flex items-center gap-3"><ScrollText className="text-praxium-accent" /> NativeSign</h1>
      <p className="text-sm text-praxium-subtle mt-2 max-w-2xl">Native e-signature. Multi-signer, audit trail, templates. No DocuSign needed.</p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="data-card p-5">
          <Upload className="text-praxium-accent mb-3" size={20} />
          <div className="font-display font-bold mb-1">Upload & prepare</div>
          <p className="text-xs text-praxium-subtle">Drag-drop PDF, drag fields onto the document.</p>
        </div>
        <div className="data-card p-5">
          <Users className="text-praxium-accent mb-3" size={20} />
          <div className="font-display font-bold mb-1">Send to signers</div>
          <p className="text-xs text-praxium-subtle">Sequential or parallel signing. No account needed for signers.</p>
        </div>
        <div className="data-card p-5">
          <ScrollText className="text-praxium-accent mb-3" size={20} />
          <div className="font-display font-bold mb-1">Audit-trail PDF</div>
          <p className="text-xs text-praxium-subtle">Certificate with IP, timestamp, geolocation embedded.</p>
        </div>
      </div>

      <div className="mt-6 data-card p-8 text-center">
        <div className="overline mb-3">// envelopes</div>
        <p className="text-sm text-praxium-subtle">No envelopes yet. <button className="text-praxium-accent hover:underline" data-testid="esign-new">Start one →</button></p>
        <div className="mt-3 text-[10px] font-mono uppercase tracking-wider text-amber-600">UI scaffolded — full signer flow ships Phase 2</div>
      </div>
    </div>
  );
}
