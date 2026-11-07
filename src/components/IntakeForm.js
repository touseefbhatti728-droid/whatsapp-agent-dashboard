"use client";

import { useState } from "react";
import { submitIntake } from "@/lib/public-actions";

export default function IntakeForm({ token, form, initial, done: alreadyDone }) {
  const [answers, setAnswers] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const set = (k, v) => setAnswers((a) => ({ ...a, [k]: v }));

  async function send(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await submitIntake(token, answers);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setDone(true);
  }

  if (done) return <p className="text-center text-sm font-medium text-text">Thank you — your answers were sent to the team. See you soon! 🙏</p>;

  return (
    <form onSubmit={send} className="space-y-4">
      {alreadyDone && <p className="rounded-lg bg-brand-tint px-3 py-2 text-xs text-brand-dark">You already sent this form — you can update your answers.</p>}
      {form.map((f) => (
        <label key={f.label} className="block text-sm font-medium text-text">
          {f.label}{f.required && <span className="text-red-500"> *</span>}
          {f.type === "yesno" ? (
            <div className="mt-2 flex gap-2">
              {["Yes", "No"].map((o) => (
                <button type="button" key={o} onClick={() => set(f.label, o)}
                  className={`rounded-lg border px-4 py-2 text-sm ${answers[f.label] === o ? "border-brand bg-brand-tint" : "border-line"}`}>{o}</button>
              ))}
            </div>
          ) : f.type === "choice" ? (
            <select value={answers[f.label] || ""} onChange={(e) => set(f.label, e.target.value)} className="field mt-1">
              <option value="">Choose…</option>
              {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <textarea value={answers[f.label] || ""} onChange={(e) => set(f.label, e.target.value)} rows={2} className="field mt-1 resize-y" />
          )}
        </label>
      ))}
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button disabled={busy} className="btn-brand w-full py-3 text-sm disabled:opacity-60">{busy ? "Sending…" : "Send answers"}</button>
    </form>
  );
}
