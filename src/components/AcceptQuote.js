"use client";

import { useState } from "react";
import { acceptQuote } from "@/lib/public-actions";

export default function AcceptQuote({ token, accepted }) {
  const [done, setDone] = useState(accepted);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (done) return <p className="rounded-lg bg-brand-tint px-3 py-2 text-center text-sm font-medium text-brand-dark">You accepted this quote — the team will contact you to book. ✅</p>;
  return (
    <>
      <button disabled={busy} onClick={async () => { setBusy(true); const r = await acceptQuote(token); setBusy(false); if (r.ok) setDone(true); else setErr(r.error); }}
        className="btn-ghost w-full py-3 text-sm font-semibold">{busy ? "Saving…" : "✓ Accept this quote"}</button>
      {err && <p className="text-center text-sm text-red-600">{err}</p>}
    </>
  );
}
