"use client";

import { useState } from "react";

function when(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
function initials(n) { return n ? n.trim().split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()).join("") : "•"; }

export default function BookingsTable({ bookings }) {
  const [q, setQ] = useState("");
  const now = new Date();
  const filtered = bookings.filter((b) => {
    const s = `${b.customer_name || ""} ${b.service || ""} ${b.businessName || ""} ${b.ref_no ? "bk-" + b.ref_no : ""} ${b.customer_phone || ""}`.toLowerCase();
    return s.includes(q.trim().toLowerCase());
  });

  return (
    <div className="space-y-4">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer, service, business, ref…" className="field max-w-sm" />
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-line">
              <th className="th">Ref</th><th className="th">Customer</th><th className="th">Service</th><th className="th">Business</th><th className="th">When</th><th className="th">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-line">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-muted">No bookings match "{q}".</td></tr>
              ) : filtered.map((b) => (
                <tr key={b.id} className="transition hover:bg-canvas/60">
                  <td className="cell"><span className="rounded-md bg-brand-tint px-2 py-1 text-xs font-semibold text-brand-dark">{b.ref_no ? `BK-${b.ref_no}` : "—"}</span></td>
                  <td className="cell">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{initials(b.customer_name)}</div>
                      <div><p className="font-medium text-text">{b.customer_name || "Unknown"}</p><p className="text-xs text-muted">{b.customer_phone || "—"}</p></div>
                    </div>
                  </td>
                  <td className="cell text-muted">{b.service || "—"}</td>
                  <td className="cell text-muted">{b.businessName}</td>
                  <td className="cell text-muted">{when(b.start_time)}</td>
                  <td className="cell">{new Date(b.start_time) >= now
                    ? <span className="pill bg-brand-tint text-brand-dark">Upcoming</span>
                    : <span className="pill bg-canvas text-muted">Past</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
