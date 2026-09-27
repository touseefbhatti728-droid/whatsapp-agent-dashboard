import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fmtDate(ts) { return ts ? new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"; }
const STATUS_LABEL = { trialing: "Trialing", active: "Active", past_due: "Past due", cancelled: "Cancelled" };

const IcChat = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>);
const IcSpark = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 4.8L18.5 9l-4.6 1.2L12 15l-1.9-4.8L5.5 9l4.6-1.2z"/></svg>);
const IcGrid = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>);

const PLAN_META = {
  starter: { tagline: "For solo owners who want every message answered and every slot filled.", header: "Services you get", icon: IcChat },
  pro: { tagline: "For busy businesses that never want to miss a booking, with full chat history.", header: "Everything in Starter, plus", icon: IcSpark },
  business: { tagline: "For growing brands with high message volume and their own tools.", header: "Everything in Pro, plus", icon: IcGrid },
};

function planFeatures(p) {
  if (!p.features) return [];
  return String(p.features).split("\n").map((s) => s.trim())
    .filter(Boolean).filter((f) => !/^everything in/i.test(f));
}
function bookingsLabel(p) {
  return p.monthly_booking_limit == null ? "Unlimited bookings every month" : `Up to ${p.monthly_booking_limit.toLocaleString()} bookings per month`;
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
        <p className="page-sub">Your current plan, usage, and available plans.</p>
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
              <span className="text-muted">{used}{limit != null ? ` / ${limit.toLocaleString()}` : " / Unlimited"}</span>
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
        <h2 className="mb-4 text-sm font-semibold text-text">Available plans</h2>
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {(plans || []).map((p) => {
            const meta = PLAN_META[String(p.name).toLowerCase()] || { tagline: "", header: "What you get", icon: IcChat };
            const current = biz?.plan === p.name;
            const popular = String(p.name).toLowerCase() === "pro";
            const features = [bookingsLabel(p), ...planFeatures(p)];

            if (popular) {
              return (
                <div key={p.name} className="relative flex flex-col rounded-[22px] bg-ink p-6 text-white shadow-[0_30px_60px_-30px_rgba(17,12,40,0.7)] lg:-mt-3 lg:mb-3">
                  <span className="mb-4 inline-flex w-fit items-center gap-1 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">★ Most Popular</span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white">{meta.icon}</span>
                  <p className="mt-4 text-lg font-bold">{p.name}</p>
                  {meta.tagline && <p className="mt-1 text-sm text-white/55">{meta.tagline}</p>}
                  <p className="mt-4 text-3xl font-extrabold">AED {p.price}<span className="text-base font-medium text-white/50">/{p.interval === "month" ? "mo" : p.interval}</span></p>
                  <div className="my-5 h-px w-full bg-white/10" />
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-white/45">{meta.header}</p>
                  <ul className="flex-1 space-y-2.5">
                    {features.map((f, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-white/85"><Check dark />{f}</li>
                    ))}
                  </ul>
                  <button disabled className="mt-6 w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-ink opacity-90">{current ? "Your plan" : "Upgrade (coming soon)"}</button>
                </div>
              );
            }

            return (
              <div key={p.name} className={`flex flex-col rounded-[22px] border bg-surface p-6 ${current ? "border-brand ring-1 ring-brand" : "border-line"}`}>
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand">{meta.icon}</span>
                  {current && <span className="pill bg-brand-tint text-brand-dark">Current</span>}
                </div>
                <p className="mt-4 text-lg font-bold text-text">{p.name}</p>
                {meta.tagline && <p className="mt-1 text-sm text-muted">{meta.tagline}</p>}
                <p className="mt-4 text-3xl font-extrabold text-text">AED {p.price}<span className="text-base font-medium text-muted">/{p.interval === "month" ? "mo" : p.interval}</span></p>
                <div className="my-5 h-px w-full bg-line" />
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">{meta.header}</p>
                <ul className="flex-1 space-y-2.5">
                  {features.map((f, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-text/80"><Check />{f}</li>
                  ))}
                </ul>
                <button disabled className="mt-6 w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-muted">{current ? "Your plan" : "Upgrade (coming soon)"}</button>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted">Online payments are coming soon. For now, your provider manages your plan.</p>
      </div>
    </div>
  );
}

function Check({ dark }) {
  return (
    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${dark ? "bg-brand text-white" : "bg-brand-tint text-brand"}`}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
    </span>
  );
}
