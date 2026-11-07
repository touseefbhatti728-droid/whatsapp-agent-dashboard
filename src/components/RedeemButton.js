"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redeemReward } from "@/lib/followup-actions";
import { toast } from "@/lib/toast";

// Owner gives a loyalty reward to a client (counts it as used).
export default function RedeemButton({ phone, label }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button disabled={busy} onClick={async () => {
      setBusy(true);
      const r = await redeemReward(phone);
      setBusy(false);
      if (!r.ok) return toast.error("Couldn't save", r.error);
      toast.success("Reward given");
      router.refresh();
    }} className="rounded-lg bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-dark disabled:opacity-60">{busy ? "Saving…" : label}</button>
  );
}
