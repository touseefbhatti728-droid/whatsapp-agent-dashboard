"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { seedStarterCampaigns, addCampaign, updateCampaign, toggleCampaign, deleteCampaign } from "@/lib/campaign-actions";

const CATEGORY_LABEL = {
  reminder: "Appointment reminder",
  feedback: "Feedback request",
  reactivation: "Client reactivation",
  event: "Booking event",
  custom: "Custom",
};

function timingLabel(c) {
  const m = c.offset_minutes || 0;
  if (c.category === "event") return "when a booking is created";
  if (c.category === "reactivation") return `${Math.round(m / 1440)} days after visit`;
  if (c.category === "feedback") return m >= 60 ? `${Math.round(m / 60)}h after visit` : `${m} min after visit`;
  // reminder (before)
  if (m % 1440 === 0) return `${m / 1440} day(s) before`;
  if (m % 60 === 0) return `${m / 60} hour(s) before`;
  return `${m} min before`;
}

export default function CampaignsManager({ businesses, campaigns }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(businesses[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);

  const list = campaigns.filter((c) => c.business_id === selectedId);

  async function seed() {
    setBusy(true); setError("");
    const res = await seedStarterCampaigns(selectedId);
    setBusy(false);
    if (res && res.ok === false) { setError(res.error || "Could not create."); return; }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {businesses.length > 1 ? (
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="field max-w-xs">
            {businesses.map((b) => (<option key={b.id} value={b.id}>{b.name || "Unnamed business"}</option>))}
          </select>
        ) : <div />}
        <div className="flex items-center gap-2">
          {list.length === 0 && (
            <button onClick={seed} disabled={busy} className="btn-ghost">{busy ? "Creating…" : "Create starter campaigns"}</button>
          )}
          <button onClick={() => setShowNew((v) => !v)} className="btn-brand">+ New campaign</button>
        </div>
      </div>
      {error && <p className="text-sm font-medium text-red-500">{error}</p>}

      {showNew && (
        <NewCampaign businessId={selectedId} onDone={() => { setShowNew(false); router.refresh(); }} />
      )}

      {list.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm font-medium text-text">No campaigns yet</p>
          <p className="mt-1 text-sm text-muted">Click “Create starter campaigns” to add a ready-made set, or add your own.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((c) => (<Card key={c.id} c={c} onChanged={() => router.refresh()} />))}
        </div>
      )}
    </div>
  );
}

function Card({ c, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const [message, setMessage] = useState(c.message);
  const [busy, setBusy] = useState(false);

  async function toggle() { setBusy(true); await toggleCampaign({ id: c.id, active: !c.active }); setBusy(false); onChanged(); }
  async function save() { setBusy(true); await updateCampaign({ id: c.id, name, message }); setBusy(false); setEditing(false); onChanged(); }
  async function remove() { if (!confirm(`Delete "${c.name}"?`)) return; setBusy(true); await deleteCampaign(c.id); setBusy(false); onChanged(); }

  return (
    <div className={`card p-5 ${c.active ? "ring-1 ring-brand/40" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {editing
            ? <input value={name} onChange={(e) => setName(e.target.value)} className="field py-1.5 text-sm font-semibold" />
            : <p className="font-semibold text-text">{c.name}</p>}
          <p className="mt-0.5 text-xs text-muted">{CATEGORY_LABEL[c.category] || "Campaign"} · {timingLabel(c)}</p>
        </div>
        <button onClick={toggle} disabled={busy} aria-pressed={c.active}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${c.active ? "bg-brand" : "bg-line"}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${c.active ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {editing ? (
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="field mt-3 resize-y text-sm" />
      ) : (
        <div className="mt-3 rounded-xl bg-canvas/60 px-3.5 py-3 text-sm text-muted">{c.message}</div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <span className={`pill ${c.active ? "bg-brand-tint text-brand-dark" : "bg-canvas text-muted"}`}>{c.active ? "Active" : "Inactive"}</span>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {editing ? (
            <>
              <button onClick={save} disabled={busy} className="font-semibold text-brand hover:text-brand-dark">Save</button>
              <button onClick={() => { setEditing(false); setName(c.name); setMessage(c.message); }} className="text-muted">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="font-medium text-muted hover:text-text">Edit</button>
              <button onClick={remove} disabled={busy} className="font-medium text-muted hover:text-red-500">Delete</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const NEW_CATS = [
  { value: "reminder", label: "Appointment reminder (before)" },
  { value: "feedback", label: "Feedback request (after visit)" },
  { value: "reactivation", label: "Client reactivation (days after visit)" },
  { value: "custom", label: "Custom" },
];

function NewCampaign({ businessId, onDone }) {
  const [form, setForm] = useState({ name: "", category: "reminder", value: "", unit: "hours", message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toMinutes() {
    const v = Number(form.value) || 0;
    if (form.category === "reactivation") return v * 1440;
    if (form.unit === "days") return v * 1440;
    if (form.unit === "hours") return v * 60;
    return v;
  }

  async function add() {
    if (!form.name.trim()) { setError("Enter a name."); return; }
    if (!form.message.trim()) { setError("Enter a message."); return; }
    setBusy(true); setError("");
    const trigger = form.category === "reactivation" ? "after_no_visit" : form.category === "feedback" ? "after_visit" : "before";
    const res = await addCampaign({
      business_id: businessId, name: form.name, category: form.category,
      trigger_type: trigger, offset_minutes: toMinutes(), message: form.message,
    });
    setBusy(false);
    if (res && res.ok === false) { setError(res.error || "Could not add."); return; }
    onDone();
  }

  return (
    <div className="card space-y-3 p-5">
      <h3 className="text-sm font-semibold text-text">New campaign</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Campaign name" className="field" />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="field">
          {NEW_CATS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
        </select>
        {form.category !== "custom" && (
          <div className="flex items-center gap-2">
            <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} type="number" placeholder="e.g. 1" className="field w-24" />
            {form.category === "reactivation"
              ? <span className="text-sm text-muted">days after visit</span>
              : (
                <>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="field w-28">
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                    <option value="minutes">minutes</option>
                  </select>
                  <span className="text-sm text-muted">{form.category === "feedback" ? "after visit" : "before"}</span>
                </>
              )}
          </div>
        )}
      </div>
      <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} className="field resize-y" placeholder="Message… you can use {name}, {event_time_only}, {event_date_only}, {service_names}, {booking_link}" />
      <div className="flex items-center gap-3">
        <button onClick={add} disabled={busy} className="btn-brand">{busy ? "Adding…" : "Add campaign"}</button>
        <button onClick={onDone} className="btn-ghost">Cancel</button>
        {error && <span className="text-sm font-medium text-red-500">{error}</span>}
      </div>
      <p className="text-xs text-muted">Available placeholders: {"{name}"}, {"{event_time_only}"}, {"{event_date_only}"}, {"{service_names}"}, {"{booking_link}"}</p>
    </div>
  );
}
