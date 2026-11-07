"use client";

import { useState } from "react";
import { submitFeedback } from "@/lib/public-actions";

export default function FeedbackForm({ token, name }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);

  async function send() {
    if (!rating) return setErr("Tap a star first.");
    setBusy(true); setErr("");
    const r = await submitFeedback(token, rating, comment);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setDone(r);
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold text-text">Thank you{name ? `, ${name.split(" ")[0]}` : ""}! 🙏</p>
        {done.reviewUrl ? (
          <>
            <p className="mt-2 text-sm text-muted">Would you share that on Google? It really helps a small business.</p>
            <a href={done.reviewUrl} target="_blank" rel="noreferrer" className="btn-brand mt-5 inline-flex px-5 py-2.5 text-sm">Leave a Google review</a>
          </>
        ) : <p className="mt-2 text-sm text-muted">Your feedback goes straight to the team.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5 text-center">
      <p className="text-sm font-medium text-text">How was your visit{name ? `, ${name.split(" ")[0]}` : ""}?</p>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}
            className={`text-4xl transition ${n <= rating ? "text-amber-400" : "text-line hover:text-amber-200"}`}>★</button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000}
        placeholder={rating && rating <= 3 ? "What could we do better?" : "Anything you'd like to add? (optional)"} className="field resize-none text-sm" />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button onClick={send} disabled={busy} className="btn-brand w-full py-3 text-sm disabled:opacity-60">{busy ? "Sending…" : "Send feedback"}</button>
    </div>
  );
}
