"use client";

import { useState } from "react";
import Link from "next/link";

function initials(n) { return n ? n.trim().split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()).join("") : "•"; }

export default function ClientSearch({ clients }) {
  const [q, setQ] = useState("");
  const filtered = clients.filter((c) => {
    const s = `${c.name || ""} ${c.owner_email || ""} ${c.whatsapp_number || ""} ${c.location || ""}`.toLowerCase();
    return s.includes(q.trim().toLowerCase());
  });

  return (
    <div className="space-y-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, email, number…"
        className="field max-w-sm"
      />

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">No clients match "{q}".</div>
        ) : filtered.map((c) => (
          <Link key={c.id} href={`/admin/clients/${c.id}`} className="card block p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{initials(c.name)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text">{c.name || "—"}</p>
                <p className="truncate text-xs text-muted">{c.location || c.owner_email || ""}</p>
              </div>
              {c.status === "suspended"
                ? <span className="pill shrink-0 bg-red-50 text-red-600">Suspended</span>
                : <span className="pill shrink-0 bg-brand-tint text-brand-dark">Active</span>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3 text-xs text-muted">
              <span className="truncate">{c.owner_email || "—"}</span>
              <span>{c.whatsapp_number || "No number"}</span>
              {c.whatsapp_number
                ? <span className="pill bg-brand-tint text-brand-dark"><span className="h-1.5 w-1.5 rounded-full bg-brand" /> Connected</span>
                : <span className="pill bg-canvas text-muted">Not set</span>}
              <span className="rounded-md bg-canvas px-2 py-0.5 font-semibold text-text">{c.count} bookings</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="th">Business</th>
                <th className="th">Owner</th>
                <th className="th">WhatsApp</th>
                <th className="th">Connection</th>
                <th className="th">Status</th>
                <th className="th">Bookings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-muted">No clients match "{q}".</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="cursor-pointer transition hover:bg-canvas/60">
                  <td className="cell">
                    <Link href={`/admin/clients/${c.id}`} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">{initials(c.name)}</div>
                      <div><p className="font-medium text-text">{c.name || "—"}</p><p className="text-xs text-muted">{c.location || ""}</p></div>
                    </Link>
                  </td>
                  <td className="cell text-muted">{c.owner_email || "—"}</td>
                  <td className="cell text-muted">{c.whatsapp_number || "—"}</td>
                  <td className="cell">
                    {c.whatsapp_number
                      ? <span className="pill bg-brand-tint text-brand-dark"><span className="h-1.5 w-1.5 rounded-full bg-brand" /> Connected</span>
                      : <span className="pill bg-canvas text-muted">Not set</span>}
                  </td>
                  <td className="cell">
                    {c.status === "suspended"
                      ? <span className="pill bg-red-50 text-red-600">Suspended</span>
                      : <span className="pill bg-brand-tint text-brand-dark">Active</span>}
                  </td>
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