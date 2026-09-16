"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={signOut}
      className="w-full rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
    >
      Sign out
    </button>
  );
}
