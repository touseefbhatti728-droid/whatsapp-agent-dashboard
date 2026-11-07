"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";
import { setupVoiceLine, removeVoiceLine } from "@/lib/voice-actions";
import { toast } from "@/lib/toast";

export default function VoiceLine({ number, assistantId, serverReady }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [area, setArea] = useState("");

  async function setup() {
    setBusy(true);
    const r = await setupVoiceLine({ areaCode: area });
    setBusy(false);
    if (!r.ok) return toast.error("Couldn't set up the line", r.error);
    toast.success(r.number ? `Your AI line: ${r.number}` : "Assistant updated");
    router.refresh();
  }

  if (!serverReady) {
    return (
      <div className="card p-6 text-sm text-muted">
        The phone receptionist runs on Vapi. Your provider needs to add the Vapi key on the server first — then you can create your line here in one click.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-6">
        {assistantId ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="pill bg-brand-tint text-brand-dark"><span className="h-1.5 w-1.5 rounded-full bg-brand" /> Live</span>
              <p className="text-lg font-semibold text-text">{number ? `+${String(number).replace(/\D/g, "")}` : "Assistant ready (no number yet)"}</p>
            </div>
            <p className="text-sm text-muted">Call it to try. Every call shows up in Conversations with a summary, and you get an alert. Changes to your services, hours and knowledge apply to calls straight away.</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={setup} disabled={busy} className="btn-ghost px-4 py-2 text-sm">{busy ? "Updating…" : "Refresh settings"}</button>
              <ConfirmButton onConfirm={async () => { await removeVoiceLine(); router.refresh(); }} label="Turn off & release number" confirmLabel="Yes, turn off"
                className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-muted hover:text-red-500" />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-text">Creates your AI receptionist and a phone number for it. Free Vapi numbers are US numbers — good for testing. For a UAE or Pakistan number, see below.</p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-medium text-muted">US area code (optional)
                <input value={area} onChange={(e) => setArea(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="e.g. 415" className="field mt-1 w-32" />
              </label>
              <button onClick={setup} disabled={busy} className="btn-brand px-5 py-2.5 text-sm disabled:opacity-60">{busy ? "Creating…" : "Create my AI phone line"}</button>
            </div>
          </>
        )}
      </div>
      <div className="card space-y-2 p-6 text-sm text-muted">
        <p className="font-semibold text-text">Using your own UAE / Pakistan number</p>
        <p>Buy a local number from Twilio (they need your trade licence or ID), import it in the Vapi dashboard (Phone Numbers → Import), and choose this assistant{assistantId ? <> (<code className="rounded bg-canvas px-1">{assistantId}</code>)</> : ""}. Or forward your existing business number to your AI line when you're busy.</p>
      </div>
    </div>
  );
}
