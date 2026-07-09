import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plug, KeyRound, CheckCircle2, XCircle, Trash2, FlaskConical, Bot, Mail } from "lucide-react";
import PageLoader from "@/components/common/PageLoader";
import { toast } from "sonner";

const PROVIDER_META = {
  anthropic: {
    icon: Bot,
    title: "CoCounsel AI — Anthropic",
    blurb:
      "Powers the CoCounsel sidebar (⌘J) and the Praxa insurance coach. Paste an Anthropic API key (sk-ant-…). Stored encrypted; never shown again in full.",
    placeholder: "sk-ant-api03-…",
    docs: "https://platform.claude.com/",
  },
  resend: {
    icon: Mail,
    title: "Email — Resend",
    blurb:
      "Sends portal magic links, NativeSign signature invites, and secure-upload links. Paste a Resend API key (re_…) and the From address for a verified domain.",
    placeholder: "re_…",
    docs: "https://resend.com/api-keys",
  },
};

function ProviderCard({ item, onSaved }) {
  const meta = PROVIDER_META[item.provider] || {};
  const Icon = meta.icon || Plug;
  const [keyInput, setKeyInput] = useState("");
  const [emailFrom, setEmailFrom] = useState(item.email_from || "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    if (!keyInput.trim() && item.provider !== "resend") {
      toast.error("Paste a key first");
      return;
    }
    setSaving(true);
    try {
      const body = {};
      if (keyInput.trim()) body.api_key = keyInput.trim();
      if (item.provider === "resend") body.email_from = emailFrom;
      await api.put(`/integrations/providers/${item.provider}`, body);
      toast.success(`${meta.title || item.provider} saved`);
      setKeyInput("");
      setTestResult(null);
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not save key");
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await api.post(`/integrations/providers/${item.provider}/test`);
      setTestResult(r.data);
      if (r.data.ok) toast.success("Connection test passed");
      else toast.error("Connection test failed");
    } catch (err) {
      setTestResult({ ok: false, detail: err?.response?.data?.detail || "Test request failed" });
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Remove the stored ${meta.title || item.provider} key?`)) return;
    try {
      await api.delete(`/integrations/providers/${item.provider}`);
      toast.success("Key removed");
      setTestResult(null);
      onSaved();
    } catch {
      toast.error("Could not remove key");
    }
  };

  return (
    <div className="mt-4 data-card p-5" data-testid={`provider-${item.provider}`}>
      <div className="overline mb-1 flex items-center gap-2">
        <Icon size={12} /> // {item.provider}
      </div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-lg">{meta.title || item.label}</h2>
          <p className="text-sm text-praxium-subtle mt-1 max-w-xl">{meta.blurb}</p>
        </div>
        <div className="shrink-0 text-right">
          {item.configured ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-2 py-1">
              <CheckCircle2 size={12} /> connected · {item.source} · {item.masked_key}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-2 py-1">
              <XCircle size={12} /> no key attached
            </span>
          )}
        </div>
      </div>

      <form className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end" onSubmit={save}>
        <label className="text-xs block">
          <span className="font-mono uppercase text-praxium-subtle inline-flex items-center gap-1">
            <KeyRound size={11} /> API key {item.configured ? "(paste to replace)" : ""}
          </span>
          <input
            type="password"
            autoComplete="off"
            className="mt-1 w-full text-sm border border-praxium-line rounded-sm px-2 py-1.5 font-mono"
            placeholder={meta.placeholder}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            data-testid={`provider-${item.provider}-key-input`}
          />
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn-praxium text-sm" disabled={saving} data-testid={`provider-${item.provider}-save`}>
            {saving ? "Saving…" : "Attach key"}
          </button>
          {item.configured && (
            <>
              <button type="button" onClick={runTest} disabled={testing} className="btn-ghost text-sm" data-testid={`provider-${item.provider}-test`}>
                <FlaskConical size={13} /> {testing ? "Testing…" : "Test"}
              </button>
              {item.source === "vault" && (
                <button type="button" onClick={remove} className="btn-ghost text-sm text-rose-600 border-rose-200 hover:bg-rose-50">
                  <Trash2 size={13} />
                </button>
              )}
            </>
          )}
        </div>
        {item.provider === "resend" && (
          <label className="text-xs block sm:col-span-2">
            <span className="font-mono uppercase text-praxium-subtle">From address (verified domain)</span>
            <input
              className="mt-1 w-full sm:max-w-md text-sm border border-praxium-line rounded-sm px-2 py-1.5"
              placeholder="Praxium Law <mail@praxiumlaw.com>"
              value={emailFrom}
              onChange={(e) => setEmailFrom(e.target.value)}
            />
          </label>
        )}
      </form>

      {testResult && (
        <div
          className={`mt-3 text-xs font-mono border rounded-sm px-3 py-2 ${
            testResult.ok
              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : "text-rose-700 bg-rose-50 border-rose-200"
          }`}
          data-testid={`provider-${item.provider}-test-result`}
        >
          {testResult.ok ? "PASS" : "FAIL"} — {testResult.detail}
        </div>
      )}

      {!item.configured && (
        <p className="mt-3 text-xs text-praxium-subtle">
          Fallback env var: <code>{item.env_var}</code>. A key attached here takes effect within a minute — no redeploy.
        </p>
      )}
    </div>
  );
}

export default function SettingsIntegrations() {
  const [items, setItems] = useState(null);

  const load = () =>
    api
      .get("/integrations/providers")
      .then((r) => setItems(r.data.items))
      .catch(() => {
        setItems([]);
        toast.error("Could not load integrations (admin/partner role required)");
      });

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl">
      <div className="overline mb-2">// settings / integrations</div>
      <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-3">
        <Plug className="text-praxium-accent shrink-0" /> Integrations & API keys
      </h1>
      <p className="mt-2 text-sm text-praxium-subtle max-w-xl">
        Attach provider keys here to activate AI and email across the suite. Keys are encrypted at
        rest, masked after save, and every change is written to the audit log.
      </p>

      {items === null ? (
        <div className="mt-6">
          <PageLoader label="Loading integrations…" />
        </div>
      ) : (
        items.map((item) => <ProviderCard key={item.provider} item={item} onSaved={load} />)
      )}
    </div>
  );
}
