import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function initials(name) {
  if (!name) return "•";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
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

  if (profile?.is_admin !== true) redirect("/dashboard");

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, location, whatsapp_number, owner_email, created_at")
    .order("created_at", { ascending: false });

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, business_id, customer_name, service, start_time")
    .order("start_time", { ascending: false })
    .limit(100);

  const countFor = (id) => (bookings || []).filter((b) => b.business_id === id).length;
  const weekCount = (bookings || []).filter(
    (b) => new Date(b.start_time) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">All clients</h1>
        <p className="mt-1 text-sm text-muted">Every business on the platform and their booking activity.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Clients" value={businesses?.length || 0} />
        <Stat label="Recent bookings" value={bookings?.length || 0} />
        <Stat label="Active this week" value={weekCount} accent />
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-text">Clients</h2>
          <span className="text-xs text-muted">{businesses?.length || 0} businesses</span>
        </div>

        {(businesses?.length || 0) === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-medium text-text">No clients yet</p>
            <p className="mt-1 text-sm text-muted">New businesses will show up here once onboarded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="th">Business</th>
                  <th className="th">Owner</th>
                  <th className="th">WhatsApp</th>
                  <th className="th">Bookings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {businesses.map((b) => (
                  <tr key={b.id} className="transition hover:bg-canvas/60">
                    <td className="cell">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                          {initials(b.name)}
                        </div>
                        <div>
                          <p className="font-medium text-text">{b.name || "—"}</p>
                          <p className="text-xs text-muted">{b.location || ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="cell text-muted">{b.owner_email || "—"}</td>
                    <td className="cell text-muted">{b.whatsapp_number || "—"}</td>
                    <td className="cell">
                      <span className="rounded-md bg-canvas px-2 py-1 text-xs font-semibold text-text">
                        {countFor(b.id)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="card px-5 py-5">
      <div className={`text-3xl font-semibold tracking-tight ${accent ? "text-brand" : "text-text"}`}>{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  );
}
