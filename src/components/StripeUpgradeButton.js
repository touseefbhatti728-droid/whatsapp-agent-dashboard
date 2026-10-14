"use client";

import { useState } from "react";
import { createCheckoutSession } from "@/lib/stripe-actions";

export default function StripeUpgradeButton({ plan, current, popular }) {
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
      setErr((r && r.error) || "Could not start checkout.");
    } catch (e) {
      setErr((e && e.message) || "Could not start checkout.");
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
        {busy ? "Starting…" : "Upgrade"}
      </button>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </>
  );
}
