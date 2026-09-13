"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupForm({ appName = "Booking Agent" }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "", location: "", hours: "", services: "", faq: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setError(""); };

  async function submit() {
    setError(""); setNotice("");
    if (!f.name.trim()) return setError("Please enter your business name.");
    if (!f.email.trim()) return setError("Please enter your email.");
    if (f.password.length < 6) return setError("Password must be at least 6 characters.");

    setLoading(true);
    const supabase = createClient();
    const { data, error: signErr } = await supabase.auth.signUp({ email: f.email.trim(), password: f.password });
    if (signErr) { setLoading(false); return setError(signErr.message); }

    if (!data.session) {
      setLoading(false);
      setNotice("Account created! Please check your email to confirm, then sign in.");
      return;
    }

    const { error: bizErr } = await supabase.from("businesses").insert({
      owner_id: data.user.id,
      name: f.name.trim(),
      location: f.location.trim() || null,
      hours: f.hours.trim() || null,
      services: f.services.trim() || null,
      faq: f.faq.trim() || null,
      status: "active",
    });
    setLoading(false);
    if (bizErr) { setError("Account made, but saving business failed: " + bizErr.message); return; }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-2.5 text-white">
          <div className="logo-mark flex h-9 w-9 items-center justify-center text-sm">{appName.charAt(0)}</div>
          <span className="text-lg font-bold tracking-tight">{appName}</span>
        </div>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight text-white">Your AI receptionist, ready in minutes.</h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">Create your account, tell us about your business, and start taking bookings on WhatsApp — 24/7.</p>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle, rgb(var(--brand-rgb) / 0.35), transparent 70%)" }} />
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold tracking-tight text-text">Create your account</h1>
          <p className="mt-1.5 text-sm text-muted">Takes about a minute.</p>

          <div className="mt-7 space-y-4">
            <Field label="Business name" value={f.name} onChange={(v) => set("name", v)} placeholder="Glow Beauty Salon" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" type="email" value={f.email} onChange={(v) => set("email", v)} placeholder="you@business.com" />
              <Field label="Password" type="password" value={f.password} onChange={(v) => set("password", v)} placeholder="At least 6 characters" />
            </div>
            <Field label="Location" value={f.location} onChange={(v) => set("location", v)} placeholder="Business Bay, Dubai" />
            <Field label="Business hours" value={f.hours} onChange={(v) => set("hours", v)} placeholder="Mon–Sat, 10am–8pm" />
            <Area label="Services" value={f.services} onChange={(v) => set("services", v)} placeholder="Haircut, hair color, facial…" />

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            {notice && <p className="rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark">{notice}</p>}

            <button onClick={submit} disabled={loading} className="btn-brand w-full">{loading ? "Creating…" : "Create account"}</button>
          </div>

          <p className="mt-5 text-center text-sm text-muted">
            Already have an account? <Link href="/login" className="font-medium text-brand hover:text-brand-dark">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field" />
    </div>
  );
}
function Area({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className="field resize-y" />
    </div>
  );
}
