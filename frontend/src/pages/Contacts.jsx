import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { CONTACT_KINDS } from "@/lib/utils";
import PageLoader from "@/components/common/PageLoader";
import EmptyState from "@/components/common/EmptyState";

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (kind) params.set("kind", kind);
    if (search) params.set("search", search);
    api.get(`/contacts?${params}`)
      .then((r) => setContacts(r.data))
      .finally(() => setLoading(false));
  }, [search, kind]);

  if (loading && contacts.length === 0) return <PageLoader label="Loading contacts…" />;

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="overline mb-2">// contacts // {contacts.length} total</div>
          <h1 className="font-display font-black text-3xl tracking-tight">Contacts</h1>
        </div>
        <Link to="/contacts/new" className="btn-praxium" data-testid="contacts-new"><Plus size={14} /> Add</Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-praxium-subtle" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone, patient ID..."
            data-testid="contacts-search"
            className="w-full pl-9 pr-3 py-2 border border-praxium-line rounded-sm text-sm" />
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value)} data-testid="contacts-filter-kind"
          className="px-3 py-2 border border-praxium-line rounded-sm text-xs font-mono bg-white">
          <option value="">All types</option>
          {CONTACT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          title="No contacts yet"
          body="Add clients, providers, and opposing counsel to link them to matters."
          actionLabel="Add contact"
          actionTo="/contacts/new"
          testId="contacts-empty"
        />
      ) : (
      <div className="data-card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-praxium-bg border-b border-praxium-line">
              <th className="text-left px-4 py-2 overline">Name</th>
              <th className="text-left px-4 py-2 overline">Type</th>
              <th className="text-left px-4 py-2 overline">Patient ID</th>
              <th className="text-left px-4 py-2 overline">Email</th>
              <th className="text-left px-4 py-2 overline">Phone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-praxium-line">
            {contacts.map((c) => (
              <tr key={c.id} className="hover:bg-praxium-bg">
                <td className="px-4 py-2">
                  <Link to={`/contacts/${c.id}`} className="font-medium text-praxium-accent hover:underline" data-testid={`contact-row-${c.id}`}>{c.name}</Link>
                </td>
                <td className="px-4 py-2 text-xs"><span className="status-pip bg-zinc-100">{c.kind}</span></td>
                <td className="px-4 py-2 font-mono text-xs">{c.patient_id || "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{c.email || "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{c.phone || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
