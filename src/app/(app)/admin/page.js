import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function formatWhen(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  // Only admins get past here. RLS also blocks the data, this is the UI guard.
  if (profile?.is_admin !== true) redirect("/dashboard");

  // Admin RLS policies let these queries return every row.
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, location, whatsapp_number, owner_email, created_at")
    .order("created_at", { ascending: false });

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, business_id, customer_name, service, start_time")
    .order("start_time", { ascending: false })
    .limit(50);

  const countFor = (id) =>
    (bookings || []).filter((b) => b.business_id === id).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">All clients</h1>
        <p className="mt-1 text-sm text-muted">
          Every business on the platform and their recent bookings.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Clients" value={businesses?.length || 0} />
        <Stat label="Recent bookings" value={bookings?.length || 0} />
        <Stat
          label="Active this week"
          value={
            (bookings || []).filter(
              (b) =>
                new Date(b.start_time) >=
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length
          }
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-sm font-medium text-ink">Clients</h2>
        </div>
        {(businesses?.length || 0) === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted">
            No clients yet.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-canvas text-left text-xs font-medium text-muted">
              <tr>
                <th className="cell">Business</th>
                <th className="cell">Owner</th>
                <th className="cell">WhatsApp</th>
                <th className="cell">Bookings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {businesses.map((b) => (
                <tr key={b.id}>
                  <td className="cell font-medium text-ink">{b.name || "—"}</td>
                  <td className="cell text-muted">{b.owner_email || "—"}</td>
                  <td className="cell text-muted">{b.whatsapp_number || "—"}</td>
                  <td className="cell text-muted">{countFor(b.id)}</td>
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
