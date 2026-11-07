"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";
import { saveMembership, renewMembership, cancelMembership } from "@/lib/membership-actions";
import { formatPhone } from "@/lib/phone";
import { toast } from "@/lib/toast";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (iso, n) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
const daysLeft = (end) => Math.round((new Date(`${end}T00:00:00Z`) - new Date(`${today()}T00:00:00Z`)) / 86400000);
const nice = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default function MembershipsView({ rows }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState("active");
  const blank = { customer_name: "", customer_phone: "", plan_name: "", price: "", start_date: today(), end_date: plusDays(today(), 29), notes: "" };

  const active = rows.filter((r) => r.status === "active");
  const soon = active.filter((r) => daysLeft(r.end_date) <= 7);
  const shown = tab === "active" ? active : tab === "soon" ? soon : rows.filter((r) => r.status !== "active");

  async function renew(id) {
    const r = await renewMembership(id);
    if (!r.ok) return toast.error("Couldn't renew", r.error);
    toast.success("Renewed", `Now ends ${nice(r.end)}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-3 gap-3">
        <Stat label="Active members" value={active.length} />
        <Stat label="Ending in 7 days" value={soon.length} accent />
        <Stat label="Expired / cancelled" value={rows.length - active.length} />
      </section>

      {editing
        ? <Editor m={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />
        : <button onClick={() => setEditing(blank)} className="btn-brand px-4 py-2 text-sm">+ Add member</button>}

      <div className="card overflow-hidden">
        <div className="flex gap-2 border-b border-line px-4 py-3">
          {[["active", "Active"], ["soon", "Ending soon"], ["old", "Expired & cancelled"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-full px-3 py-1 text-xs font-semibold ${tab === k ? "bg-ink text-white" : "bg-canvas text-text"}`}>{l}</button>
          ))}
        </div>
        {shown.length === 0 ? <div className="px-5 py-12 text-center text-sm text-muted">Nobody here.</div> : (
          <div className="divide-y divide-line">
            {shown.map((m) => {
              const left = daysLeft(m.end_date);
              return (
                <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">{m.customer_name || formatPhone(m.customer_phone)} · <span className="font-normal">{m.plan_name}</span></p>
                    <p className="truncate text-xs text-muted">{[m.price, `${nice(m.start_date)} → ${nice(m.end_date)}`, m.reminders_sent ? `${m.reminders_sent} reminder${m.reminders_sent > 1 ? "s" : ""} sent` : null].filter(Boolean).join(" · ")}</p>
                  </div>
                  {m.status === "active"
                    ? <span className={`pill ${left <= 7 ? "bg-amber-50 text-amber-700" : "bg-brand-tint text-brand-dark"}`}>{left < 0 ? "ended" : left === 0 ? "ends today" : `${left} day${left === 1 ? "" : "s"} left`}</span>
                    : <span className="pill bg-canvas text-muted">{m.status}</span>}
                  <button onClick={() => renew(m.id)} className="btn-brand h-8 px-3 py-0 text-xs">Renew</button>
                  <button onClick={() => setEditing(m)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-text hover:bg-canvas">Edit</button>
                  {m.status === "active" && <ConfirmButton onConfirm={async () => { await cancelMembership(m.id); router.refresh(); }} label="Cancel" confirmLabel="Yes, cancel" className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted hover:text-red-500" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Editor({ m, onClose, onSaved }) {
  const [f, setF] = useState(m);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  async function save() {
    setBusy(true);
    const r = await saveMembership(f);
    setBusy(false);
    if (!r.ok) return toast.error("Couldn't save", r.error);
    toast.success("Membership saved");
    onSaved();
  }
  return (
    <div className="card space-y-3 p-6">
      <h2 className="text-sm font-semibold text-text">{f.id ? "Edit membership" : "New member"}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={f.customer_name || ""} onChange={(e) => set("customer_name", e.target.value)} placeholder="Member name" className="field" />
        <input value={f.customer_phone || ""} onChange={(e) => set("customer_phone", e.target.value)} placeholder="WhatsApp number with country code" className="field" inputMode="tel" />
        <input value={f.plan_name || ""} onChange={(e) => set("plan_name", e.target.value)} placeholder="Plan, e.g. Monthly gym" className="field" />
        <input value={f.price || ""} onChange={(e) => set("price", e.target.value)} placeholder="Price, e.g. AED 350/month" className="field" />
        <label className="text-xs font-medium text-muted">Starts<input type="date" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} className="field mt-1" /></label>
        <label className="text-xs font-medium text-muted">Ends<input type="date" value={f.end_date} onChange={(e) => set("end_date", e.target.value)} className="field mt-1" /></label>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {[["1 month", 29], ["3 months", 89], ["6 months", 181], ["1 year", 364]].map(([l, d]) => (
          <button key={l} type="button" onClick={() => set("end_date", plusDays(f.start_date, d))} className="rounded-full border border-line px-3 py-1 hover:bg-canvas">{l}</button>
        ))}
      </div>
      <textarea value={f.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Notes (optional)" className="field resize-y text-sm" />
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="btn-brand px-4 py-2 text-sm">{busy ? "Saving…" : "Save"}</button>
        <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="stat p-4">
      <div className="text-[13px] font-medium text-muted">{label}</div>
      <div className={`mt-2 text-[24px] font-bold leading-none ${accent ? "text-brand" : "text-text"}`}>{value}</div>
    </div>
  );
}
