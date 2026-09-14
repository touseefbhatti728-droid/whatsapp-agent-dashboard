"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSubscription } from "@/lib/billing-actions";

const STATUSES = [
  { v: "trialing", label: "Trialing" },
  { v: "active", label: "Active" },
  { v: "past_due", label: "Past due" },
  { v: "cancelled", label: "Cancelled" },
];

export default function SubscriptionForm({ businessId, plans, current }) {
  const router = useRouter();
  const [plan, setPlan] = useState(current.plan || (plans[0]?.name ?? ""));
  const [status, setStatus] = useState(current.sub_status || "trialing");
  const [renews, setRenews] = useState(current.renews_at ? current.renews_at.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await setSubscription({ id: businessId, plan, sub_status: status, renews_at: renews || null });
    setSaving(false); setSaved(true);
    router.refresh();
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">Plan</label>
        <select value={plan} onChange={(e) => { setPlan(e.target.value); setSaved(false); }} className="field">
          {plans.map((p) => <option key={p.name} value={p.name}>{p.name} — ${p.price}/{p.interval}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">Status</label>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setSaved(false); }} className="field">
          {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">Renews on</label>
        <input type="date" value={renews} onChange={(e) => { setRenews(e.target.value); setSaved(false); }} className="field" />
      </div>
      <div className="sm:col-span-3 flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-brand">{saving ? "Saving…" : "Save subscription"}</button>
        {saved && <span className="text-sm font-medium text-brand">✓ Saved</span>}
      </div>
    </div>
  );
}
