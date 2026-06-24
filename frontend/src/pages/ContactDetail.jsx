import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { ChevronLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function ContactDetail() {
  const { id } = useParams();
  const [contact, setContact] = useState(null);

  useEffect(() => {
    api.get(`/contacts/${id}`).then((r) => setContact(r.data));
  }, [id]);

  if (!contact) return <div className="p-8 font-mono text-xs">loading...</div>;

  return (
    <div className="px-6 py-6 max-w-3xl">
      <Link to="/contacts" className="text-xs font-mono text-praxium-subtle hover:text-praxium-accent flex items-center gap-1 mb-4">
        <ChevronLeft size={12} /> all contacts
      </Link>
      <div className="overline mb-2">// {contact.kind} {contact.patient_id ? `// ${contact.patient_id}` : ""}</div>
      <h1 className="font-display font-black text-3xl tracking-tight" data-testid="contact-name-display">{contact.name}</h1>

      <div className="grid grid-cols-2 gap-px bg-praxium-line border border-praxium-line mt-8">
        {["email", "phone", "organization", "address", "date_of_birth"].map((k) => (
          <div key={k} className="bg-praxium-surface p-4">
            <div className="overline">{k.replace(/_/g, " ")}</div>
            <div className="mt-1 font-mono text-sm">{contact[k] || "—"}</div>
          </div>
        ))}
      </div>

      {contact.notes && (
        <div className="mt-5 data-card p-5">
          <div className="overline mb-2">// notes</div>
          <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
        </div>
      )}
      <div className="mt-5 text-[10px] font-mono text-praxium-subtle">created {formatDate(contact.created_at)}</div>
    </div>
  );
}
