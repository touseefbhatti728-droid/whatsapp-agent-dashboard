"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("That email and password didn't match. Try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-2.5 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-bold">B</div>
          <span className="text-lg font-semibold tracking-tight">Booking Agent</span>
        </div>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight text-white">
            Every WhatsApp booking, in one calm place.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            Your AI receptionist books appointments around the clock. Sign in to
            see who's coming in and when.
          </p>
        </div>
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(15,157,106,0.35), transparent 70%)" }}
        />
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
              <span className="text-lg font-bold">B</span>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-text">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted">Sign in to manage your bookings.</p>

          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                className="field"
                placeholder="you@business.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                className="field"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button onClick={handleSignIn} disabled={loading} className="btn-brand w-full">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>

          <p className="mt-6 text-xs text-muted">
            Accounts are created by your provider. Contact them if you can't sign in.
          </p>
        </div>
      </div>
    </main>
  );
}
