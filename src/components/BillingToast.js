"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";

// Shows a pop-up after returning from Stripe Checkout, then cleans the URL.
export default function BillingToast() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const ok = params.get("success");
    const cancelled = params.get("canceled");
    if (!ok && !cancelled) return;
    if (ok) toast.success("Payment complete", "Your plan is being activated — this takes a few seconds.");
    else toast.info("Checkout cancelled", "No charge was made.");
    router.replace("/billing");
    if (ok) setTimeout(() => router.refresh(), 4000);
  }, [params, router]);

  return null;
}
