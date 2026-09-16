"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const Tick = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand"><path d="M20 6 9 17l-5-5"/></svg>
);
const BULLETS = [
  "Free to set up — start in minutes",
  "AI books appointments on WhatsApp 24/7",
  "Understands text, voice notes & photos",
  "Syncs with your Google Calendar",
  "Manage everything from one dashboard",
];

export default function SignupForm({ appName = "Resora AI" }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "", location: "", hours: "", services: "" });
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
    if (!data.session) { setLoading(false); setNotice("Account created! Please check your email to confirm, then sign in."); return; }
    const { error: bizErr } = await supabase.from("businesses").insert({
      owner_id: data.user.id, name: f.name.trim(), location: f.location.trim() || null,
      hours: f.hours.trim() || null, services: f.services.trim() || null, status: "active",
    });
    setLoading(false);
    if (bizErr) { setError("Account made, but saving business failed: " + bizErr.message); return; }
    router.push("/dashboard"); router.refresh();
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center gap-2.5">
            <div className="logo-mark h-9 w-9 text-sm">{appName.charAt(0)}</div>
            <span className="text-lg font-bold tracking-tight text-text">{appName}</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-text">Create your account</h1>
          <p className="mt-1.5 text-sm text-muted">Takes about a minute — no card needed.</p>

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

          <p className="mt-5 text-sm text-muted">Already have an account? <Link href="/login" className="font-semibold text-brand hover:text-brand-dark">Sign in</Link></p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgb(var(--brand-rgb) / 0.35), transparent 70%)" }} />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(124,92,252,0.22), transparent 70%)" }} />
        <div className="relative">
          <h2 className="max-w-md text-[34px] font-bold leading-tight text-white">
            Start taking bookings{" "}
            <span style={{ backgroundImage: "linear-gradient(90deg,#a78bfa,#f0abfc,#7dd3fc)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>on autopilot</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
            Join businesses letting AI handle their WhatsApp — replies, bookings, and reminders, all day.
          </p>
          <ul className="mt-8 space-y-3.5">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-center gap-3 text-[15px] text-white/85">{Tick}{b}</li>
            ))}
          </ul>
          <div className="mt-10 inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-base tracking-tight text-yellow-400">★★★★★</span>
            <span className="text-sm text-white/70">Built for salons, clinics & service businesses</span>
          </div>
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