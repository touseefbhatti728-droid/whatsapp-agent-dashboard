"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveQuote, setQuoteStatus, quoteToInvoice } from "@/lib/quote-actions";
import { formatPhone } from "@/lib/phone";
import { toast } from "@/lib/toast";

const STATUS = { sent: "bg-sky-50 text-sky-700", accepted: "bg-amber-50 text-amber-700", paid: "bg-emerald-50 text-emerald-700", cancelled: "bg-canvas text-muted", draft: "bg-canvas text-muted" };
const money = (c, n) => `${c} ${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const linkFor = (token) => `https://app.nextreply.io/q/${token}`;

function shareText(q) {
  const what = q.kind === "invoice" ? `invoice #${q.number}` : `quote #${q.number}`;
  return `Hi${q.customer_name ? ` ${q.customer_name.split(" ")[0]}` : ""}! Here is your ${what} for ${money(q.currency, q.total)}:\n${linkFor(q.token)}`;
}

export default function QuotesView({ quotes, services, currency, defaultLink }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null);
  const blank = (kind) => ({ kind, customer_name: "", customer_phone: "", items: [{ name: "", qty: 1, price: "" }], deposit: "", currency, notes: "", valid_until: "", due_date: "", payment_link: defaultLink });

  async function status(id, s) {
    const r = await setQuoteStatus(id, s);
    if (!r.ok) return toast.error("Couldn't update", r.error);
    router.refresh();
  }
  async function toInvoice(id) {
    const r = await quoteToInvoice(id);
    if (!r.ok) return toast.error("Couldn't create invoice", r.error);
    toast.success("Invoice created", "Due in 7 days — send it from the list.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {!editing && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setEditing(blank("quote"))} className="btn-brand px-4 py-2 text-sm">+ New quote</button>
          <button onClick={() => setEditing(blank("invoice"))} className="btn-ghost px-4 py-2 text-sm">+ New invoice</button>
        </div>
      )}
      {editing && <Editor doc={editing} services={services} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />}

      <div className="card overflow-hidden">
        {quotes.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-muted">No quotes or invoices yet.</div>
        ) : (
          <div className="divide-y divide-line">
            {quotes.map((q) => {
              const digits = String(q.customer_phone || "").replace(/\D/g, "");
              const wa = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(shareText(q))}` : null;
              return (
                <div key={q.id} className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">
                      {q.kind === "invoice" ? "Invoice" : "Quote"} #{q.number} · {q.customer_name || formatPhone(q.customer_phone)}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {[money(q.currency, q.total), q.deposit && `deposit ${money(q.currency, q.deposit)}`, q.kind === "invoice" && q.due_date && `due ${q.due_date}`, q.kind === "quote" && q.valid_until && `valid until ${q.valid_until}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className={`pill ${STATUS[q.status]}`}>{q.status}</span>
                  {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost h-8 px-3 py-0 text-xs">Send on WhatsApp</a>}
                  <button onClick={() => { navigator.clipboard?.writeText(linkFor(q.token)); toast.success("Link copied"); }} className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-text hover:bg-canvas">Copy link</button>
                  <select value="" onChange={(e) => { const v = e.target.value; if (v === "edit") setEditing({ ...q, items: q.items, deposit: q.deposit ?? "" }); else if (v === "invoice") toInvoice(q.id); else if (v) status(q.id, v); }}
                    className="rounded-lg border border-line px-2 py-1 text-xs">
                    <option value="">More…</option>
                    <option value="edit">Edit</option>
                    {q.status !== "paid" && <option value="paid">Mark as paid</option>}
                    {q.kind === "quote" && q.status === "sent" && <option value="accepted">Mark as accepted</option>}
                    {q.kind === "quote" && <option value="invoice">Create invoice from it</option>}
                    {q.status !== "cancelled" && <option value="cancelled">Cancel</option>}
                    {q.status === "cancelled" && <option value="sent">Re-open</option>}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Editor({ doc, services, onClose, onSaved }) {
  const [f, setF] = useState(doc);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setItem = (i, patch) => setF((s) => ({ ...s, items: s.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const total = f.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);

  async function save() {
    setBusy(true);
    const r = await saveQuote(f);
    setBusy(false);
    if (!r.ok) return toast.error("Couldn't save", r.error);
    toast.success(f.id ? "Saved" : `${f.kind === "invoice" ? "Invoice" : "Quote"} created`, "Use Send on WhatsApp to share it.");
    onSaved();
  }

  return (
    <div className="card space-y-4 p-6">
      <h2 className="text-sm font-semibold text-text">{f.id ? "Edit" : "New"} {f.kind === "invoice" ? "invoice" : "quote"}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={f.customer_name || ""} onChange={(e) => set("customer_name", e.target.value)} placeholder="Customer name" className="field" />
        <input value={f.customer_phone || ""} onChange={(e) => set("customer_phone", e.target.value)} placeholder="WhatsApp number with country code" className="field" inputMode="tel" />
      </div>
      <div className="space-y-2">
        {f.items.map((it, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <input list="svc-list" value={it.name} onChange={(e) => {
              const s = services.find((x) => x.name === e.target.value);
              setItem(i, { name: e.target.value, ...(s && it.price === "" ? { price: s.price ?? "" } : {}) });
            }} placeholder="Item / treatment" className="field min-w-[180px] flex-1" />
            <input type="number" min={1} value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} className="field w-20" title="Quantity" />
            <input type="number" min={0} step="0.01" value={it.price} onChange={(e) => setItem(i, { price: e.target.value })} placeholder="Price" className="field w-32" />
            {f.items.length > 1 && <button onClick={() => set("items", f.items.filter((_, j) => j !== i))} className="text-xs font-semibold text-muted hover:text-red-500">Remove</button>}
          </div>
        ))}
        <datalist id="svc-list">{services.map((s) => <option key={s.name} value={s.name} />)}</datalist>
        <button onClick={() => set("items", [...f.items, { name: "", qty: 1, price: "" }])} className="text-sm font-semibold text-brand">+ Add item</button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs font-medium text-muted">Currency<input value={f.currency} onChange={(e) => set("currency", e.target.value)} className="field mt-1 uppercase" /></label>
        <label className="text-xs font-medium text-muted">Deposit (optional)<input type="number" min={0} value={f.deposit ?? ""} onChange={(e) => set("deposit", e.target.value)} className="field mt-1" /></label>
        {f.kind === "invoice"
          ? <label className="text-xs font-medium text-muted">Due date<input type="date" value={f.due_date || ""} onChange={(e) => set("due_date", e.target.value)} className="field mt-1" /></label>
          : <label className="text-xs font-medium text-muted">Valid until<input type="date" value={f.valid_until || ""} onChange={(e) => set("valid_until", e.target.value)} className="field mt-1" /></label>}
      </div>
      <input value={f.payment_link || ""} onChange={(e) => set("payment_link", e.target.value)} placeholder="Payment link (optional) — https://…" className="field" />
      <textarea value={f.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Notes for the customer (optional)" className="field resize-y text-sm" />
      <p className="text-sm font-semibold text-text">Total: {money((f.currency || "").toUpperCase(), total)}</p>
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="btn-brand px-4 py-2 text-sm">{busy ? "Saving…" : "Save"}</button>
        <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
      </div>
    </div>
  );
}
