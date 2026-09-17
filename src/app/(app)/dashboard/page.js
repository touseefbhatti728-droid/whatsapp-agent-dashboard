import { createClient } from "@/lib/supabase/server";

function formatWhen(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}
function initials(name) {
  if (!name) return "•";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

export default async function DashboardPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, location, whatsapp_number")
    .order("created_at", { ascending: true });

  const businessIds = (businesses || []).map((b) => b.id);

  let bookings = [];
  if (businessIds.length > 0) {
    const { data } = await supabase
      .from("bookings")
      .select("id, ref_no, customer_name, customer_phone, service, start_time, business_id")
      .in("business_id", businessIds)
      .order("start_time", { ascending: true });
    bookings = data || [];
  }

  const now = new Date();
  const upcoming = bookings.filter((b) => new Date(b.start_time) >= now).length;
  const multi = businessIds.length > 1;
  const businessName = (id) => (businesses || []).find((b) => b.id === id)?.name || "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">My bookings</h1>
        <p className="page-sub">Appointments your WhatsApp agent has booked for you.</p>
      </div>

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Businesses" value={businesses?.length || 0} />
        <Stat label="Total bookings" value={bookings.length} />
        <Stat label="Upcoming" value={upcoming} accent />
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-4 md:px-5">
          <h2 className="text-sm font-semibold text-text">All appointments</h2>
          <span className="text-xs text-muted">{bookings.length} total</span>
        </div>

        {bookings.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-medium text-text">No bookings yet</p>
            <p className="mt-1 text-sm text-muted">When a customer books on WhatsApp, it'll appear here.</p>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="divide-y divide-line md:hidden">
              {bookings.map((b) => {
                const isUpcoming = new Date(b.start_time) >= now;
                return (
                  <div key={b.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                        {initials(b.customer_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-text">{b.customer_name || "Unknown"}</p>
                        <p className="truncate text-xs text-muted">{b.customer_phone || "—"}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-brand-tint px-2 py-1 text-xs font-semibold text-brand-dark">
                        {b.ref_no ? `BK-${b.ref_no}` : "—"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3 text-xs text-muted">
                      <span className="font-medium text-text">{b.service || "—"}</span>
                      <span>{formatWhen(b.start_time)}</span>
                      {multi && <span>{businessName(b.business_id)}</span>}
                      {isUpcoming
                        ? <span className="pill bg-brand-tint text-brand-dark"><span className="h-1.5 w-1.5 rounded-full bg-brand" /> Upcoming</span>
                        : <span className="pill bg-canvas text-muted">Past</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="th">Ref</th>
                    <th className="th">Customer</th>
                    <th className="th">Service</th>
                    <th className="th">When</th>
                    <th className="th">Status</th>
                    {multi && <th className="th">Business</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {bookings.map((b) => {
                    const isUpcoming = new Date(b.start_time) >= now;
                    return (
                      <tr key={b.id} className="transition hover:bg-canvas/60">
                        <td className="cell">
                          <span className="rounded-md bg-brand-tint px-2 py-1 text-xs font-semibold text-brand-dark">
                            {b.ref_no ? `BK-${b.ref_no}` : "—"}
                          </span>
                        </td>
                        <td className="cell">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                              {initials(b.customer_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-text">{b.customer_name || "Unknown"}</p>
                              <p className="text-xs text-muted">{b.customer_phone || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="cell text-muted">{b.service || "—"}</td>
                        <td className="cell text-muted">{formatWhen(b.start_time)}</td>
                        <td className="cell">
                          {isUpcoming ? (
                            <span className="pill bg-brand-tint text-brand-dark">
                              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Upcoming
                            </span>
                          ) : (
                            <span className="pill bg-canvas text-muted">Past</span>
                          )}
                        </td>
                        {multi && <td className="cell text-muted">{businessName(b.business_id)}</td>}
                      </tr>
                    );
                  })}
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