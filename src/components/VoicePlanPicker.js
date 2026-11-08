"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setVoicePlan, buyVoiceAddon } from "@/lib/stripe-actions";
import { VOICE_PLANS, VOICE_ADDONS } from "@/lib/voice-plans";
import { toast } from "@/lib/toast";

// Inside the current-plan box: add the AI phone receptionist to the subscription
// (one bill), switch minutes, remove it, or buy extra minutes.
export default function VoicePlanPicker({ current, used = 0, included = 0, addon = 0, hasSub, active, ready = true }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const left = Math.max(0, included - used) + Math.max(0, addon);
  const pct = included ? Math.min(100, Math.round((used / included) * 100)) : 0;

  async function pick(key) {
    const plan = VOICE_PLANS.find((p) => p.key === key);
    const msg = key
      ? `${current ? "Switch" : "Add"} ${plan.name} for $${plan.usd}/month? It's added to your current subscription${active ? " and the difference is charged now" : " and starts with your plan"}.`
      : "Remove the phone receptionist plan? Calls stop being answered at the end of your minutes.";
    if (!confirm(msg)) return;
    setBusy(key || "remove");
    const r = await setVoicePlan(key);
    setBusy("");
    if (!r?.ok) return toast.error("Couldn't change", r?.error);
    toast.success(key ? `${plan.name} added` : "Voice plan removed", key ? `${plan.minutes} call minutes every month.` : "");
    router.refresh();
  }
  async function addon_(key) {
    setBusy(key);
    const r = await buyVoiceAddon(key);
    if (r?.url) { window.location.href = r.url; return; }
    setBusy("");
    toast.error("Couldn't start checkout", r?.error);
  }

  return (
    <div className="mt-5 border-t border-line pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-text">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-tint text-brand">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            </span>
            AI phone receptionist
          </p>
          <p className="mt-0.5 text-xs text-muted">Answers your calls, books appointments and sends you a summary. Added to your plan — one bill.</p>
        </div>
        {current && <span className="pill bg-brand-tint text-brand-dark">{left.toLocaleString()} minutes left</span>}
      </div>

      {!ready && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Voice plans switch on after a quick database update by NextReply.</p>}

      {current && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted"><span>{Math.round(used)} of {included} plan minutes used this month</span>{addon > 0 && <span>+ {Math.round(addon)} extra minutes</span>}</div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas"><div className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : "bg-brand"}`} style={{ width: `${pct}%` }} /></div>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {VOICE_PLANS.map((p) => {
          const on = current === p.key;
          return (
            <button key={p.key} type="button" disabled={!!busy || on || !ready} onClick={() => (hasSub ? pick(p.key) : toast.error("Choose a main plan first", "Pick Starter, Pro or Business below — then add voice here."))}
              className={`relative rounded-2xl border p-4 text-left transition ${on ? "border-brand bg-brand-tint/50 ring-1 ring-brand" : "border-line bg-surface hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md"} disabled:cursor-default`}>
              {p.popular && !on && <span className="absolute -top-2 right-3 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase text-white">Popular</span>}
              <p className="text-sm font-bold text-text">{p.minutes} minutes</p>
              <p className="text-xs text-muted">{p.note}</p>
              <p className="mt-2 text-xl font-extrabold text-text">${p.usd}<span className="text-xs font-medium text-muted">/mo</span></p>
              <p className="mt-0.5 text-[11px] text-muted">${(p.usd / p.minutes).toFixed(2)} per minute</p>
              <p className={`mt-3 text-xs font-semibold ${on ? "text-brand-dark" : "text-brand"}`}>{busy === p.key ? "Updating…" : on ? "✓ Your voice plan" : current ? "Switch to this" : "Add to my plan"}</p>
            </button>
          );
        })}
      </div>

      {current && (
        <div className="mt-4 rounded-2xl border border-line bg-canvas/50 p-4">
          <p className="text-xs font-semibold text-text">Need more minutes this month?</p>
          <p className="text-[11px] text-muted">One-time packs — they're used after your plan minutes and don't expire at month end.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {VOICE_ADDONS.map((a) => (
              <button key={a.key} type="button" disabled={!!busy} onClick={() => addon_(a.key)} className="btn-ghost px-3 py-2 text-xs">
                {busy === a.key ? "Opening…" : <>{a.name} · <b>${a.usd}</b></>}
              </button>
            ))}
          </div>
          <button type="button" disabled={!!busy} onClick={() => pick(null)} className="mt-3 text-[11px] font-semibold text-muted underline-offset-2 hover:text-red-600 hover:underline">Remove voice plan</button>
        </div>
      )}
    </div>
  );
}
