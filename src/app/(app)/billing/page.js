import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fmtDate(ts) { return ts ? new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"; }
const STATUS_LABEL = { trialing: "Trialing", active: "Active", past_due: "Past due", cancelled: "Cancelled" };
function planFeatures(p) {
  const f = [];
  f.push(p.monthly_booking_limit == null ? "Unlimited bookings / month" : `${p.monthly_booking_limit} bookings / month`);
  f.push(p.chat_history ? "Conversation history" : "No conversation history");
  if (p.features) f.push(p.features);
  return f;
}

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: businesses } = await supabase.from("businesses").select("id, name, plan, sub_status, renews_at").order("created_at", { ascending: true });
  const biz = businesses?.[0];
  const { data: plans } = await supabase.from("plans").select("name, price, interval, features, monthly_booking_limit, chat_history, sort").order("sort");

  let used = 0, limit = null;
  if (biz) {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    const { count } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("business_id", biz.id).gte("created_at", start.toISOString());
    used = count || 0;
    const cur = (plans || []).find((p) => p.name === biz.plan);
    limit = cur ? cur.monthly_booking_limit : null;
  }
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Billing</h1>
        <p className="page-sub">Your current plan, usage, and available upgrades.</p>
      </div>

      {biz && (
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Current plan</p>
              <p className="mt-1 text-xl font-bold text-text">{biz.plan || "—"}</p>
              <p className="mt-1 text-sm text-muted">Renews on {fmtDate(biz.renews_at)}</p>
            </div>
            <span className={`pill ${biz.sub_status === "active" ? "bg-brand-tint text-brand-dark" : biz.sub_status === "past_due" || biz.sub_status === "cancelled" ? "bg-red-50 text-red-600" : "bg-canvas text-muted"}`}>
              {STATUS_LABEL[biz.sub_status] || biz.sub_status || "—"}
            </span>
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-text">Bookings this month</span>
              <span className="text-muted">{used}{limit != null ? ` / ${limit}` : " / Unlimited"}</span>
            </div>
            {limit != null && (
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-canvas">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-text">Available plans</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {(plans || []).map((p) => {
            const current = biz?.plan === p.name;
            return (
              <div key={p.name} className={`card p-5 ${current ? "ring-2 ring-brand" : ""}`}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-text">{p.name}</p>
                  {current && <span className="pill bg-brand-tint text-brand-dark">Current</span>}
                </div>
                <p className="mt-2 text-2xl font-bold text-text">${p.price}<span className="text-sm font-normal text-muted">/{p.interval}</span></p>
                <ul className="mt-3 space-y-1.5">
                  {planFeatures(p).map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted"><span className="text-brand">✓</span>{f}</li>
                  ))}
                </ul>
                <button disabled className="btn-ghost mt-4 w-full cursor-not-allowed opacity-60">{current ? "Your plan" : "Upgrade (coming soon)"}</button>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted">Online payments are coming soon. For now, your provider manages your plan.</p>
      </div>
    </div>
  );
}
