"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveShopify } from "@/lib/social-actions";
import { toast } from "@/lib/toast";

// Let the AI answer "where is my order?" from the store's Shopify orders.
export default function ShopifyCard({ domain }) {
  const router = useRouter();
  const [d, setD] = useState(domain || "");
  const [t, setT] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(remove) {
    setBusy(true);
    const r = await saveShopify(remove ? "" : d, remove ? "" : t);
    setBusy(false);
    if (!r.ok) return toast.error("Couldn't connect", r.error);
    toast.success(r.removed ? "Shopify disconnected" : "Shopify connected", r.domain || "");
    setT(""); if (remove) setD("");
    router.refresh();
  }

  return (
    <div className="card space-y-4 p-6">
      <div>
        <h2 className="text-sm font-semibold text-text">Online store — Shopify order status</h2>
        <p className="mt-0.5 text-xs text-muted">Customers ask "where is my order?" and your AI answers with the real status and tracking. It only shares an order with the person who placed it (same WhatsApp number, or the order's email).</p>
      </div>
      {domain && <p className="text-sm text-text"><span className="pill bg-brand-tint text-brand-dark">Connected</span> <span className="ml-2">{domain}</span></p>}
      <ol className="list-decimal space-y-1 pl-5 text-xs text-muted">
        <li>In Shopify admin: Settings → Apps and sales channels → Develop apps → Create an app (name it NextReply).</li>
        <li>Configure Admin API scopes: tick <b>read_orders</b> → Save → Install app.</li>
        <li>Copy the Admin API access token (starts with <code>shpat_</code>) and paste it here with your store address.</li>
      </ol>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={d} onChange={(e) => setD(e.target.value)} placeholder="mystore.myshopify.com" className="field" />
        <input value={t} onChange={(e) => setT(e.target.value)} type="password" autoComplete="off" placeholder={domain ? "New token (to replace)" : "shpat_…"} className="field font-mono" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => save(false)} disabled={busy} className="btn-brand px-4 py-2 text-sm disabled:opacity-60">{busy ? "Checking…" : domain ? "Update" : "Connect Shopify"}</button>
        {domain && <button onClick={() => save(true)} disabled={busy} className="btn-ghost px-4 py-2 text-sm">Disconnect</button>}
      </div>
    </div>
  );
}
