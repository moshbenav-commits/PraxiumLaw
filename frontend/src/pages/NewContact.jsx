import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { CONTACT_KINDS } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function NewContact() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", kind: "client", email: "", phone: "", organization: "", address: "", date_of_birth: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
      payload.kind = form.kind;
      const r = await api.post("/contacts", payload);
      toast.success("Contact added");
      nav("/contacts");
    } catch { toast.error("Failed"); } finally { setLoading(false); }
  };

  return (
    <div className="px-6 py-6 max-w-2xl">
      <div className="overline mb-2">// new contact</div>
      <h1 className="font-display font-black text-3xl tracking-tight">Add contact</h1>
      <form onSubmit={submit} className="mt-8 space-y-4" data-testid="new-contact-form">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="overline block mb-1.5">Name</label>
            <input value={form.name} onChange={upd("name")} required data-testid="contact-name"
              className="w-full px-3 py-2 border border-praxium-line rounded-sm" />
          </div>
          <div>
            <label className="overline block mb-1.5">Type</label>
            <select value={form.kind} onChange={upd("kind")} data-testid="contact-kind"
              className="w-full px-3 py-2 border border-praxium-line rounded-sm bg-white">
              {CONTACT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="overline block mb-1.5">Email</label>
            <input value={form.email} onChange={upd("email")} type="email" data-testid="contact-email"
              className="w-full px-3 py-2 border border-praxium-line rounded-sm font-mono text-sm" />
          </div>
          <div>
            <label className="overline block mb-1.5">Phone</label>
            <input value={form.phone} onChange={upd("phone")} type="tel" data-testid="contact-phone"
              className="w-full px-3 py-2 border border-praxium-line rounded-sm font-mono text-sm" />
          </div>
        </div>
        {form.kind === "client" && (
          <div>
            <label className="overline block mb-1.5">Date of birth</label>
            <input type="date" value={form.date_of_birth} onChange={upd("date_of_birth")} data-testid="contact-dob"
              className="w-full px-3 py-2 border border-praxium-line rounded-sm font-mono" />
          </div>
        )}
        <div>
          <label className="overline block mb-1.5">Organization</label>
          <input value={form.organization} onChange={upd("organization")} data-testid="contact-org"
            className="w-full px-3 py-2 border border-praxium-line rounded-sm" />
        </div>
        <div>
          <label className="overline block mb-1.5">Address</label>
          <input value={form.address} onChange={upd("address")} data-testid="contact-address"
            className="w-full px-3 py-2 border border-praxium-line rounded-sm" />
        </div>
        <div>
          <label className="overline block mb-1.5">Notes</label>
          <textarea value={form.notes} onChange={upd("notes")} rows={3} data-testid="contact-notes"
            className="w-full px-3 py-2 border border-praxium-line rounded-sm" />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={loading} className="btn-praxium" data-testid="contact-submit">
            {loading ? <Loader2 className="animate-spin" size={14} /> : "Add contact"}
          </button>
          <button type="button" onClick={() => nav("/contacts")} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  );
}
