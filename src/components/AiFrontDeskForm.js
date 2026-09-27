"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveAiPersona } from "@/lib/ai-frontdesk-actions";

const LANGUAGES = ["Auto (match customer)", "English", "Arabic", "Urdu", "Hindi", "French", "Spanish", "Filipino", "Russian"];
const TONES = ["Warm and caring", "Friendly & casual", "Professional", "Playful", "Formal & polite"];
const LENGTHS = ["Short", "Balanced", "Detailed"];

function blank(b) {
  return {
    assistant_name: b?.assistant_name || "",
    primary_language: b?.primary_language || "Auto (match customer)",
    tone: b?.tone || "Warm and caring",
    reply_length: b?.reply_length || "Balanced",
    first_greeting: b?.first_greeting || "",
    final_message: b?.final_message || "",
    use_formal: b?.use_formal ?? false,
    use_emoji: b?.use_emoji ?? true,
  };
}

export default function AiFrontDeskForm({ businesses }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(businesses[0]?.id || "");
  const [form, setForm] = useState(blank(businesses[0]));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const b = businesses.find((x) => x.id === selectedId);
    setForm(blank(b));
    setSaved(false);
    setError("");
  }, [selectedId, businesses]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };

  async function save() {
    setSaving(true);
    setError("");
    const res = await saveAiPersona({ id: selectedId, ...form });
    setSaving(false);
    if (res && res.ok === false) { setError(res.error || "Could not save. Please try again."); return; }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {businesses.length > 1 && (
        <div className="card p-5">
          <label className="mb-1.5 block text-sm font-medium text-text">Editing business</label>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="field max-w-sm">
            {businesses.map((b) => (<option key={b.id} value={b.id}>{b.name || "Unnamed business"}</option>))}
          </select>
        </div>
      )}

      {/* Personality */}
      <div className="card space-y-5 p-6">
        <div>
          <h2 className="text-sm font-semibold text-text">Personality</h2>
          <p className="mt-0.5 text-xs text-muted">How your AI introduces itself and talks to customers.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Assistant name" value={form.assistant_name} onChange={(v) => set("assistant_name", v)} placeholder="Sara" hint="The name your AI uses to introduce itself." />
          <Select label="Primary language" value={form.primary_language} onChange={(v) => set("primary_language", v)} options={LANGUAGES} hint="“Auto” = reply in the customer’s own language." />
          <Select label="Tone" value={form.tone} onChange={(v) => set("tone", v)} options={TONES} />
          <Select label="Reply length" value={form.reply_length} onChange={(v) => set("reply_length", v)} options={LENGTHS} />
        </div>
      </div>

      {/* Greeting & closing */}
      <div className="card space-y-5 p-6">
        <div>
          <h2 className="text-sm font-semibold text-text">Greeting & closing</h2>
          <p className="mt-0.5 text-xs text-muted">Optional. Leave blank to let the AI write its own.</p>
        </div>
        <Area label="First greeting" value={form.first_greeting} onChange={(v) => set("first_greeting", v)} placeholder="Hello! I’m Sara from Glow Beauty Salon. How can I help you today? 😊" />
        <Area label="Final message" value={form.final_message} onChange={(v) => set("final_message", v)} placeholder="Thank you for reaching out! Have a lovely day 🌸" />
      </div>

      {/* Style */}
      <div className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-text">Style</h2>
        <Toggle label="Use formal address" desc="Speak to customers more formally and politely." value={form.use_formal} onChange={(v) => set("use_formal", v)} />
        <Toggle label="Use emojis" desc="Let the AI add a few friendly emojis." value={form.use_emoji} onChange={(v) => set("use_emoji", v)} />
      </div>

      {/* Save bar */}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-brand">{saving ? "Saving…" : "Save changes"}</button>
        {saved && <span className="text-sm font-medium text-brand">✓ Saved</span>}
        {error && <span className="text-sm font-medium text-red-500">{error}</span>}
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

function Select({ label, value, onChange, options, hint }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field">
        {options.map((o) => (<option key={o} value={o}>{o}</option>))}
      </select>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Toggle({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-canvas/40 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        {desc && <p className="text-xs text-muted">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        aria-pressed={value}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? "bg-brand" : "bg-line"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
