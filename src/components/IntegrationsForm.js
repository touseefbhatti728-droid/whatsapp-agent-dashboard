"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveWebhook } from "@/lib/integration-actions";

export default function IntegrationsForm({ businessId, initialUrl }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState("");

  async function save() {
    setSaving(true); setTestMsg("");
    const r = await saveWebhook({ id: businessId, webhook_url: url });
    setSaving(false);
    if (r.ok) { setSaved(true); router.refresh(); } else { setTestMsg("Error: " + r.error); }
  }

  async function test() {
    setTesting(true); setTestMsg("");
    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: businessId }),
      });
      const data = await res.json();
      setTestMsg(data.ok ? "✓ Test sent! Check your Zapier / Make." : "Test failed: " + (data.error || "no response"));
    } catch { setTestMsg("Test failed — could not reach your webhook."); }
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
          <input value={url} onChange={(e) => { setUrl(e.target.value); setSaved(false); }} placeholder="https://hooks.zapier.com/hooks/catch/..." className="field font-mono text-xs" />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={save} disabled={saving} className="btn-brand">{saving ? "Saving…" : "Save webhook"}</button>
          <button onClick={test} disabled={testing || !url} className="btn-ghost">{testing ? "Sending…" : "Send test"}</button>
          {saved && <span className="text-sm font-medium text-brand">✓ Saved</span>}
          {testMsg && <span className="text-sm text-muted">{testMsg}</span>}
        </div>
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