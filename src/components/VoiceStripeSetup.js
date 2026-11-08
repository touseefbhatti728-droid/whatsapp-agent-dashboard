"use client";

import { useState } from "react";
import { adminSetupVoiceStripe } from "@/app/(admin)/admin/actions";
import { VOICE_PLANS, VOICE_ADDONS } from "@/lib/voice-plans";

// Admin: voice plans + add-ons, and a button that creates them in Stripe (or confirms they exist).
export default function VoiceStripeSetup({ counts }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  async function run() {
    setBusy(true);
    setRes(await adminSetupVoiceStripe());
    setBusy(false);
  }
  const idOf = (k) => res?.prices?.find((p) => p.key === k)?.priceId;
  return (
    <section className="card overflow-hidden">
      <div className="admin-hero flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-base font-bold">Voice plans (AI phone receptionist)</h2>
          <p className="text-xs text-white/75">Added on top of Starter / Pro / Business — one subscription, one bill. Prices live in Stripe.</p>
        </div>
        <button onClick={run} disabled={busy} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#5b21b6] shadow-lg hover:bg-white/90 disabled:opacity-60">{busy ? "Checking Stripe…" : res?.ok ? "✓ Set up in Stripe" : "Set up in Stripe"}</button>
      </div>
      {res && !res.ok && <p className="bg-red-50 px-5 py-2 text-xs text-red-600">{res.error}</p>}
      <div className="grid gap-3 p-5 sm:grid-cols-3">
        {VOICE_PLANS.map((p) => (
          <div key={p.key} className="rounded-2xl border border-line p-4">
            <p className="text-sm font-bold text-text">{p.minutes} minutes / month</p>
            <p className="mt-1 text-2xl font-extrabold text-text">${p.usd}<span className="text-xs font-medium text-muted">/mo</span></p>
            <p className="text-[11px] text-muted">${(p.usd / p.minutes).toFixed(2)}/min · {counts[p.key] || 0} customer{(counts[p.key] || 0) === 1 ? "" : "s"}</p>
            {idOf(p.key) && <p className="mt-2 truncate font-mono text-[10px] text-emerald-700">{idOf(p.key)}</p>}
          </div>
        ))}
      </div>
      <div className="border-t border-line px-5 py-4">
        <p className="text-xs font-semibold text-text">Add-ons (one-time extra minutes)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {VOICE_ADDONS.map((a) => (
            <span key={a.key} className="rounded-xl border border-line px-3 py-2 text-xs text-text">
              {a.name} · <b>${a.usd}</b>{idOf(a.key) && <span className="ml-2 font-mono text-[10px] text-emerald-700">{idOf(a.key)}</span>}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
