"use client";

import { useState } from "react";
import { saveReviewLink } from "@/lib/waitlist-actions";
import { toast } from "@/lib/toast";

// Google review link — the AI shares it with happy customers after a visit.
export default function ReviewLinkCard({ initial }) {
  const [url, setUrl] = useState(initial || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true); setError("");
    const r = await saveReviewLink(url);
    setBusy(false);
    if (r?.ok) toast.success(url.trim() ? "Review link saved" : "Review link removed");
    else setError(r?.error || "Couldn't save.");
  }

  return (
    <div className="card p-6">
      <h2 className="text-sm font-semibold text-text">Google reviews</h2>
      <p className="mt-1 text-sm text-muted">
        When a customer says they enjoyed their visit, your AI asks for a review with this link. You can also use <code className="rounded bg-canvas px-1">{"{review_link}"}</code> in Marketing messages.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(""); }}
          placeholder="https://g.page/r/your-business/review"
          className="field flex-1"
        />
        <button onClick={save} disabled={busy} className="btn-brand px-4 py-2 text-sm disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
      </div>
      <p className="mt-2 text-xs text-muted">Find it in Google Business Profile → Ask for reviews → copy the link.</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
