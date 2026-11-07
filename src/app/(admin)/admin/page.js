import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { manageBusiness } from "@/lib/manage-actions";

// Displayed USD prices (the charged amount comes from Stripe).
const USD = { starter: 29, pro: 59, business: 99 };
const DAY = 864e5;

function ago(ts) {
  if (!ts) return "—";
  const m = Math.round((Date.now() - new Date(ts)) / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}
function initials(n) { return n ? n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") : "•"; }
function dayKey(d) { return new Date(d).toISOString().slice(0, 10); }

// Mission control: money, growth, health and what needs the admin's attention.
export default async function MissionControl() {
  const supabase = await createClient();
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  const since14 = new Date(Date.now() - 14 * DAY).toISOString();
  const since7 = new Date(Date.now() - 7 * DAY).toISOString();

  const [{ data: biz }, { count: bookingsAll }, { data: bk14 }, { count: msgs7 }, { data: recentBk }] = await Promise.all([
    supabase.from("businesses").select("id, name, owner_email, status, plan, sub_status, renews_at, created_at, meta_phone_number_id, widget_seen_at, fb_page_id, ig_account_id, stripe_customer_id"),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("created_at").gte("created_at", since14).limit(5000),
    supabase.from("messages").select("id", { count: "exact", head: true }).gte("created_at", since7),
    supabase.from("bookings").select("id, ref_no, customer_name, service, start_time, created_at, business_id, source").order("created_at", { ascending: false }).limit(6),
  ]);
  const all = biz || [];
  const nameOf = Object.fromEntries(all.map((b) => [b.id, b.name || "—"]));

  const paying = all.filter((b) => b.sub_status === "active");
  const trials = all.filter((b) => b.sub_status === "trialing");
  const pastDue = all.filter((b) => b.sub_status === "past_due");
  const free = all.filter((b) => !["active", "trialing", "past_due"].includes(b.sub_status));
  const suspended = all.filter((b) => b.status === "suspended");
  const mrr = paying.reduce((s, b) => s + (USD[String(b.plan || "").toLowerCase()] || 0), 0);
  const trialMrr = trials.filter((b) => b.stripe_customer_id).reduce((s, b) => s + (USD[String(b.plan || "").toLowerCase()] || 0), 0);
  const endingSoon = trials.filter((b) => b.renews_at && new Date(b.renews_at) - Date.now() < 3 * DAY && new Date(b.renews_at) > Date.now());
  const noChannel = all.filter((b) => !b.meta_phone_number_id && !b.widget_seen_at && !b.fb_page_id && b.status !== "suspended");
  const new30 = all.filter((b) => b.created_at >= since30).length;

  // Daily series for the last 14 days.
  const days = Array.from({ length: 14 }, (_, i) => dayKey(Date.now() - (13 - i) * DAY));
  const signups = Object.fromEntries(days.map((d) => [d, 0]));
  all.forEach((b) => { const k = dayKey(b.created_at); if (k in signups) signups[k]++; });
  const bookings = Object.fromEntries(days.map((d) => [d, 0]));
  (bk14 || []).forEach((b) => { const k = dayKey(b.created_at); if (k in bookings) bookings[k]++; });

  const adoption = [
    ["WhatsApp", all.filter((b) => b.meta_phone_number_id).length, "#25D366"],
    ["Website chat", all.filter((b) => b.widget_seen_at).length, "#a855f7"],
    ["Messenger", all.filter((b) => b.fb_page_id).length, "#0866FF"],
    ["Instagram", all.filter((b) => b.ig_account_id).length, "#FF0069"],
  ];
  const mix = [
    ["Paying", paying.length, "#7c3aed"],
    ["Trial", trials.length, "#c084fc"],
    ["Payment failed", pastDue.length, "#f87171"],
    ["Free / not started", free.length, "#d4d4dc"],
  ];
  const total = all.length || 1;

  const alerts = [
    ...pastDue.map((b) => ({ b, tone: "red", text: "Payment failed — card needs updating" })),
    ...endingSoon.map((b) => ({ b, tone: "amber", text: `Trial ends ${new Date(b.renews_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` })),
    ...suspended.map((b) => ({ b, tone: "red", text: "Account suspended" })),
    ...noChannel.slice(0, 6).map((b) => ({ b, tone: "blue", text: "No channel connected yet — help them go live" })),
  ].slice(0, 9);

  return (
    <div className="space-y-6">
      <div className="admin-hero relative overflow-hidden rounded-3xl p-6 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Mission control</p>
            <h1 className="mt-1 text-[30px] font-bold tracking-tight">Your whole platform, one room</h1>
            <p className="mt-1 text-sm text-white/80">{all.length} businesses · {new30} joined in the last 30 days · ${mrr.toLocaleString()} MRR</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/clients" className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25">All customers</Link>
            <Link href="/admin/health" className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25">System health</Link>
            <Link href="/admin/assistant" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#5b21b6] shadow-lg transition hover:bg-white/90">Ask the AI assistant</Link>
          </div>
        </div>
      </div>

      {/* Money + growth */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi big label="Monthly recurring revenue" value={`$${mrr.toLocaleString()}`} sub={trialMrr ? `+$${trialMrr} more when trials convert` : `${paying.length} paying customer${paying.length === 1 ? "" : "s"}`} glow />
        <Kpi label="Paying customers" value={paying.length} sub={`ARPU $${paying.length ? Math.round(mrr / paying.length) : 0}`} href="/admin/clients?f=paying" />
        <Kpi label="On trial" value={trials.length} sub={endingSoon.length ? `${endingSoon.length} ending in 3 days` : "None ending soon"} href="/admin/clients?f=trial" />
        <Kpi label="Payment failed" value={pastDue.length} sub={pastDue.length ? "Follow up today" : "All cards OK"} tone={pastDue.length ? "red" : undefined} href="/admin/clients?f=past_due" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Last 14 days</h2>
            <div className="flex gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#7c3aed]" />Bookings</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#c084fc]" />Sign-ups</span>
            </div>
          </div>
          <Bars days={days} a={bookings} b={signups} />
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
            <Mini label="Bookings (all time)" value={(bookingsAll || 0).toLocaleString()} />
            <Mini label="Bookings (14 days)" value={(bk14 || []).length} />
            <Mini label="Messages (7 days)" value={(msgs7 || 0).toLocaleString()} />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-text">Customer mix</h2>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-canvas">
            {mix.map(([l, n, c]) => n > 0 && <span key={l} style={{ width: `${(n / total) * 100}%`, background: c }} />)}
          </div>
          <ul className="mt-4 space-y-2.5">
            {mix.map(([l, n, c]) => (
              <li key={l} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
                <span className="flex-1 text-body">{l}</span>
                <span className="font-semibold text-text">{n}</span>
                <span className="w-10 text-right text-xs text-muted">{Math.round((n / total) * 100)}%</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-6 text-sm font-semibold text-text">Channel adoption</h3>
          <ul className="mt-3 space-y-3">
            {adoption.map(([l, n, c]) => (
              <li key={l}>
                <div className="flex justify-between text-xs"><span className="text-body">{l}</span><span className="text-muted">{n} / {all.length}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full" style={{ width: `${(n / total) * 100}%`, background: c }} /></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {/* Needs attention */}
        <div className="card overflow-hidden xl:col-span-1">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold text-text">Needs your attention</h2>
            <span className="pill bg-brand-tint text-brand-dark">{alerts.length}</span>
          </div>
          {alerts.length === 0 ? <p className="px-5 py-10 text-center text-sm text-muted">All clear ✨</p> : (
            <ul className="divide-y divide-line">
              {alerts.map(({ b, tone, text }, i) => (
                <li key={i}>
                  <Link href={`/admin/clients/${b.id}`} className="flex items-start gap-3 px-5 py-3 transition hover:bg-canvas/60">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone === "red" ? "bg-red-400" : tone === "amber" ? "bg-amber-400" : "bg-sky-400"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text">{b.name || b.owner_email || "Unnamed"}</span>
                      <span className="block truncate text-xs text-muted">{text}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* New customers */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold text-text">Newest customers</h2>
            <Link href="/admin/clients" className="text-xs font-semibold text-brand">See all →</Link>
          </div>
          <ul className="divide-y divide-line">
            {[...all].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 6).map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                <Link href={`/admin/clients/${b.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c3aed]/80 to-[#c084fc]/80 text-xs font-bold text-white">{initials(b.name)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-text">{b.name || "Unnamed"}</span>
                    <span className="block truncate text-xs text-muted">{ago(b.created_at)} · {b.sub_status === "active" ? b.plan : b.sub_status === "trialing" ? "trial" : "free"}</span>
                  </span>
                </Link>
                <form action={manageBusiness}>
                  <input type="hidden" name="id" value={b.id} />
                  <button title="Open their dashboard" className="rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-muted transition hover:border-brand hover:text-brand">Open</button>
                </form>
              </li>
            ))}
          </ul>
        </div>

        {/* Latest bookings */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold text-text">Latest bookings</h2>
            <Link href="/admin/bookings" className="text-xs font-semibold text-brand">See all →</Link>
          </div>
          {(recentBk || []).length === 0 ? <p className="px-5 py-10 text-center text-sm text-muted">No bookings yet.</p> : (
            <ul className="divide-y divide-line">
              {recentBk.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text">{b.customer_name || "Unknown"} <span className="text-muted">· {b.service || "Appointment"}</span></span>
                    <span className="block truncate text-xs text-muted">{nameOf[b.business_id]} · {ago(b.created_at)}</span>
                  </span>
                  {b.ref_no && <span className="shrink-0 rounded-md bg-brand-tint px-2 py-0.5 text-[11px] font-semibold text-brand-dark">BK-{b.ref_no}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, href, tone, big, glow }) {
  const inner = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className={`mt-2 font-bold tracking-tight ${big ? "text-[34px]" : "text-[28px]"} ${tone === "red" ? "text-red-400" : glow ? "bg-gradient-to-r from-[#6d28d9] to-[#c084fc] bg-clip-text text-transparent" : "text-text"}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </>
  );
  const cls = `card block p-5 transition ${glow ? "admin-glow" : ""} ${href ? "hover:-translate-y-0.5 hover:border-brand/50" : ""}`;
  return href ? <Link href={href} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}
function Mini({ label, value }) {
  return <div><p className="text-lg font-bold text-text">{value}</p><p className="text-[11px] text-muted">{label}</p></div>;
}
function Bars({ days, a, b }) {
  const max = Math.max(1, ...days.map((d) => a[d]), ...days.map((d) => b[d]));
  return (
    <div className="mt-5 flex h-40 items-end gap-1.5">
      {days.map((d) => (
        <div key={d} className="group relative flex flex-1 flex-col items-center gap-1">
          <div className="flex h-32 w-full items-end justify-center gap-0.5">
            <span className="w-1/2 rounded-t bg-[#7c3aed] transition group-hover:brightness-125" style={{ height: `${(a[d] / max) * 100}%`, minHeight: a[d] ? 3 : 0 }} />
            <span className="w-1/2 rounded-t bg-[#c084fc] transition group-hover:brightness-125" style={{ height: `${(b[d] / max) * 100}%`, minHeight: b[d] ? 3 : 0 }} />
          </div>
          <span className="text-[9px] text-muted">{new Date(d).getUTCDate()}</span>
          <span className="pointer-events-none absolute -top-7 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] text-white group-hover:block">{a[d]} bookings · {b[d]} sign-ups</span>
        </div>
      ))}
    </div>
  );
}
