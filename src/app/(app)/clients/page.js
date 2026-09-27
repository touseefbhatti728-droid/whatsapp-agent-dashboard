import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function initials(name) {
  if (!name) return "•";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}
function formatWhen(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default async function ClientsPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();

  const { data: businesses } = await supabase.from("businesses").select("id, name");
  const ids = (businesses || []).map((b) => b.id);

  let bookings = [];
  if (ids.length) {
    const { data } = await supabase
      .from("bookings")
      .select("customer_name, customer_phone, service, start_time, business_id")
      .in("business_id", ids)
      .order("start_time", { ascending: false });
    bookings = data || [];
  }

  // Group bookings into unique clients (by phone, falling back to name)
  const map = new Map();
  for (const b of bookings) {
    const key = (b.customer_phone || b.customer_name || "").trim().toLowerCase();
    if (!key) continue;
    const cur = map.get(key) || { name: b.customer_name, phone: b.customer_phone, count: 0, last: b.start_time, lastService: b.service };
    cur.count += 1;
    if (!cur.name && b.customer_name) cur.name = b.customer_name;
    map.set(key, cur);
  }
  const clients = [...map.values()].sort((a, b) => new Date(b.last) - new Date(a.last));
  const repeat = clients.filter((c) => c.count > 1).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Clients</h1>
        <p className="page-sub">Everyone your AI receptionist has booked, in one place.</p>
      </div>

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Total clients" value={clients.length} />
        <Stat label="Repeat clients" value={repeat} accent />
        <Stat label="Total bookings" value={bookings.length} />
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-4 md:px-5">
          <h2 className="text-sm font-semibold text-text">All clients</h2>
          <span className="text-xs text-muted">{clients.length} total</span>
        </div>

        {clients.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-medium text-text">No clients yet</p>
            <p className="mt-1 text-sm text-muted">When customers book on WhatsApp, they will show up here.</p>
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="divide-y divide-line md:hidden">
              {clients.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">{initials(c.name)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text">{c.name || "Unknown"}</p>
                    <p className="truncate text-xs text-muted">{c.phone || "—"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="pill bg-brand-tint text-brand-dark">{c.count} booking{c.count === 1 ? "" : "s"}</span>
                    <p className="mt-1 text-[11px] text-muted">{formatWhen(c.last)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="th">Client</th>
                    <th className="th">Phone</th>
                    <th className="th">Bookings</th>
                    <th className="th">Last service</th>
                    <th className="th">Last visit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {clients.map((c, i) => (
                    <tr key={i} className="transition hover:bg-canvas/60">
                      <td className="cell">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{initials(c.name)}</div>
                          <span className="font-medium text-text">{c.name || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="cell text-muted">{c.phone || "—"}</td>
                      <td className="cell"><span className="pill bg-brand-tint text-brand-dark">{c.count}</span></td>
                      <td className="cell text-muted">{c.lastService || "—"}</td>
                      <td className="cell text-muted">{formatWhen(c.last)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="stat p-4 md:p-6">
      <div className="text-[13px] font-medium text-muted">{label}</div>
      <div className={`mt-2 text-[24px] font-bold leading-none tracking-tight md:text-[30px] ${accent ? "text-brand" : "text-text"}`}>{value}</div>
    </div>
  );
}
