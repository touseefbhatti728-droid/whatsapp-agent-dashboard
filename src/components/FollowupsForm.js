"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { savePaymentSettings, saveFeedbackLoyalty, saveIntakeForm } from "@/lib/followup-actions";
import { toast } from "@/lib/toast";

function Toggle({ value, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-text">
      <button type="button" onClick={() => onChange(!value)} className={`relative h-6 w-11 rounded-full transition ${value ? "bg-brand" : "bg-line"}`} aria-pressed={value}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${value ? "left-[22px]" : "left-0.5"}`} />
      </button>
      {label}
    </label>
  );
}

function Card({ title, desc, children, onSave, busy }) {
  return (
    <section className="card space-y-4 p-6">
      <div>
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        {desc && <p className="mt-0.5 text-xs text-muted">{desc}</p>}
      </div>
      {children}
      {onSave && <button onClick={onSave} disabled={busy} className="btn-brand px-4 py-2 text-sm disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>}
    </section>
  );
}

export default function FollowupsForm({ biz, feedback }) {
  const router = useRouter();
  const [p, setP] = useState(biz);
  const [busy, setBusy] = useState("");
  const set = (k, v) => setP((s) => ({ ...s, [k]: v }));

  async function run(key, fn) {
    setBusy(key);
    const r = await fn();
    setBusy("");
    if (!r?.ok) return toast.error("Couldn't save", r?.error);
    toast.success("Saved");
    router.refresh();
  }

  const rated = feedback.filter((f) => f.rating);
  const avg = rated.length ? (rated.reduce((s, f) => s + f.rating, 0) / rated.length).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <Card title="Payments & deposits" desc="Your AI shares these when customers ask how to pay. With deposits on, every new booking gets your payment details and shows as 'deposit pending' in the calendar until you mark it paid."
        busy={busy === "pay"} onSave={() => run("pay", () => savePaymentSettings(p))}>
        <label className="block text-xs font-medium text-muted">Payment link (Stripe, Tabby, Tap, PayFast, any https link)
          <input value={p.payment_link} onChange={(e) => set("payment_link", e.target.value)} placeholder="https://buy.stripe.com/…" className="field mt-1" />
        </label>
        <label className="block text-xs font-medium text-muted">Other ways to pay (bank, JazzCash, Easypaisa, Raast…)
          <textarea value={p.payment_instructions} onChange={(e) => set("payment_instructions", e.target.value)} rows={2} className="field mt-1 resize-y" placeholder="e.g. Easypaisa 0300-1234567 (Ali Khan) — send a screenshot here after paying" />
        </label>
        <div className="flex flex-wrap items-end gap-4">
          <Toggle value={p.deposit_required} onChange={(v) => set("deposit_required", v)} label="Ask for a deposit after each booking" />
          <label className="text-xs font-medium text-muted">Deposit
            <input value={p.deposit_amount} onChange={(e) => set("deposit_amount", e.target.value)} placeholder="AED 100 or 20%" className="field mt-1 w-40" />
          </label>
          <label className="text-xs font-medium text-muted">Currency
            <input value={p.currency} onChange={(e) => set("currency", e.target.value)} className="field mt-1 w-24 uppercase" />
          </label>
        </div>
        <div className="rounded-xl bg-canvas p-4">
          <p className="text-xs font-semibold text-text">Messaging customers first (feedback, renewals, invoices)</p>
          <p className="mt-1 text-xs text-muted">WhatsApp only allows free messages within 24 hours of the customer's last message. For later messages create an approved template in WhatsApp Manager (category Utility) with the body <code className="rounded bg-surface px-1">Hi {"{{1}}"}, {"{{2}}"}</code> and put its name here. Without it, you get an alert to contact the customer yourself.</p>
          {!p.whatsappConnected && <p className="mt-2 text-xs text-amber-700">Connect WhatsApp first.</p>}
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_110px]">
            <input value={p.notify_template} onChange={(e) => set("notify_template", e.target.value)} placeholder="template_name" className="field font-mono text-sm" />
            <input value={p.notify_template_lang} onChange={(e) => set("notify_template_lang", e.target.value)} placeholder="en" className="field font-mono text-sm" />
          </div>
        </div>
      </Card>

      <Card title="Feedback after visits & loyalty" desc="A few hours after each appointment, customers get a 10-second rating link. Happy customers are asked for a Google review (set your link in Settings); unhappy ones alert you so you can fix it."
        busy={busy === "fb"} onSave={() => run("fb", () => saveFeedbackLoyalty(p))}>
        <div className="flex flex-wrap items-end gap-4">
          <Toggle value={p.feedback_enabled} onChange={(v) => set("feedback_enabled", v)} label="Ask for feedback" />
          <label className="text-xs font-medium text-muted">Hours after the appointment
            <input type="number" min={1} max={72} value={p.feedback_delay_hours} onChange={(e) => set("feedback_delay_hours", e.target.value)} className="field mt-1 w-28" />
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-4 border-t border-line pt-4">
          <Toggle value={p.loyalty_enabled} onChange={(v) => set("loyalty_enabled", v)} label="Loyalty rewards" />
          <label className="text-xs font-medium text-muted">Every … visits
            <input type="number" min={2} max={50} value={p.loyalty_visits} onChange={(e) => set("loyalty_visits", e.target.value)} className="field mt-1 w-24" />
          </label>
          <label className="flex-1 text-xs font-medium text-muted">earns
            <input value={p.loyalty_reward} onChange={(e) => set("loyalty_reward", e.target.value)} placeholder="a free blow-dry" className="field mt-1" />
          </label>
        </div>
        <p className="text-xs text-muted">Customers see their progress after each booking, and your AI reminds them of rewards. Mark a reward as given on the Clients page.</p>
      </Card>

      {feedback.length > 0 && (
        <Card title={`Latest feedback · ★ ${avg} average from ${rated.length}`}>
          <div className="divide-y divide-line rounded-xl border border-line">
            {feedback.map((f, i) => (
              <div key={i} className="p-3 text-sm">
                <p><span className={f.rating >= 4 ? "text-amber-500" : "text-red-500"}>{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</span> <span className="font-medium text-text">{f.customer_name || "Customer"}</span> <span className="text-muted">· {[f.service, f.staff_name].filter(Boolean).join(" with ")}</span></p>
                {f.comment && <p className="mt-1 text-muted">"{f.comment}"</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <IntakeBuilder initial={p.intake_form} onSaved={() => router.refresh()} />
    </div>
  );
}

function IntakeBuilder({ initial, onSaved }) {
  const [fields, setFields] = useState(initial.length ? initial.map((f) => ({ ...f, options: (f.options || []).join(", ") })) : []);
  const [busy, setBusy] = useState(false);
  const upd = (i, patch) => setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  async function save() {
    setBusy(true);
    const r = await saveIntakeForm(fields);
    setBusy(false);
    if (!r?.ok) return toast.error("Couldn't save", r?.error);
    toast.success(fields.length ? "Intake form saved" : "Intake form turned off");
    onSaved();
  }

  return (
    <Card title="Intake form before appointments" desc="After booking, customers get a link to answer these (medical history, allergies, goals…). Answers appear on the appointment in your calendar. Leave empty to turn off.">
      <div className="space-y-2">
        {fields.map((f, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3">
            <input value={f.label} onChange={(e) => upd(i, { label: e.target.value })} placeholder="Question, e.g. Any allergies?" className="field flex-1 py-1.5 text-sm" />
            <select value={f.type} onChange={(e) => upd(i, { type: e.target.value })} className="field w-32 py-1.5 text-sm">
              <option value="text">Text</option><option value="yesno">Yes / No</option><option value="choice">Choice</option>
            </select>
            {f.type === "choice" && <input value={f.options} onChange={(e) => upd(i, { options: e.target.value })} placeholder="Options, comma separated" className="field w-56 py-1.5 text-sm" />}
            <label className="flex items-center gap-1 text-xs text-muted"><input type="checkbox" checked={!!f.required} onChange={(e) => upd(i, { required: e.target.checked })} /> Required</label>
            <button onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))} className="text-xs font-semibold text-muted hover:text-red-500">Remove</button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFields((fs) => [...fs, { label: "", type: "text", options: "", required: false }])} className="btn-ghost px-3 py-1.5 text-sm">+ Add question</button>
        <button onClick={save} disabled={busy} className="btn-brand px-4 py-1.5 text-sm">{busy ? "Saving…" : "Save form"}</button>
      </div>
    </Card>
  );
}
