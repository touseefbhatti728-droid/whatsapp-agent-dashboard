import { createClient } from "@/lib/supabase/server";

function formatWhen(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const businessName = (id) =>
    (businesses || []).find((b) => b.id === id)?.name || "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">My bookings</h1>
        <p className="mt-1 text-sm text-muted">
          Appointments your WhatsApp agent has booked.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Businesses" value={businesses?.length || 0} />
        <Stat label="Total bookings" value={bookings.length} />
        <Stat
          label="Upcoming"
          value={bookings.filter((b) => new Date(b.start_time) >= new Date()).length}
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-sm font-medium text-ink">All appointments</h2>
        </div>

        {bookings.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted">
            No bookings yet. When a customer books on WhatsApp, it shows up here.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-canvas text-left text-xs font-medium text-muted">
              <tr>
                <th className="cell">Ref</th>
                <th className="cell">Customer</th>
                <th className="cell">Service</th>
                <th className="cell">When</th>
                <th className="cell">Phone</th>
                {businessIds.length > 1 && <th className="cell">Business</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="cell font-medium text-brand">
                    {b.ref_no ? `BK-${b.ref_no}` : "—"}
                  </td>
                  <td className="cell font-medium text-ink">{b.customer_name || "—"}</td>
                  <td className="cell text-muted">{b.service || "—"}</td>
                  <td className="cell text-muted">{formatWhen(b.start_time)}</td>
                  <td className="cell text-muted">{b.customer_phone || "—"}</td>
                  {businessIds.length > 1 && (
                    <td className="cell text-muted">{businessName(b.business_id)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-line bg-white px-4 py-4">
      <div className="text-2xl font-semibold text-ink">{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  );
}