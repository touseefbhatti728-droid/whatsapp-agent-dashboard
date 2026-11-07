"use client";

import { useState } from "react";
import { linkWebsite } from "@/lib/setup-actions";

// Links a website (WordPress plugin) to this NextReply account, learns from it, and goes back.
export default function ConnectSite({ businessName, site, returnUrl, state }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function connect() {
    setBusy(true); setErr("");
    const r = await linkWebsite(site);
    if (!r.ok) { setBusy(false); return setErr(r.error); }
    const back = new URL(returnUrl);
    back.searchParams.set("nextreply_business", r.businessId);
    back.searchParams.set("state", state);
    window.location.href = back.toString();
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-text">Connect this website to <b>{businessName || "your NextReply account"}</b>?</p>
      <ul className="mx-auto max-w-sm space-y-1 text-left text-sm text-muted">
        <li>✓ Your AI chat bubble appears on the site</li>
        <li>✓ Your AI reads the site and learns your services and prices</li>
        <li>✓ You can add an online booking page with one shortcode</li>
      </ul>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button onClick={connect} disabled={busy} className="btn-brand w-full py-3 text-sm disabled:opacity-60">
        {busy ? "Connecting and reading your site… (up to 30 seconds)" : "Connect"}
      </button>
    </div>
  );
}
