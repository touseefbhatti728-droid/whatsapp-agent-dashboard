import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { setBusinessStatus } from "../../actions";
import SubscriptionForm from "@/components/SubscriptionForm";

function when(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
function initials(n) { return n ? n.trim().split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()).join("") : "•"; }

export default async function ClientDetail({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (profile?.is_admin !== true) redirect("/dashboard");

  const { data: b } = await supabase.from("businesses").select("*").eq("id", id).single();
  if (!b) notFound();

  const { data: bookings } = await supabase
    .from("bookings").select("id, ref_no, customer_name, customer_phone, service, start_time")
    .eq("business_id", id).order("start_time", { ascending: false });

  const { data: plans } = await supabase.from("plans").select("name, price, interval").order("sort");

  const suspended = b.status === "suspended";
  const now = new Date();

  return (
    <div className="space-y-8">
      <Link href="/admin/clients" className="text-sm text-muted hover:text-text">← Back to clients</Link>

      {/* Header */}
      <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-white">{initials(b.name)}</div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-text">{b.name || "—"}</h1>
              {suspended
                ? <span className="pill bg-red-50 text-red-600">Suspended</span>
                : <span className="pill bg-brand-tint text-brand-dark">Active</span>}
            </div>
            <p className="mt-0.5 text-sm text-muted">{b.location || "No location set"}</p>
          </div>
        </div>
        <form action={setBusinessStatus}>
          <input type="hidden" name="id" value={b.id} />
          <input type="hidden" name="status" value={suspended ? "active" : "suspended"} />
          <button
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              suspended ? "bg-brand text-white hover:bg-brand-dark" : "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            {suspended ? "Activate account" : "Suspend account"}
          </button>
        </form>
      </div>

      {/* Subscription */}
      <section className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-text">Subscription</h2>
        <SubscriptionForm businessId={b.id} plans={plans || []} current={{ plan: b.plan, sub_status: b.sub_status, renews_at: b.renews_at }} />
      </section>

      {/* Info grid */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Info label="Owner email" value={b.owner_email} />
        <Info label="WhatsApp number" value={b.whatsapp_number} />
        <Info label="Connection" value={b.whatsapp_number ? "Connected" : "Not set"} />
        <Info label="Joined" value={when(b.created_at)} />
        <Info label="Business hours" value={b.hours} />
        <Info label="Services" value={b.services} />
      </section>

      {/* Configured info */}
      {(b.faq || b.booking) && (
        <section className="card p-6">
          <h2 className="mb-3 text-sm font-semibold text-text">Agent knowledge</h2>
          {b.booking && <p className="mb-2 text-sm"><span className="font-medium text-text">Booking: </span><span className="text-muted">{b.booking}</span></p>}
          {b.faq && <p className="text-sm"><span className="font-medium text-text">FAQ: </span><span className="text-muted">{b.faq}</span></p>}
        </section>
      )}

      {/* Bookings */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-text">Bookings</h2>
          <span className="text-xs text-muted">{bookings?.length || 0} total</span>
        </div>
        {(bookings?.length || 0) === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-muted">No bookings for this client yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-line">
                <th className="th">Ref</th><th className="th">Customer</th><th className="th">Service</th><th className="th">When</th><th className="th">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {bookings.map((bk) => (
                  <tr key={bk.id} className="transition hover:bg-canvas/60">
                    <td className="cell"><span className="rounded-md bg-brand-tint px-2 py-1 text-xs font-semibold text-brand-dark">{bk.ref_no ? `BK-${bk.ref_no}` : "—"}</span></td>
                    <td className="cell"><p className="font-medium text-text">{bk.customer_name || "Unknown"}</p><p className="text-xs text-muted">{bk.customer_phone || "—"}</p></td>
                    <td className="cell text-muted">{bk.service || "—"}</td>
                    <td className="cell text-muted">{when(bk.start_time)}</td>
                    <td className="cell">{new Date(bk.start_time) >= now
                      ? <span className="pill bg-brand-tint text-brand-dark">Upcoming</span>
                      : <span className="pill bg-canvas text-muted">Past</span>}</td>
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

function Info({ label, value }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm text-text">{value || "—"}</p>
    </div>
  );
}
