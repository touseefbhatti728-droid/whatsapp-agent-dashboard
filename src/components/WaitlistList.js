"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";
import { removeWaitlistEntry } from "@/lib/waitlist-actions";
import { formatPhone } from "@/lib/phone";
import { toast } from "@/lib/toast";

function dayLabel(date) {
  // wanted_date is a plain business-local date — format it without shifting timezones
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export default function WaitlistList({ entries }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);

  async function remove(id) {
    setBusyId(id);
    const r = await removeWaitlistEntry(id);
    setBusyId(null);
    if (!r?.ok) return toast.error("Couldn't remove", r?.error);
    toast.success("Removed from waitlist");
    router.refresh();
  }

  return (
    <div className="card divide-y divide-line">
      {entries.map((w) => {
        const digits = String(w.customer_phone || "").replace(/\D/g, "");
        return (
          <div key={w.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">{w.customer_name || formatPhone(w.customer_phone)}</p>
              <p className="text-sm text-muted">
                {[w.service, dayLabel(w.wanted_date), w.wanted_time || "any time"].filter(Boolean).join(" · ")}
              </p>
            </div>
            {w.status === "offered"
              ? <span className="pill bg-amber-50 text-amber-700">Slot offered</span>
              : <span className="pill bg-brand-tint text-brand-dark">Waiting</span>}
            {digits && (
              <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="btn-ghost h-9 px-3 py-0 text-[13px]">Message</a>
            )}
            <ConfirmButton
              onConfirm={() => remove(w.id)}
              disabled={busyId === w.id}
              label="Remove"
              confirmLabel="Yes, remove"
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-red-600"
            />
          </div>
        );
      })}
    </div>
  );
}
