"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "@/lib/onboarding-actions";

const STEPS = ["Business", "Services & Hours", "Knowledge", "Calendar", "WhatsApp"];

export default function OnboardingWizard({ initial = {}, appName = "NextReply" }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [waMode, setWaMode] = useState(initial.wa_mode || ""); // "new" | "migrate"
  const [f, setF] = useState({
    name: initial.name || "",
    location: initial.location || "",
    services: initial.services || "",
    hours: initial.hours || "",
    faq: initial.faq || "",
    knowledge: initial.knowledge || "",
    calendar_id: initial.calendar_id || "",
    whatsapp_number: initial.whatsapp_number || "",
  });
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setError(""); };

  function next() {
    if (step === 0 && !f.name.trim()) return setError("Please enter your business name.");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  async function finish() {
    setSaving(true); setError("");
    const r = await saveOnboarding({ ...f, wa_mode: waMode });
    setSaving(false);
    if (!r.ok) return setError(r.error || "Something went wrong.");
    router.push("/dashboard"); router.refresh();
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    set("knowledge", (f.knowledge ? f.knowledge + "\n\n" : "") + text);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-2.5">
          <div className="logo-mark h-9 w-9 text-sm">{appName.charAt(0)}</div>
          <span className="text-lg font-bold tracking-tight text-text">{appName}</span>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-text">Set up your business</p>
            <p className="text-xs text-muted">Step {step + 1} of {STEPS.length}</p>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? "bg-brand" : "bg-line"}`} />
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="card flex-1 p-7">
          {step === 0 && (
            <Section title="Tell us about your business" sub="This is what your AI needs to greet and help your customers.">
              <Field label="Business name" value={f.name} onChange={(v) => set("name", v)} placeholder="Your business name" />
              <Field label="Location (optional)" value={f.location} onChange={(v) => set("location", v)} placeholder="City or address" />
            </Section>
          )}

          {step === 1 && (
            <Section title="Services and hours" sub="So the AI answers correctly and only books when you are open.">
              <Area label="Services you offer" value={f.services} onChange={(v) => set("services", v)} placeholder="List your services, one per line or comma separated" rows={3} />
              <Field label="Opening hours" value={f.hours} onChange={(v) => set("hours", v)} placeholder="Mon to Sat, 10am to 8pm" />
            </Section>
          )}

          {step === 2 && (
            <Section title="Teach your AI" sub="Give your AI everything it should know. Upload a document or paste notes from ChatGPT or Claude, and add common questions.">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text">Upload business info (optional)</label>
                <label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-brand/50 bg-brand-tint/40 px-4 py-6 text-center transition hover:bg-brand-tint/70">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="mb-2 text-brand-dark"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                  <span className="text-sm font-medium text-text">Upload a text file</span>
                  <span className="mt-0.5 text-xs text-muted">.txt or .md — the AI reads it as its knowledge</span>
                  <input type="file" accept=".txt,.md,text/plain" onChange={onFile} className="hidden" />
                </label>
              </div>
              <Area label="Business knowledge" value={f.knowledge} onChange={(v) => set("knowledge", v)} placeholder="Paste anything the AI should know: your story, policies, pricing, offers, what to say and what not to say…" rows={5} />
              <Area label="Common questions and answers" value={f.faq} onChange={(v) => set("faq", v)} placeholder="Q: Do you take walk-ins?  A: Yes, on weekends 10am to 4pm." rows={3} />
            </Section>
          )}

          {step === 3 && (
            <Section title="Connect your calendar" sub="So bookings land straight in your Google Calendar. You can also do this later in Settings.">
              <div className="rounded-xl bg-brand-tint/50 p-4 text-sm text-brand-dark">
                Share your Google Calendar with the calendar email shown in your dashboard, then paste your Calendar ID below. For a primary calendar this is usually your Gmail address.
              </div>
              <Field label="Google Calendar ID (optional)" value={f.calendar_id} onChange={(v) => set("calendar_id", v)} placeholder="you@gmail.com" />
            </Section>
          )}

          {step === 4 && (
            <Section title="Connect WhatsApp" sub="Your AI needs a WhatsApp number to reply from. Choose how you want to set it up.">

              {/* Important requirement note */}
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-amber-600"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                <p className="text-sm text-amber-900">
                  <b>Important:</b> the number you connect must NOT be currently active on the regular WhatsApp or WhatsApp Business app. A number can only be in one place at a time — the app or the API, not both.
                </p>
              </div>

              {/* Option cards */}
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setWaMode("new")}
                  className={`rounded-xl border p-4 text-left transition ${waMode === "new" ? "border-brand bg-brand-tint/50 ring-1 ring-brand" : "border-line hover:border-brand/50"}`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-md bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-brand-dark">RECOMMENDED</span>
                  </div>
                  <b className="block text-sm text-text">Use a new number</b>
                  <span className="mt-1 block text-xs text-muted">A fresh number, live in ~2 minutes. Your existing number stays untouched.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWaMode("migrate")}
                  className={`rounded-xl border p-4 text-left transition ${waMode === "migrate" ? "border-brand bg-brand-tint/50 ring-1 ring-brand" : "border-line hover:border-brand/50"}`}
                >
                  <b className="block text-sm text-text">Migrate my existing number</b>
                  <span className="mt-1 block text-xs text-muted">Keep your current business number. We help you move it — book a setup call.</span>
                </button>
              </div>

              {/* Procedure: NEW number */}
              {waMode === "new" && (
                <div className="space-y-4">
                  <Steps
                    title="How to set up a new number"
                    items={[
                      "Get a new phone number — a cheap second SIM or a virtual number works fine.",
                      "Make sure it is NOT registered on WhatsApp or WhatsApp Business. If it is, remove it first.",
                      "Enter the number below. We connect it to the WhatsApp Business API.",
                      "Verify with the one-time code (OTP) sent to that number.",
                      "Done — your AI is live and answering on that number.",
                    ]}
                  />
                  <Field label="New WhatsApp number" value={f.whatsapp_number} onChange={(v) => set("whatsapp_number", v)} placeholder="e.g. 15551234567 (with country code)" />
                </div>
              )}

              {/* Procedure: MIGRATE existing */}
              {waMode === "migrate" && (
                <div className="space-y-4">
                  <Steps
                    title="How migrating your existing number works"
                    items={[
                      "Back up your current WhatsApp chats first (Google Drive or iCloud).",
                      "Your number moves off the regular WhatsApp app — old chats won't carry over, but customers keep messaging the same number.",
                      "We guide you through deregistering the number from WhatsApp.",
                      "We register it on the WhatsApp Business API and verify with an OTP sent to that number.",
                      "Your AI goes live on your existing number.",
                    ]}
                  />
                  <div className="rounded-xl bg-brand-tint/50 p-4 text-sm text-brand-dark">
                    Migration is best done together so nothing is lost. Enter your number below and finish setup — our team will reach out to book a quick setup call and move it with you.
                  </div>
                  <Field label="Existing WhatsApp number" value={f.whatsapp_number} onChange={(v) => set("whatsapp_number", v)} placeholder="e.g. 15551234567 (with country code)" />
                </div>
              )}

              {!waMode && (
                <div className="rounded-xl bg-canvas p-4 text-sm text-muted">
                  Pick an option above to see the steps. Not ready yet? You can finish setup now and connect WhatsApp later from Settings.
                </div>
              )}
            </Section>
          )}

          {error && <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer buttons */}
        <div className="mt-6 flex items-center justify-between">
          {step > 0
            ? <button onClick={back} className="btn-ghost">Back</button>
            : <span />}
          {step < STEPS.length - 1
            ? <button onClick={next} className="btn-brand">Continue</button>
            : <button onClick={finish} disabled={saving} className="btn-brand">{saving ? "Finishing…" : "Finish setup"}</button>}
        </div>

        {step < STEPS.length - 1 && (
          <button onClick={finish} disabled={saving} className="mt-3 text-center text-sm text-muted hover:text-text">
            Skip for now and go to dashboard
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, sub, children }) {
  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-text">{title}</h1>
      <p className="mt-1.5 text-sm text-muted">{sub}</p>
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}
function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field" />
    </div>
  );
}
function Area({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="field resize-y" />
    </div>
  );
}
function Steps({ title, items }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-text">{title}</p>
      <ol className="space-y-2.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-3 text-sm text-body">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-brand/15 text-[11px] font-bold text-brand-dark">{i + 1}</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}