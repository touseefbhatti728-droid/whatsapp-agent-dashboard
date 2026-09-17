import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function when(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
function initials(n) { return n ? n.trim().split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()).join("") : "•"; }

export default async function AdminOverview() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (profile?.is_admin !== true) redirect("/dashboard");

  const { data: businesses } = await supabase
    .from("businesses").select("id, name, status, whatsapp_number, created_at").order("created_at", { ascending: false });
  const { data: bookings } = await supabase
    .from("bookings").select("id, ref_no, customer_name, service, start_time, business_id").order("created_at", { ascending: false }).limit(8);

  const total = businesses?.length || 0;
  const suspended = (businesses || []).filter(b => b.status === "suspended").length;
  const active = total - suspended;
  const { count: bookingCount } = await supabase.from("bookings").select("*", { count: "exact", head: true });
  const { data: subRows } = await supabase.from("businesses").select("plan, sub_status");
  const { data: planRows } = await supabase.from("plans").select("name, price");
  const priceOf = {};
  (planRows || []).forEach((p) => { priceOf[p.name] = Number(p.price) || 0; });
  const activeSubs = (subRows || []).filter((b) => b.sub_status === "active").length;
  const mrr = (subRows || []).filter((b) => b.sub_status === "active").reduce((sum, b) => sum + (priceOf[b.plan] || 0), 0);
  const bName = (id) => (businesses || []).find(b => b.id === id)?.name || "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Overview</h1>
        <p className="page-sub">A snapshot of your whole platform.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Stat label="Total clients" value={total} />
        <Stat label="Active" value={active} accent />
        <Stat label="Suspended" value={suspended} />
        <Stat label="Total bookings" value={bookingCount || 0} />
        <Stat label="Active subscriptions" value={activeSubs} />
        <Stat label="Est. MRR" value={`$${mrr}`} accent />
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-4 md:px-5">
          <h2 className="text-sm font-semibold text-text">Recent bookings</h2>
          <Link href="/admin/bookings" className="text-xs font-medium text-brand hover:text-brand-dark">View all →</Link>
        </div>
        {(bookings?.length || 0) === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-muted">No bookings yet.</div>
        ) : (
          <div className="divide-y divide-line">
            {bookings.map(b => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3.5 md:px-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{initials(b.customer_name)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{b.customer_name || "Unknown"} · <span className="text-muted">{b.service || "—"}</span></p>
                  <p className="truncate text-xs text-muted">{bName(b.business_id)} · {when(b.start_time)}</p>
                </div>
                <span className="shrink-0 rounded-md bg-brand-tint px-2 py-1 text-xs font-semibold text-brand-dark">{b.ref_no ? `BK-${b.ref_no}` : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-4 md:px-5">
          <h2 className="text-sm font-semibold text-text">Newest clients</h2>
          <Link href="/admin/clients" className="text-xs font-medium text-brand hover:text-brand-dark">Manage →</Link>
        </div>
        <div className="divide-y divide-line">
          {(businesses || []).slice(0, 5).map(b => (
            <Link key={b.id} href={`/admin/clients/${b.id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-canvas/60 md:px-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">{initials(b.name)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{b.name || "—"}</p>
                <p className="truncate text-xs text-muted">Joined {when(b.created_at)}</p>
              </div>
              {b.status === "suspended"
                ? <span className="pill shrink-0 bg-red-50 text-red-600">Suspended</span>
                : <span className="pill shrink-0 bg-brand-tint text-brand-dark">Active</span>}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="stat p-4 md:p-6">
      <div className="text-[13px] font-medium text-muted">{label}</div>
      <div className={`mt-2 text-[26px] font-bold leading-none tracking-tight md:text-[30px] ${accent ? "text-brand" : "text-text"}`}>{value}</div>
    </div>
  );
}