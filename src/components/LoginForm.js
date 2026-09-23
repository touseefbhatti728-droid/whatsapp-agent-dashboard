"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ appName = "NextReply" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);

  async function handleSignIn() {
    setError(""); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (error) { setError("That email and password didn't match. Try again."); return; }
    router.push("/dashboard"); router.refresh();
  }

  async function googleLogin() {
    setError(""); setGLoading(true);
    const supabase = createClient();
    const { error: gErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
    if (gErr) { setGLoading(false); setError(gErr.message); }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* LEFT — form */}
      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <div className="mb-9 flex items-center gap-2.5">
            <div className="logo-mark h-9 w-9 text-sm">{appName.charAt(0)}</div>
            <span className="text-lg font-bold tracking-tight text-text">{appName}</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-text">Log in to {appName}</h1>
          <p className="mt-1.5 text-sm text-muted">Welcome back — sign in to your dashboard.</p>

          {/* Google login */}
          <button
            onClick={googleLogin}
            disabled={gLoading}
            className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-text transition hover:bg-canvas hover:shadow-sm disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            {gLoading ? "Redirecting…" : "Continue with Google"}
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">or</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSignIn()} className="field" placeholder="you@business.com" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSignIn()} className="field" placeholder="••••••••" />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button onClick={handleSignIn} disabled={loading} className="btn-brand w-full">{loading ? "Signing in…" : "Login"}</button>
          </div>

          <p className="mt-6 text-sm text-muted">Don't have an account? <Link href="/signup" className="font-semibold text-brand hover:text-brand-dark">Create one</Link></p>
        </div>
      </div>

      {/* RIGHT — dark panel with live animated booking flow */}
      <div className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4), transparent 70%)" }} />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(147,180,253,0.28), transparent 70%)" }} />
        <div className="relative">
          <h2 className="max-w-md text-[34px] font-bold leading-tight text-white">
            Your front desk,{" "}
            <span style={{ backgroundImage: "linear-gradient(90deg,#a78bfa,#c4b5fd,#93b4fd)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>powered by AI</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
            An AI receptionist that chats, books, and never sleeps — everything your business needs on WhatsApp.
          </p>

          <BookingFlow appName={appName} />
        </div>
      </div>
    </main>
  );
}

/* Animated booking flow (loops): Message -> AI front desk -> Booking confirmed */
function BookingFlow({ appName }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const seq = [1200, 1600, 2600];
    let t;
    const tick = (p) => { setPhase(p); t = setTimeout(() => tick((p + 1) % 3), seq[p]); };
    tick(0);
    return () => clearTimeout(t);
  }, []);
  const steps = ["Message", "AI front desk", "Booking confirmed"];

  return (
    <div className="mt-9 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-5 flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] transition-all duration-500 ${i <= phase ? "bg-brand text-white" : "bg-white/10 text-white/40"}`}>{i <= phase ? "✓" : i + 1}</span>
            <span className={`text-[11px] font-medium transition-colors duration-500 ${i <= phase ? "text-white/80" : "text-white/35"}`}>{s}</span>
          </div>
        ))}
      </div>
      <div className="h-px w-full bg-white/10" />
      <div className="mt-5 space-y-3">
        <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white/[0.06] px-4 py-2.5">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-white/40">Client</p>
          <p className="text-[13px] text-white/85">Hi! I would like to book a haircut tomorrow.</p>
        </div>
        <div className={`ml-auto max-w-[85%] rounded-2xl rounded-tr-md px-4 py-2.5 transition-all duration-500 ${phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`} style={{ background: "linear-gradient(105deg,#8b5cf6,#7c5cfc)" }}>
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-white/80">✦ {appName}</p>
          <p className="text-[13px] text-white">Sure! Here are tomorrow's open times:</p>
          <div className="mt-2 inline-flex rounded-lg bg-black/20 px-3 py-1 text-[13px] font-semibold text-white">3:30 PM</div>
        </div>
        <div className={`rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 transition-all duration-500 ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          <p className="flex items-center gap-2 text-[12px] font-semibold text-emerald-300"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/20 text-[9px]">✓</span>Booking confirmed</p>
          <div className="mt-2 flex items-center justify-between">
            <div><p className="text-[10px] uppercase tracking-wide text-white/40">Visit / Appointment</p><p className="text-[15px] font-bold text-white">Tomorrow · 3:30 PM</p></div>
            <span className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-bold text-white/70">BK-1047</span>
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px]">👤</span>
        <span className="text-[12px] text-white/50">Your team takes over whenever a person is needed.</span>
      </div>
    </div>
  );
}