"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupForm({ appName = "NextReply" }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setError(""); };

  async function submit() {
    setError(""); setNotice("");
    if (!f.name.trim()) return setError("Please enter your business name.");
    const email = f.email.trim().toLowerCase();
    if (!email) return setError("Please enter your email.");
    if (!EMAIL_RE.test(email)) return setError("Please enter a valid email address.");
    if (f.password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    const supabase = createClient();
    const { data, error: signErr } = await supabase.auth.signUp({ email, password: f.password });
    if (signErr) {
      setLoading(false);
      if (/already registered|already exists|user already/i.test(signErr.message)) {
        return setError("An account with this email already exists. Please sign in instead.");
      }
      return setError(signErr.message);
    }
    if (!data.session) { setLoading(false); setNotice("Account created! Please check your email to confirm, then sign in."); return; }
    const { error: bizErr } = await supabase.from("businesses").insert({
      owner_id: data.user.id, name: f.name.trim(), status: "active",
    });
    setLoading(false);
    if (bizErr) { setError("Account made, but saving business failed: " + bizErr.message); return; }
    router.push("/onboarding"); router.refresh();
  }

  async function googleSignup() {
    setError(""); setGLoading(true);
    const supabase = createClient();
    const { error: gErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    if (gErr) { setGLoading(false); setError(gErr.message); }
    // on success the browser redirects to Google, so no further code runs here
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* LEFT — form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center gap-2.5">
            <div className="logo-mark h-9 w-9 text-sm">{appName.charAt(0)}</div>
            <span className="text-lg font-bold tracking-tight text-text">{appName}</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-text">Create your account</h1>
          <p className="mt-1.5 text-sm text-muted">Takes about a minute — no card needed. You will set up your business next.</p>

          {/* Google — one-click signup */}
          <button
            onClick={googleSignup}
            disabled={gLoading}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-text transition hover:bg-canvas hover:shadow-sm disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            {gLoading ? "Redirecting…" : "Sign up with Google"}
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">or</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <div className="space-y-4">
            <Field label="Business name" value={f.name} onChange={(v) => set("name", v)} placeholder="Your business name" />
            <Field label="Email" type="email" value={f.email} onChange={(v) => set("email", v)} placeholder="you@business.com" />
            <Field label="Password" type="password" value={f.password} onChange={(v) => set("password", v)} placeholder="At least 6 characters" />

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            {notice && <p className="rounded-lg bg-brand-tint px-3 py-2 text-sm text-brand-dark">{notice}</p>}

            <button onClick={submit} disabled={loading} className="btn-brand w-full">{loading ? "Creating…" : "Create account"}</button>
          </div>

          <p className="mt-5 text-sm text-muted">Already have an account? <Link href="/login" className="font-semibold text-brand hover:text-brand-dark">Sign in</Link></p>
        </div>
      </div>

      {/* RIGHT — dark panel with LIVE animated booking flow */}
      <div className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4), transparent 70%)" }} />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(147,180,253,0.28), transparent 70%)" }} />
        <div className="relative">
          <h2 className="max-w-md text-[34px] font-bold leading-tight text-white">
            Turn client messages into{" "}
            <span style={{ backgroundImage: "linear-gradient(90deg,#a78bfa,#c4b5fd,#93b4fd)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>booked appointments</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
            {appName} replies to your customers, finds an open time, creates the booking, and brings in your team when a person is needed.
          </p>

          <BookingFlow appName={appName} />
        </div>
      </div>
    </main>
  );
}

/* Animated booking flow (loops): Message -> AI front desk -> Booking confirmed */
function BookingFlow({ appName }) {
  const [phase, setPhase] = useState(0); // 0 msg, 1 ai, 2 confirmed
  useEffect(() => {
    const seq = [1200, 1600, 2600]; // timing per phase
    let t;
    const tick = (p) => {
      setPhase(p);
      t = setTimeout(() => tick((p + 1) % 3), seq[p]);
    };
    tick(0);
    return () => clearTimeout(t);
  }, []);

  const steps = ["Message", "AI front desk", "Booking confirmed"];

  return (
    <div className="mt-9 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      {/* progress row */}
      <div className="mb-5 flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] transition-all duration-500 ${i <= phase ? "bg-brand text-white" : "bg-white/10 text-white/40"}`}>
              {i <= phase ? "✓" : i + 1}
            </span>
            <span className={`text-[11px] font-medium transition-colors duration-500 ${i <= phase ? "text-white/80" : "text-white/35"}`}>{s}</span>
          </div>
        ))}
      </div>
      <div className="h-px w-full bg-white/10" />

      {/* chat area */}
      <div className="mt-5 space-y-3">
        {/* client message */}
        <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white/[0.06] px-4 py-2.5">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-white/40">Client</p>
          <p className="text-[13px] text-white/85">Hi! I would like to book a haircut tomorrow.</p>
        </div>

        {/* AI reply — appears at phase >= 1 */}
        <div className={`ml-auto max-w-[85%] rounded-2xl rounded-tr-md px-4 py-2.5 transition-all duration-500 ${phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
             style={{ background: "linear-gradient(105deg,#8b5cf6,#7c5cfc)" }}>
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/80">✦ {appName}</p>
          <p className="text-[13px] text-white">Sure! Here are tomorrow's open times:</p>
          <div className="mt-2 inline-flex rounded-lg bg-black/20 px-3 py-1 text-[13px] font-semibold text-white">3:30 PM</div>
        </div>

        {/* booking confirmed — appears at phase >= 2 */}
        <div className={`rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 transition-all duration-500 ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          <p className="flex items-center gap-2 text-[12px] font-semibold text-emerald-300">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/20 text-[9px]">✓</span>
            Booking confirmed
          </p>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-white/40">Visit / Appointment</p>
              <p className="text-[15px] font-bold text-white">Tomorrow · 3:30 PM</p>
            </div>
            <span className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-bold text-white/70">BK-1047</span>
          </div>
        </div>
      </div>

      {/* team handling footer */}
      <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px]">👤</span>
        <span className="text-[12px] text-white/50">Your team takes over whenever a person is needed.</span>
      </div>
    </div>
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