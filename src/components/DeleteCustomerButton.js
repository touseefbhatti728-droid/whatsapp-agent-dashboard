"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { deleteCustomer } from "@/app/(app)/admin/actions";
import { toast } from "@/lib/toast";

// Delete a customer (business) for good. Asks the admin to type the business name first.
export default function DeleteCustomerButton({ id, name, hasStripe, compact, afterDelete = "/admin/clients" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const match = typed.trim().toLowerCase() === String(name || "").trim().toLowerCase() && typed.trim() !== "";

  async function go() {
    setBusy(true); setErr("");
    const r = await deleteCustomer({ id, confirmName: typed });
    setBusy(false);
    if (!r?.ok) { setErr(r?.error || "Couldn't delete."); return; }
    setOpen(false);
    toast.success("Customer deleted", r.loginDeleted ? `${name} and their login were removed.` : `${name} was removed.`);
    router.push(afterDelete);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); setTyped(""); setErr(""); }}
        title="Delete customer"
        className={compact
          ? "rounded-lg p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600"
          : "rounded-xl border border-red-200 bg-surface px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"}>
        {compact
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
          : "Delete customer"}
      </button>
      {/* In a portal so it is never inside a row link or table cell. */}
      {open && createPortal(
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={(e) => { e.stopPropagation(); if (!busy) setOpen(false); }}>
          <div className="card w-full max-w-md cursor-default p-6 text-left" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <p className="text-base font-semibold text-text">Delete {name || "this customer"}?</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
              {hasStripe && <li>Their Stripe subscription is cancelled first, so they aren't charged again.</li>}
              <li>All their chats, bookings, leads, services, team and settings are removed.</li>
              <li>Their login is removed too (unless it is an admin or owns another business).</li>
              <li className="font-semibold text-red-600">This can't be undone.</li>
            </ul>
            <label className="mt-4 block text-xs font-medium text-muted">Type <b className="text-text">{name}</b> to confirm
              <input autoFocus value={typed} onChange={(e) => { setTyped(e.target.value); setErr(""); }} className="field mt-1 w-full" />
            </label>
            {err && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{err}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-text hover:bg-canvas">Cancel</button>
              <button type="button" disabled={!match || busy} onClick={go} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40">{busy ? "Deleting…" : "Delete for good"}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
