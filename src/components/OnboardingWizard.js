"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "@/lib/onboarding-actions";
import ConnectWhatsApp from "@/components/ConnectWhatsApp";

const STEPS = ["Business", "Services & Hours", "Knowledge", "Calendar", "WhatsApp"];

export default function OnboardingWizard({ initial = {}, appName = "NextReply" }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [f, setF] = useState({
    name: initial.name || "",
    location: initial.location || "",
    services: initial.services || "",
    hours: initial.hours || "",
    faq: initial.faq || "",
    knowledge: initial.knowledge || "",
    calendar_id: initial.calendar_id || "",
  });
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setError(""); };

  function next() {
    if (step === 0 && !f.name.trim()) return setError("Please enter your business name.");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  async function finish() {
    setSaving(true); setError("");
    const r = await saveOnboarding(f);
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
                1. In Google Calendar open <b>Settings → your calendar → Share with specific people</b>.<br />
                2. Add <b className="break-all">salon-calendar@gen-lang-client-0673531342.iam.gserviceaccount.com</b> with “Make changes to events”.<br />
                3. Paste your Calendar ID below — for your main calendar it's your Gmail address.
              </div>
              <Field label="Google Calendar ID (optional)" value={f.calendar_id} onChange={(v) => set("calendar_id", v)} placeholder="you@gmail.com" />
            </Section>
          )}

          {step === 4 && (
            <Section title="Connect WhatsApp" sub="Your AI replies from your WhatsApp number. Connect it now in a secure Meta window — it takes about 2 minutes.">
              {/* Same self-serve Embedded Signup as the Connect WhatsApp page — no typed numbers. */}
              <ConnectWhatsApp connectedNumber={initial.meta_phone_number_id ? (initial.whatsapp_number || "connected") : null} aiOn={["active", "trialing"].includes(initial.sub_status)} />
              <div className="rounded-xl bg-canvas p-4 text-sm text-muted">
                Not ready yet? Click <b>Finish setup</b> — you can connect any time from <b>Connect WhatsApp</b> in the menu.
              </div>
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
            Save and finish later
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