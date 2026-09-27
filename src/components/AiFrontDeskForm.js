"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveAiPersona } from "@/lib/ai-frontdesk-actions";

const LANGUAGES = ["Auto (match customer)", "English", "Arabic", "Urdu", "Hindi", "French", "Spanish", "Filipino", "Russian"];
const TONES = ["Warm and caring", "Friendly & casual", "Professional", "Playful", "Formal & polite"];
const LENGTHS = ["Short", "Balanced", "Detailed"];
const TIMEZONES = ["Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Europe/London", "America/New_York", "America/Los_Angeles", "Australia/Sydney"];
const DAYS = [["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]];

function defaultHours() {
  const h = {};
  DAYS.forEach(([k]) => { h[k] = { on: k !== "sun", start: "09:00", end: "18:00" }; });
  return h;
}

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
    ai_hours_enabled: b?.ai_hours_enabled ?? false,
    ai_hours: b?.ai_hours || defaultHours(),
    after_hours_message: b?.after_hours_message || "",
    timezone: b?.timezone || "Asia/Dubai",
    handover_pause_minutes: b?.handover_pause_minutes ?? 120,
    handover_rules: b?.handover_rules || "",
    handover_notify: b?.handover_notify ?? true,
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
  const setDay = (dk, patch) => {
    setForm((f) => ({ ...f, ai_hours: { ...f.ai_hours, [dk]: { ...f.ai_hours[dk], ...patch } } }));
    setSaved(false);
  };

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

      {/* AI working hours */}
      <div className="card space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-text">AI working hours</h2>
            <p className="mt-0.5 text-xs text-muted">Limit when the AI replies automatically. Off means it replies 24/7.</p>
          </div>
          <Switch value={form.ai_hours_enabled} onChange={(v) => set("ai_hours_enabled", v)} />
        </div>

        {form.ai_hours_enabled && (
          <>
            <div className="max-w-xs">
              <Select label="Time zone" value={form.timezone} onChange={(v) => set("timezone", v)} options={TIMEZONES} />
            </div>

            <div className="divide-y divide-line rounded-xl border border-line">
              {DAYS.map(([dk, dl]) => {
                const d = form.ai_hours[dk] || { on: false, start: "09:00", end: "18:00" };
                return (
                  <div key={dk} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-24 text-sm font-medium text-text">{dl}</span>
                    <Switch value={d.on} onChange={(v) => setDay(dk, { on: v })} />
                    {d.on ? (
                      <div className="ml-auto flex items-center gap-2">
                        <input type="time" value={d.start} onChange={(e) => setDay(dk, { start: e.target.value })} className="field w-[120px] py-1.5" />
                        <span className="text-muted">–</span>
                        <input type="time" value={d.end} onChange={(e) => setDay(dk, { end: e.target.value })} className="field w-[120px] py-1.5" />
                      </div>
                    ) : (
                      <span className="ml-auto text-sm text-muted">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>

            <Area label="After-hours message (optional)" value={form.after_hours_message} onChange={(v) => set("after_hours_message", v)} placeholder="Thanks for your message! We’re closed right now but will reply during working hours 🙏" hint="Sent once when a customer messages outside working hours. Leave blank to stay silent." />
          </>
        )}
      </div>

      {/* Human handover */}
      <div className="card space-y-5 p-6">
        <div>
          <h2 className="text-sm font-semibold text-text">Human handover</h2>
          <p className="mt-0.5 text-xs text-muted">When the AI should step back and let your team take over.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Minutes the AI pauses after a handover" type="number" value={form.handover_pause_minutes} onChange={(v) => set("handover_pause_minutes", v)} placeholder="120" hint="After a handover, the AI stays quiet for this long so a person can reply." />
        </div>
        <Toggle label="Email me on handover" desc="Send an email alert when the AI hands a chat to your team." value={form.handover_notify} onChange={(v) => set("handover_notify", v)} />
        <Area label="Always hand to a human for…" value={form.handover_rules} onChange={(v) => set("handover_rules", v)} placeholder="Complaints, refund requests, legal or medical questions, angry customers…" hint="The AI will hand these off automatically." />
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

function Field({ label, value, onChange, placeholder, hint, type = "text" }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)} placeholder={placeholder} className="field" />
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
      <Switch value={value} onChange={onChange} />
    </div>
  );
}

function Switch({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? "bg-brand" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
