import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StripeUpgradeButton, { ManageBillingButton } from "@/components/StripeUpgradeButton";
import BillingToast from "@/components/BillingToast";
import { Suspense } from "react";
import VoicePlanPicker from "@/components/VoicePlanPicker";

// Displayed prices (USD) — charged amount comes from Stripe.
const USD_PRICE = { starter: 29, pro: 59, business: 99 };

function fmtDate(ts) { return ts ? new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"; }
const STATUS_LABEL = { trialing: "Free trial", active: "Active", past_due: "Payment failed", cancelled: "Cancelled", inactive: "Not started" };

const IcChat = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>);
const IcSpark = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 4.8L18.5 9l-4.6 1.2L12 15l-1.9-4.8L5.5 9l4.6-1.2z"/></svg>);
const IcGlobe = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>);
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

  const { data: businesses } = await supabase.from("businesses").select("*").eq("owner_id", user.id).order("created_at", { ascending: true });
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
  // Free plan: website conversations (distinct visitors) this month.
  const FREE_CHATS = 50;
  let freeUsed = 0;
  if (biz) {
    const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
    const { data: webMsgs } = await supabase.from("messages").select("customer_phone").eq("business_id", biz.id).eq("role", "user")
      .like("customer_phone", "web:%").gte("created_at", start.toISOString()).limit(10000);
    freeUsed = new Set((webMsgs || []).map((m) => m.customer_phone)).size;
  }
  // A real Stripe subscription exists (old no-card "trialing" defaults don't count).
  const hasSub = !!(biz && biz.stripe_customer_id && ["trialing", "active", "past_due"].includes(biz.sub_status));
  const trialEligible = !!(biz && !biz.stripe_customer_id);
  // Plan switched on by an admin without Stripe (e.g. a free trial we gave) — the AI is on.
  const adminGranted = !!(biz && !biz.stripe_customer_id && ["trialing", "active"].includes(biz.sub_status));
  const btnLabel = trialEligible ? "Start 7-day free trial" : hasSub ? "Switch plan" : "Subscribe";

  return (
    <div className="space-y-8">
      <Suspense fallback={null}><BillingToast /></Suspense>
      <div>
        <h1 className="page-title">Billing</h1>
        <p className="page-sub">Your current plan, usage, and available plans.</p>
      </div>

      {biz && (
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Current plan</p>
              <p className="mt-1 text-xl font-bold text-text">{hasSub || adminGranted ? (biz.plan || "—") : "Free plan"}</p>
              <p className="mt-1 text-sm text-muted">
                {adminGranted ? "Free access given by NextReply — your AI is on. Start a plan below any time to keep it running when this ends."
                  : biz.sub_status === "trialing" && biz.stripe_customer_id ? `Free trial — first payment on ${fmtDate(biz.renews_at)}`
                  : biz.sub_status === "active" ? `Renews on ${fmtDate(biz.renews_at)}`
                  : biz.sub_status === "past_due" ? "Payment failed — only the free website chat is on until the card is updated"
                  : biz.sub_status === "cancelled" ? "Subscription ended — you're back on the free website chat"
                  : `Your AI answers on your website for free — ${freeUsed} of ${FREE_CHATS} chats used this month. Start a 7-day free trial for WhatsApp, Instagram, Messenger, photos and unlimited chats.`}
              </p>
              {!hasSub && !adminGranted && biz.sub_status !== "active" && (
                <div className="mt-3 h-2 w-64 max-w-full overflow-hidden rounded-full bg-canvas">
                  <div className={`h-full rounded-full ${freeUsed >= FREE_CHATS ? "bg-red-500" : "bg-brand"}`} style={{ width: `${Math.min(100, (freeUsed / FREE_CHATS) * 100)}%` }} />
                </div>
              )}
            </div>
            <span className={`pill ${biz.sub_status === "active" ? "bg-brand-tint text-brand-dark" : biz.sub_status === "past_due" || biz.sub_status === "cancelled" ? "bg-red-50 text-red-600" : "bg-canvas text-muted"}`}>
              {STATUS_LABEL[biz.sub_status] || biz.sub_status || "—"}
            </span>
            {biz.stripe_customer_id && <ManageBillingButton />}
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
          <VoicePlanPicker
            current={biz.voice_plan || null}
            used={Number(biz.voice_minutes_used) || 0}
            included={Number(biz.voice_minutes_included) || 0}
            addon={Number(biz.voice_addon_minutes) || 0}
            hasSub={hasSub}
            active={biz.sub_status === "active"}
            ready={"voice_plan" in biz}
          />
        </div>
      )}

      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-text">Plans</h2>
            <p className="text-xs text-muted">Start free on your website. Upgrade when you want WhatsApp, Instagram, Messenger and unlimited chats.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-medium text-muted">
            <span className="pill bg-surface">🔒 Secure checkout by Stripe</span>
            <span className="pill bg-surface">↺ Cancel anytime</span>
            {trialEligible && <span className="pill bg-brand-tint text-brand-dark">7 days free</span>}
          </div>
        </div>
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className={`flex flex-col rounded-[22px] border bg-surface p-6 ${!hasSub && !adminGranted ? "border-brand ring-1 ring-brand" : "border-line"}`}>
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-canvas text-muted">{IcGlobe}</span>
              {!hasSub && !adminGranted && <span className="pill bg-brand-tint text-brand-dark">Current</span>}
            </div>
            <p className="mt-4 text-lg font-bold text-text">Free</p>
            <p className="mt-1 text-sm text-muted">Try the AI on your own website, no card needed.</p>
            <p className="mt-4 text-3xl font-extrabold text-text">$0<span className="text-base font-medium text-muted">/mo</span></p>
            <div className="my-5 h-px w-full bg-line" />
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">What you get</p>
            <ul className="flex-1 space-y-2.5">
              {["AI chat on your website — 50 chats a month", "Online booking page", "Bookings in your calendar", "WordPress plugin"].map((f, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-text/80"><Check />{f}</li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl bg-canvas px-4 py-2.5 text-center text-xs font-semibold text-muted">{!hasSub && !adminGranted ? `${freeUsed} of ${FREE_CHATS} chats used` : "Included"}</div>
          </div>
          {(plans || []).map((p) => {
            const meta = PLAN_META[String(p.name).toLowerCase()] || { tagline: "", header: "What you get", icon: IcChat };
            const current = hasSub && String(biz?.plan || "").toLowerCase() === String(p.name).toLowerCase();
            const popular = String(p.name).toLowerCase() === "pro";
            const features = [bookingsLabel(p), ...planFeatures(p)];
            const priceUsd = USD_PRICE[String(p.name).toLowerCase()] ?? p.price;

            if (popular) {
              return (
                <div key={p.name} className="relative flex flex-col rounded-[22px] bg-ink p-6 text-white shadow-[0_30px_60px_-30px_rgba(17,12,40,0.7)] xl:-mt-3 xl:mb-3">
                  <span className="mb-4 inline-flex w-fit items-center gap-1 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">★ Most Popular</span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white">{meta.icon}</span>
                  <p className="mt-4 text-lg font-bold">{p.name}</p>
                  {meta.tagline && <p className="mt-1 text-sm text-white/55">{meta.tagline}</p>}
                  <p className="mt-4 text-3xl font-extrabold">${priceUsd}<span className="text-base font-medium text-white/50">/{p.interval === "month" ? "mo" : p.interval}</span></p>
                  <div className="my-5 h-px w-full bg-white/10" />
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-white/45">{meta.header}</p>
                  <ul className="flex-1 space-y-2.5">
                    {features.map((f, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-white/85"><Check dark />{f}</li>
                    ))}
                  </ul>
                  <StripeUpgradeButton plan={p.name} current={current} popular label={btnLabel} />
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
                <p className="mt-4 text-3xl font-extrabold text-text">${priceUsd}<span className="text-base font-medium text-muted">/{p.interval === "month" ? "mo" : p.interval}</span></p>
                <div className="my-5 h-px w-full bg-line" />
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">{meta.header}</p>
                <ul className="flex-1 space-y-2.5">
                  {features.map((f, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-text/80"><Check />{f}</li>
                  ))}
                </ul>
                <StripeUpgradeButton plan={p.name} current={current} label={btnLabel} />
              </div>
            );
          })}
        </div>
        <Compare plans={plans || []} />
        <p className="mt-4 text-xs text-muted">{trialEligible ? "7 days free, then billed monthly. A card is required to start; cancel anytime before the trial ends and you won’t be charged." : "Secure checkout by Stripe. Change plan, update your card or cancel anytime from Manage subscription."}</p>
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

// What each plan includes, side by side.
function Compare({ plans }) {
  const paid = plans.map((p) => ({ name: p.name, key: String(p.name).toLowerCase(), limit: p.monthly_booking_limit, history: p.chat_history !== false }));
  const cols = [{ name: "Free", key: "free" }, ...paid];
  const yes = <span className="text-brand">✓</span>;
  const no = <span className="text-muted/50">—</span>;
  const rows = [
    ["Website chat", (c) => (c.key === "free" ? "50 chats / month" : "Unlimited")],
    ["Online booking page", () => yes],
    ["WhatsApp AI receptionist", (c) => (c.key === "free" ? no : yes)],
    ["Instagram & Messenger DMs", (c) => (c.key === "free" ? no : yes)],
    ["Customers can send photos", (c) => (c.key === "free" ? no : yes)],
    ["Bookings per month", (c) => (c.key === "free" ? "Booking page only" : c.limit == null ? "Unlimited" : c.limit.toLocaleString())],
    ["Full conversation history", (c) => (c.key === "free" ? no : c.history ? yes : no)],
    ["CRM / Zapier webhook", (c) => (c.key === "business" ? yes : no)],
    ["AI phone receptionist", (c) => (c.key === "free" ? no : "From $35/mo")],
  ];
  return (
    <div className="card mt-6 overflow-hidden">
      <div className="border-b border-line px-5 py-4"><h3 className="text-sm font-semibold text-text">Compare plans</h3></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="border-b border-line">
            <th className="th w-[34%]">Feature</th>
            {cols.map((c) => <th key={c.key} className={`th text-center ${c.key === "pro" ? "text-brand" : ""}`}>{c.name}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map(([label, fn]) => (
              <tr key={label}>
                <td className="cell text-text">{label}</td>
                {cols.map((c) => <td key={c.key} className={`cell text-center text-text/80 ${c.key === "pro" ? "bg-brand-tint/30" : ""}`}>{fn(c)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
