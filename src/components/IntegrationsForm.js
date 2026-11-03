"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveWebhook } from "@/lib/integration-actions";

export default function IntegrationsForm({ businessId, initialUrl }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl || "");
  const [savedUrl, setSavedUrl] = useState(initialUrl || "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const dirty = url.trim() !== savedUrl;

  async function save() {
    setSaving(true); setMsg(null);
    const r = await saveWebhook({ id: businessId, webhook_url: url });
    setSaving(false);
    if (r.ok) {
      setSavedUrl(url.trim());
      setMsg({ ok: true, text: url.trim() ? "Saved. Every new booking will be sent here." : "Webhook removed." });
      router.refresh();
    } else setMsg({ ok: false, text: r.error });
  }

  async function test() {
    setTesting(true); setMsg(null);
    try {
      const res = await fetch("/api/integrations/test", { method: "POST" });
      const data = await res.json();
      setMsg(data.ok
        ? { ok: true, text: `Test booking sent (your tool answered ${data.status}). Check Zapier / Make / your CRM.` }
        : { ok: false, text: data.error || "No response from your webhook." });
    } catch { setMsg({ ok: false, text: "Test failed — could not reach your webhook." }); }
    setTesting(false);
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-text">CRM / Zapier webhook</h2>
        <p className="mt-1 text-sm text-muted">
          Paste a webhook URL from Zapier, Make, or your CRM. We'll send every new booking to it —
          connect it to HubSpot, Zoho, Google Sheets, or anything you like.
        </p>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-text">Webhook URL</label>
          <input value={url} onChange={(e) => { setUrl(e.target.value); setMsg(null); }} placeholder="https://hooks.zapier.com/hooks/catch/..." className="field font-mono text-xs" />
          <p className="mt-1 text-xs text-muted">Must be an https:// address. Leave empty and save to switch it off.</p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={save} disabled={saving || !dirty} className="btn-brand">{saving ? "Saving…" : "Save webhook"}</button>
          <button onClick={test} disabled={testing || !savedUrl || dirty} title={dirty ? "Save the URL first" : ""} className="btn-ghost">{testing ? "Sending…" : "Send test booking"}</button>
          <span className={`pill ${savedUrl ? "bg-brand-tint text-brand-dark" : "bg-canvas text-muted"}`}>{savedUrl ? "Connected" : "Not connected"}</span>
        </div>
        {msg && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-brand-tint/60 text-brand-dark" : "bg-red-50 text-red-600"}`}>{msg.text}</p>}
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-text">What we send (on each booking)</h2>
        <pre className="mt-3 max-w-full overflow-x-auto rounded-xl bg-canvas p-4 text-xs text-text">{`{
  "event": "booking.created",
  "business": "Your Business",
  "reference": "BK-1043",
  "customer_name": "Ali",
  "customer_phone": "9231...",
  "service": "Haircut",
  "date": "2026-05-12",
  "time": "16:00",
  "start_time": "2026-05-12T16:00:00+05:00"
}`}</pre>
      </div>
    </div>
  );
}