"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveBusinessInfo } from "@/lib/settings-actions";

function blank(b) {
  return {
    name: b?.name || "",
    location: b?.location || "",
    hours: b?.hours || "",
    services: b?.services || "",
    booking: b?.booking || "",
    faq: b?.faq || "",
    calendar_id: b?.calendar_id || "",
  };
}

export default function SettingsForm({ businesses }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(businesses[0]?.id || "");
  const [form, setForm] = useState(blank(businesses[0]));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const b = businesses.find((x) => x.id === selectedId);
    setForm(blank(b));
    setSaved(false);
  }, [selectedId, businesses]);

  const current = businesses.find((b) => b.id === selectedId) || {};
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };

  const [error, setError] = useState("");
  async function save() {
    setSaving(true);
    setError("");
    const res = await saveBusinessInfo({ id: selectedId, ...form });
    setSaving(false);
    if (res && res.ok) { setSaved(true); router.refresh(); }
    else setError((res && res.error) || "Couldn't save. Please try again.");
  }
  const waConnected = !!current.meta_phone_number_id;

  return (
    <div className="space-y-6">
      {businesses.length > 1 && (
        <div className="card p-5">
          <label className="mb-1.5 block text-sm font-medium text-text">Editing business</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(businesses.find((x) => String(x.id) === e.target.value)?.id ?? e.target.value)}
            className="field max-w-sm"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name || "Unnamed business"}</option>
            ))}
          </select>
        </div>
      )}

      {/* Connection (read-only) */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-text">WhatsApp connection</h2>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-canvas px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text">{waConnected && current.whatsapp_number ? "+" + String(current.whatsapp_number).replace(/\D/g, "") : "No number connected"}</p>
            <a href="/connect-whatsapp" className="text-xs font-semibold text-brand hover:text-brand-dark">{waConnected ? "Manage connection" : "Connect WhatsApp"}</a>
          </div>
          {waConnected
            ? <span className="pill bg-brand-tint text-brand-dark"><span className="h-1.5 w-1.5 rounded-full bg-brand" /> Connected</span>
            : <span className="pill bg-canvas text-muted">Not connected</span>}
        </div>
      </div>

      {/* Business info */}
      <div className="card space-y-5 p-6">
        <h2 className="text-sm font-semibold text-text">Business details</h2>
        <Field label="Business name" value={form.name} onChange={(v) => set("name", v)} placeholder="Glow Beauty Salon" />
        <Field label="Location" value={form.location} onChange={(v) => set("location", v)} placeholder="Business Bay, Dubai" />
        <Field label="Business hours" value={form.hours} onChange={(v) => set("hours", v)} placeholder="Mon–Sat, 10:00 AM – 8:00 PM" />
        <Area label="Services" value={form.services} onChange={(v) => set("services", v)} placeholder="Haircut, hair color, keratin treatment, facial…" hint="What you offer, with prices if you like." />
      </div>

      {/* Agent knowledge */}
      <div className="card space-y-5 p-6">
        <h2 className="text-sm font-semibold text-text">What the AI should know</h2>
        <p className="-mt-3 text-xs text-muted">Your AI receptionist uses this to answer customers.</p>
        <Area label="Booking rules" value={form.booking} onChange={(v) => set("booking", v)} placeholder="Appointments preferred; walk-ins allowed when free…" />
        <Area label="FAQ" value={form.faq} onChange={(v) => set("faq", v)} placeholder="Do you take walk-ins? Is parking available? …" hint="Common questions and their answers." />
      </div>

      {/* Calendar */}
      <div className="card space-y-5 p-6">
        <h2 className="text-sm font-semibold text-text">Calendar</h2>
        <Field label="Google Calendar ID" value={form.calendar_id} onChange={(v) => set("calendar_id", v)} placeholder="you@gmail.com" hint="Bookings are added to this calendar." />
      </div>

      {/* Save bar */}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-brand">
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-sm font-medium text-brand">✓ Saved</span>}
        {error && <span className="text-sm font-medium text-red-600">{error}</span>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, hint }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field" />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Area({ label, value, onChange, placeholder, hint }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="field resize-y" />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
