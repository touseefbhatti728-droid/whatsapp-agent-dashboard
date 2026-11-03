"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPhone } from "@/lib/phone";

function initials(n) { return n ? n.trim().split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()).join("") : "•"; }

function Connection({ c }) {
  if (c.connected) return <span className="pill bg-emerald-50 text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected</span>;
  if (c.whatsapp_number) return <span className="pill bg-amber-50 text-amber-700" title="A number is saved but Meta isn't connected, so the AI can't reply"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Number only</span>;
  return <span className="pill bg-canvas text-muted">Not connected</span>;
}
function Status({ c }) {
  return c.status === "suspended"
    ? <span className="pill bg-red-50 text-red-600">Suspended</span>
    : <span className="pill bg-brand-tint text-brand-dark">Active</span>;
}

export default function ClientSearch({ clients }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | connected | not | suspended
  const filtered = clients.filter((c) => {
    const s = `${c.name || ""} ${c.owner_email || ""} ${c.whatsapp_number || ""} ${c.location || ""}`.toLowerCase();
    if (!s.includes(q.trim().toLowerCase())) return false;
    if (filter === "connected") return c.connected;
    if (filter === "not") return !c.connected;
    if (filter === "suspended") return c.status === "suspended";
    return true;
  });
  const open = (c) => router.push(`/admin/clients/${c.id}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, number…" className="field max-w-sm" />
        <div className="flex rounded-xl border border-line bg-surface p-0.5">
          {[["all", "All"], ["connected", "WhatsApp connected"], ["not", "Not connected"], ["suspended", "Suspended"]].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === k ? "bg-brand text-white" : "text-muted hover:text-text"}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">No clients match.</div>
        ) : filtered.map((c) => (
          <Link key={c.id} href={`/admin/clients/${c.id}`} className="card block p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{initials(c.name)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text">{c.name || "Unnamed business"}</p>
                <p className="truncate text-xs text-muted">{c.owner_email || c.location || ""}</p>
              </div>
              <Status c={c} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-3 text-xs text-muted">
              <span>{formatPhone(c.whatsapp_number) || "No number"}</span>
              <Connection c={c} />
              <span>{c.plan || "No plan"}{c.sub_status ? ` · ${c.sub_status}` : ""}</span>
              <span className="rounded-md bg-canvas px-2 py-0.5 font-semibold text-text">{c.count} bookings</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: table — the whole row opens the client */}
      <div className="card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="th">Business</th>
                <th className="th">Owner</th>
                <th className="th">WhatsApp</th>
                <th className="th">Connection</th>
                <th className="th">Plan</th>
                <th className="th">Status</th>
                <th className="th">Bookings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-muted">No clients match.</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} onClick={() => open(c)} onKeyDown={(e) => e.key === "Enter" && open(c)} tabIndex={0} className="cursor-pointer transition hover:bg-brand-tint/30 focus:bg-brand-tint/30 focus:outline-none">
                  <td className="cell">
                    <Link href={`/admin/clients/${c.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">{initials(c.name)}</div>
                      <div><p className="font-medium text-text">{c.name || "Unnamed business"}</p><p className="text-xs text-muted">{c.location || ""}</p></div>
                    </Link>
                  </td>
                  <td className="cell text-muted">{c.owner_email || "—"}</td>
                  <td className="cell font-mono text-[12.5px] text-muted">{formatPhone(c.whatsapp_number) || "—"}</td>
                  <td className="cell"><Connection c={c} /></td>
                  <td className="cell text-muted">{c.plan || "—"}{c.sub_status ? <span className="block text-[11px]">{c.sub_status}</span> : null}</td>
                  <td className="cell"><Status c={c} /></td>
                  <td className="cell"><span className="rounded-md bg-canvas px-2 py-1 text-xs font-semibold text-text">{c.count}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
