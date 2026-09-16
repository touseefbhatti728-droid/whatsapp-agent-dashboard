"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const Tick = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand"><path d="M20 6 9 17l-5-5"/></svg>
);
const BULLETS = [
  "Books appointments on WhatsApp, 24/7",
  "Understands text, voice notes & photos",
  "Syncs straight to your Google Calendar",
  "Every booking & chat in one dashboard",
  "Set up in minutes — no code needed",
];

export default function LoginForm({ appName = "Resora AI" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError(""); setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError("That email and password didn't match. Try again."); return; }
    router.push("/dashboard"); router.refresh();
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <div className="mb-9 flex items-center gap-2.5">
            <div className="logo-mark h-9 w-9 text-sm">{appName.charAt(0)}</div>
            <span className="text-lg font-bold tracking-tight text-text">{appName}</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-text">Log in to {appName}</h1>
          <p className="mt-1.5 text-sm text-muted">Welcome back — sign in to your dashboard.</p>

          <div className="mt-8 space-y-4">
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

      <div className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgb(var(--brand-rgb) / 0.35), transparent 70%)" }} />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(124,92,252,0.22), transparent 70%)" }} />
        <div className="relative">
          <h2 className="max-w-md text-[34px] font-bold leading-tight text-white">
            Your front desk,{" "}
            <span style={{ backgroundImage: "linear-gradient(90deg,#a78bfa,#f0abfc,#7dd3fc)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>powered by AI</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
            An AI receptionist that chats, books, and never sleeps — everything your business needs on WhatsApp.
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