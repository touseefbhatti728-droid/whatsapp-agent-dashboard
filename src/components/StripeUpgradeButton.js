"use client";

import { useState } from "react";
import { createCheckoutSession, createBillingPortalSession } from "@/lib/stripe-actions";
import { toast } from "@/lib/toast";

export default function StripeUpgradeButton({ plan, current, popular, label = "Upgrade" }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    setBusy(true);
    setErr("");
    try {
      const r = await createCheckoutSession(plan);
      if (r && r.ok && r.url) {
        window.location.href = r.url;
        return;
      }
      const msg = (r && r.error) || "Could not start checkout.";
      setErr(msg);
      toast.error("Checkout didn't start", msg);
    } catch (e) {
      const msg = (e && e.message) || "Could not start checkout.";
      setErr(msg);
      toast.error("Checkout didn't start", msg);
    }
    setBusy(false);
  }

  if (current) {
    return (
      <button
        disabled
        className={
          popular
            ? "mt-6 w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-ink opacity-90"
            : "mt-6 w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-muted"
        }
      >
        Your plan
      </button>
    );
  }

  const cls = popular
    ? "mt-6 w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-ink transition hover:opacity-90 disabled:opacity-60"
    : "mt-6 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60";

  return (
    <>
      <button onClick={go} disabled={busy} className={cls}>
        {busy ? "Opening checkout…" : label}
      </button>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </>
  );
}

export function ManageBillingButton() {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const r = await createBillingPortalSession();
      if (r && r.ok && r.url) { window.location.href = r.url; return; }
      toast.error("Couldn't open billing", (r && r.error) || undefined);
    } catch (e) {
      toast.error("Couldn't open billing", e?.message);
    }
    setBusy(false);
  }
  return (
    <button onClick={go} disabled={busy} className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-text transition hover:bg-black/[0.03] disabled:opacity-60">
      {busy ? "Opening…" : "Manage subscription"}
    </button>
  );
}
