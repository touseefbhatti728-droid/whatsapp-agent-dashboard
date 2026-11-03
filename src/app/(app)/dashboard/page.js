import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, getIsAdmin, getActiveBusiness } from "@/lib/session";
import BookingLink from "@/components/BookingLink";

// Shown in the business timezone (the server runs in UTC).
function formatWhen(ts, tz = "Asia/Dubai") {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-GB", {
    timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}
function initials(name) {
  if (!name) return "•";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

// Midnight in the business's timezone, as a UTC Date (the server runs in UTC).
function zonedMidnight(tz, y, m, d) {
  const guess = new Date(Date.UTC(y, m, d));
  const offsetMs = new Date(guess.toLocaleString("en-US", { timeZone: tz })).getTime() - new Date(guess.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(guess.getTime() - offsetMs);
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [primary, isAdmin] = await Promise.all([getActiveBusiness(user.id), getIsAdmin(user.id)]);
  // A new owner without a business row finishes onboarding first.
  if (!primary && !isAdmin) redirect("/onboarding");

  const supabase = await createClient();
  const tz = primary?.timezone || "Asia/Dubai";
  const now = new Date();
  const [y, mo, d] = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(now).split("-").map(Number);
  const startToday = zonedMidnight(tz, y, mo - 1, d);
  const endToday = zonedMidnight(tz, y, mo - 1, d + 1);
  const startMonth = zonedMidnight(tz, y, mo - 1, 1);
  const endMonth = zonedMidnight(tz, y, mo, 1);

  // Counts + the next 6 bookings, all in parallel, for this owner's business only.
  const bizId = primary?.id || "00000000-0000-0000-0000-000000000000";
  const base = () => supabase.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", bizId);
  const [todayRes, monthRes, totalRes, upcomingCountRes, upcomingRes, servicesRes, recentRes] = await Promise.all([
    base().gte("start_time", startToday.toISOString()).lt("start_time", endToday.toISOString()),
    base().gte("start_time", startMonth.toISOString()).lt("start_time", endMonth.toISOString()),
    base(),
    base().gte("start_time", now.toISOString()),
    supabase.from("bookings")
      .select("id, ref_no, customer_name, customer_phone, service, start_time, business_id")
      .eq("business_id", bizId)
      .gte("start_time", now.toISOString())
      .order("start_time", { ascending: true })
      .limit(6),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", bizId),
    supabase.from("messages").select("customer_phone, content, created_at")
      .eq("business_id", bizId).eq("role", "user")
      .order("created_at", { ascending: false }).limit(40),
  ]);
  // Latest message per customer, newest first (5 chats)
  const recentChats = [];
  for (const m of recentRes.data || []) {
    if (!recentChats.some((c) => c.phone === m.customer_phone)) recentChats.push({ phone: m.customer_phone, text: m.content, at: m.created_at });
    if (recentChats.length >= 5) break;
  }

  // Status strip: is the AI actually answering right now?
  const subOn = ["active", "trialing"].includes(primary?.sub_status);
  // The AI only answers when the plan is on, the account isn't suspended AND WhatsApp is connected.
  const aiOn = subOn && primary?.status !== "suspended" && !!(primary?.meta_phone_number_id && primary?.meta_access_token);
  const aiWhyOff = primary?.status === "suspended" ? "Account suspended"
    : !subOn ? "Start a plan or trial in Billing"
    : "Connect WhatsApp so it can reply";
  const planLabel = primary?.plan ? `${primary.plan}${primary.sub_status === "trialing" ? " · trial" : ""}` : "No plan";
  const trialEnds = primary?.sub_status === "trialing" && primary?.renews_at
    ? new Date(primary.renews_at).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: tz }) : null;
  const todayCount = todayRes.count || 0;
  const monthCount = monthRes.count || 0;
  const totalCount = totalRes.count || 0;
  const upcomingCount = upcomingCountRes.count || 0;
  const upcoming = upcomingRes.data || [];

  const multi = false;
  const businessTitle = primary?.name || "your business";
  const businessName = () => primary?.name || "—";

  // Connected = the Meta credentials the AI needs to reply are saved (not just a typed number).
  const waConnected = !!(primary?.meta_phone_number_id && primary?.meta_access_token);
  const waDigits = (primary?.whatsapp_number || "").replace(/\D/g, "");
  const bookingLink = waConnected && waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent("Hi, I'd like to book an appointment")}` : "";
  const hasBookings = totalCount > 0;
  const hasServices = (servicesRes.count || 0) > 0;
  const frontDeskDone = !!(primary?.assistant_name || primary?.tone || primary?.first_greeting);
  const showSetup = !waConnected || !hasBookings || !hasServices;
  const steps = [
    { label: "Add your services", href: "/services", done: hasServices },
    { label: "Set up your AI front desk", href: "/ai-front-desk", done: frontDeskDone },
    { label: "Connect your WhatsApp number", href: "/connect-whatsapp", done: waConnected },
    { label: "Get your first booking on WhatsApp", href: "/calendar", done: hasBookings },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-muted">{new Date().toLocaleDateString("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="page-title mt-0.5">{businessTitle}</h1>
          <p className="page-sub">Here's how your AI receptionist is doing today.</p>
        </div>
        <Link href="/calendar?new=1" className="btn-brand inline-flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          New appointment
        </Link>
      </div>

      {/* Status strip — the four things an owner checks first */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard href={aiOn ? "/conversations" : subOn && primary?.status !== "suspended" ? "/connect-whatsapp" : "/billing"} label="AI receptionist" value={aiOn ? "Answering customers" : "Not answering yet"} ok={aiOn}
          sub={aiOn ? "Replies on WhatsApp 24/7" : aiWhyOff} />
        <StatusCard href="/connect-whatsapp" label="WhatsApp" value={waConnected ? `+${waDigits || "connected"}` : "Not connected"} ok={waConnected}
          sub={waConnected ? "Messages reach your AI" : "Connect your number to go live"} />
        <StatusCard href="/billing" label="Plan" value={planLabel} ok={subOn}
          sub={trialEnds ? `First payment on ${trialEnds}`
            : primary?.sub_status === "trialing" ? (primary?.stripe_customer_id ? "Free trial" : "Free access from NextReply")
            : primary?.sub_status === "active" ? "Active subscription"
            : "Choose a plan"} />
        <StatusCard href="/calendar" label="Today" value={`${todayCount} appointment${todayCount === 1 ? "" : "s"}`} ok
          sub={`${upcomingCount} upcoming in total`} />
      </section>

      {/* Setup checklist — numbered steps, one clear next action */}
      {showSetup && (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold text-text">Get your AI receptionist live</h2>
              <p className="text-xs text-muted">{doneCount} of {steps.length} steps done · about 10 minutes in total</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-40 overflow-hidden rounded-full bg-canvas">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-semibold text-brand-dark">{pct}%</span>
            </div>
          </div>
          <ol className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
            {steps.map((s, i) => {
              const next = !s.done && steps.slice(0, i).every((x) => x.done);
              return (
                <li key={s.label} className="sm:border-b sm:border-line sm:[&:nth-child(odd)]:border-r">
                  <Link href={s.href} className={`flex items-center gap-3 px-5 py-4 transition hover:bg-canvas/70 ${next ? "bg-brand-tint/40" : ""}`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.done ? "bg-emerald-500 text-white" : next ? "bg-brand text-white" : "border border-line text-muted"}`}>
                      {s.done ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${s.done ? "text-muted line-through" : "font-medium text-text"}`}>{s.label}</span>
                      {next && <span className="block text-xs font-medium text-brand-dark">Next step</span>}
                    </span>
                    <svg className="shrink-0 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Numbers */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Appointments today" value={todayCount} />
        <Stat label="This month" value={monthCount} />
        <Stat label="All-time bookings" value={totalCount} />
        <Stat label="Upcoming" value={upcomingCount} accent />
      </section>

      {/* WhatsApp booking link */}
      <BookingLink link={bookingLink} connected={waConnected} />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* Upcoming appointments */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-4 md:px-5">
          <h2 className="text-sm font-semibold text-text">Upcoming appointments</h2>
          <Link href="/calendar" className="text-xs font-semibold text-brand hover:text-brand-dark">View all</Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-medium text-text">No upcoming appointments yet</p>
            <p className="mt-1 text-sm text-muted">When a customer books on WhatsApp, it will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {upcoming.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-4 md:px-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                  {initials(b.customer_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text">{b.customer_name || "Unknown"}</p>
                  <p className="truncate text-xs text-muted">
                    {b.service || "—"}{multi ? ` · ${businessName(b.business_id)}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-medium text-text">{formatWhen(b.start_time, tz)}</p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-brand-tint px-2 py-0.5 text-xs font-semibold text-brand-dark">
                    {b.ref_no ? `BK-${b.ref_no}` : "Booked"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Latest WhatsApp chats */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-4 md:px-5">
          <h2 className="text-sm font-semibold text-text">Latest WhatsApp messages</h2>
          <Link href="/conversations" className="text-xs font-semibold text-brand hover:text-brand-dark">Open chats</Link>
        </div>
        {recentChats.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-medium text-text">No messages yet</p>
            <p className="mt-1 text-sm text-muted">{waConnected ? "Customer messages will show up here." : "Connect WhatsApp to start receiving messages."}</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {recentChats.map((c) => (
              <Link key={c.phone} href="/conversations" className="flex items-start gap-3 p-4 transition hover:bg-canvas/60 md:px-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[11px] font-bold text-[#128C7E]">WA</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">+{c.phone}</p>
                  <p className="truncate text-xs text-muted">{c.text}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted">{formatWhen(c.at, tz)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}

function StatusCard({ href, label, value, sub, ok }) {
  return (
    <Link href={href} className="card group flex flex-col gap-1 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-muted">{label}</span>
        <span className={`h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" : "bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.2)]"}`} />
      </div>
      <p className="truncate text-[15px] font-semibold text-text">{value}</p>
      <p className="truncate text-xs text-muted">{sub}</p>
    </Link>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="stat">
      <div className="text-[13px] font-medium text-muted">{label}</div>
      <div className={`mt-1.5 text-[26px] font-semibold leading-none tracking-tight ${accent ? "text-brand" : "text-text"}`}>{value}</div>
    </div>
  );
}

function Action({ href, title, desc, icon }) {
  return (
    <Link href={href} className="card group flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
        </span>
        <svg className="text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </div>
      <p className="font-semibold text-text">{title}</p>
      <p className="mt-1 text-xs text-muted">{desc}</p>
    </Link>
  );
}
