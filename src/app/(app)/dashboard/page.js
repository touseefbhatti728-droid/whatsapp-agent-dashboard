import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, getIsAdmin, getActiveBusiness } from "@/lib/session";
import ShareLinks from "@/components/ShareLinks";
import { formatPhone, channelOf, CHANNELS, senderOf, sourceLabel } from "@/lib/phone";

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

  // Everything the overview shows, in parallel, for this business only.
  const bizId = primary?.id || "00000000-0000-0000-0000-000000000000";
  const base = () => supabase.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", bizId);
  const [todayRes, monthRes, totalRes, upcomingRes, servicesRes, msgRes, leadsRes, pausesRes, namesRes] = await Promise.all([
    base().gte("start_time", startToday.toISOString()).lt("start_time", endToday.toISOString()),
    base().gte("start_time", startMonth.toISOString()).lt("start_time", endMonth.toISOString()),
    base(),
    supabase.from("bookings")
      .select("id, ref_no, customer_name, customer_phone, service, start_time, source")
      .eq("business_id", bizId).gte("start_time", now.toISOString())
      .order("start_time", { ascending: true }).limit(6),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", bizId),
    supabase.from("messages").select("customer_phone, role, content, created_at")
      .eq("business_id", bizId).gte("created_at", new Date(now.getTime() - 31 * 864e5).toISOString())
      .order("created_at", { ascending: false }).limit(1500),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("business_id", bizId).gte("created_at", startMonth.toISOString()),
    supabase.from("ai_pauses").select("customer_phone").eq("business_id", bizId).gt("until", now.toISOString()),
    supabase.from("bookings").select("customer_phone, customer_name").eq("business_id", bizId).not("customer_name", "is", null).limit(500),
  ]);

  // Conversations: the newest message per customer.
  const nameOf = {};
  (namesRes.data || []).forEach((b) => { if (b.customer_phone) nameOf[b.customer_phone] = b.customer_name; });
  const latest = new Map();
  for (const m of msgRes.data || []) if (!latest.has(m.customer_phone)) latest.set(m.customer_phone, m);
  const chats = [...latest.values()].map((m) => ({
    phone: m.customer_phone, text: m.content, at: m.created_at, who: senderOf(m), channel: channelOf(m.customer_phone),
    name: nameOf[m.customer_phone] || formatPhone(m.customer_phone),
  }));
  const pausedSet = new Set((pausesRes.data || []).map((p) => p.customer_phone));
  const waiting = chats.filter((c) => c.who === "customer" && now - new Date(c.at) < 864e5).length;
  const chatsThisMonth = new Set((msgRes.data || []).filter((m) => m.role === "user" && new Date(m.created_at) >= startMonth).map((m) => m.customer_phone)).size;
  const recentChats = chats.slice(0, 6);

  // Where the AI is actually live right now.
  const suspended = primary?.status === "suspended";
  const subOn = ["active", "trialing"].includes(primary?.sub_status);
  const waConnected = !!(primary?.meta_phone_number_id && primary?.meta_access_token);
  const channels = [
    { key: "whatsapp", on: waConnected, live: waConnected && subOn },
    { key: "web", on: !!primary?.widget_seen_at, live: !!primary?.widget_seen_at }, // website chat also runs on the free plan
    { key: "messenger", on: !!primary?.fb_page_id, live: !!primary?.fb_page_id && subOn },
    { key: "instagram", on: !!primary?.ig_account_id, live: !!primary?.ig_account_id && subOn },
    { key: "phone", on: !!primary?.vapi_assistant_id, live: !!primary?.vapi_assistant_id && primary?.sub_status === "active" },
  ];
  const live = suspended ? [] : channels.filter((c) => c.live);
  const connectedCount = channels.filter((c) => c.on).length;
  const aiValue = suspended ? "Paused" : live.length ? `Live on ${live.length} channel${live.length === 1 ? "" : "s"}` : "Not live yet";
  const aiSub = suspended ? "Account suspended — contact NextReply"
    : live.length ? live.map((c) => CHANNELS[c.key].label).join(" · ")
    : channels.some((c) => c.on) && !subOn ? "Start a plan or trial to switch it on"
    : "Connect a channel to go live";
  const aiHref = live.length ? "/conversations" : channels.some((c) => c.on) && !subOn ? "/billing" : "/integrations";

  const planLabel = subOn && primary?.plan ? `${primary.plan}${primary.sub_status === "trialing" ? " · trial" : ""}` : "Free plan";
  const trialEnds = primary?.sub_status === "trialing" && primary?.renews_at
    ? new Date(primary.renews_at).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: tz }) : null;
  const todayCount = todayRes.count || 0;
  const monthCount = monthRes.count || 0;
  const totalCount = totalRes.count || 0;
  const upcoming = upcomingRes.data || [];
  const businessTitle = primary?.name || "your business";

  const waDigits = (primary?.whatsapp_number || "").replace(/\D/g, "");
  const whatsappLink = waConnected && waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent("Hi, I'd like to book an appointment")}` : "";
  const bookingPage = primary?.id ? `https://app.nextreply.io/book/${primary.id}` : "";

  const hasServices = (servicesRes.count || 0) > 0;
  const frontDeskDone = !!(primary?.assistant_name || primary?.tone || primary?.first_greeting);
  const steps = [
    { label: "Add your services", sub: "So the AI knows what you offer and for how long", href: "/services", done: hasServices },
    { label: "Set up your AI front desk", sub: "Name, tone, greeting and rules", href: "/ai-front-desk", done: frontDeskDone },
    { label: "Connect a channel", sub: "WhatsApp, your website, Facebook or Instagram", href: "/integrations", done: connectedCount > 0 },
    { label: "Get your first booking", sub: "Share your booking links below", href: "#links", done: totalCount > 0 },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const showSetup = doneCount < steps.length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="space-y-6">
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

      {/* Status — what is live, what needs you */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard href={aiHref} label="AI receptionist" value={aiValue} ok={live.length > 0} sub={aiSub} />
        <Link href="/integrations" className="card flex flex-col gap-1 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-muted">Channels</span>
            <span className="text-[11px] font-semibold text-brand">Manage →</span>
          </div>
          <p className="text-[15px] font-semibold text-text">{connectedCount} of {channels.length} connected</p>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {channels.map((c) => (
              <span key={c.key} className={`inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-semibold ${c.on ? CHANNELS[c.key].cls : "bg-canvas text-muted/70"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${c.on ? CHANNELS[c.key].dot : "bg-line"}`} />{CHANNELS[c.key].short}
              </span>
            ))}
          </div>
        </Link>
        <StatusCard href="/conversations" label="Needs you" ok={waiting === 0}
          value={waiting ? `${waiting} chat${waiting === 1 ? "" : "s"} waiting` : "All caught up"}
          sub={pausedSet.size ? `${pausedSet.size} chat${pausedSet.size === 1 ? "" : "s"} with the AI paused` : "The AI is handling every chat"} />
        <StatusCard href="/billing" label="Plan" value={planLabel} ok={subOn}
          sub={trialEnds ? `First payment on ${trialEnds}`
            : primary?.sub_status === "trialing" ? (primary?.stripe_customer_id ? "Free trial" : "Free access from NextReply")
            : primary?.sub_status === "active" ? "Active subscription"
            : "Website chat · 50 chats a month"} />
      </section>

      {/* Setup checklist — until everything is done */}
      {showSetup && (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold text-text">Get your AI receptionist live</h2>
              <p className="text-xs text-muted">{doneCount} of {steps.length} done · about 10 minutes</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-40 overflow-hidden rounded-full bg-canvas">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-semibold text-brand-dark">{pct}%</span>
            </div>
          </div>
          <ol className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
            {steps.map((s, i) => {
              const next = !s.done && steps.findIndex((x) => !x.done) === i;
              return (
                <li key={s.label} className="sm:border-line lg:border-r lg:last:border-r-0">
                  <Link href={s.href} className={`flex h-full items-start gap-3 px-5 py-4 transition hover:bg-canvas/70 ${next ? "bg-brand-tint/40" : ""}`}>
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.done ? "bg-emerald-500 text-white" : next ? "bg-brand text-white" : "border border-line text-muted"}`}>
                      {s.done ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${s.done ? "text-muted line-through" : "font-medium text-text"}`}>{s.label}</span>
                      <span className={`block text-xs ${next ? "font-medium text-brand-dark" : "text-muted"}`}>{s.done ? "Done" : s.sub}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Numbers — one row, no repeats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat href="/calendar" label="Appointments today" value={todayCount} />
        <Stat href="/calendar" label="Bookings this month" value={monthCount} />
        <Stat href="/conversations" label="Conversations this month" value={chatsThisMonth} />
        <Stat href="/leads" label="New leads this month" value={leadsRes.count || 0} accent />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* Upcoming appointments */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-4 md:px-5">
            <h2 className="text-sm font-semibold text-text">Upcoming appointments</h2>
            <Link href="/calendar" className="text-xs font-semibold text-brand hover:text-brand-dark">View all</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-sm font-medium text-text">No upcoming appointments yet</p>
              <p className="mt-1 text-sm text-muted">Bookings from chat, your booking page or a call appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {upcoming.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-4 md:px-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">{initials(b.customer_name)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text">{b.customer_name || "Unknown"}</p>
                    <p className="truncate text-xs text-muted">{b.service || "Appointment"} · {sourceLabel(b.source)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-text">{formatWhen(b.start_time, tz)}</p>
                    {b.ref_no && <span className="mt-1 inline-flex rounded-md bg-brand-tint px-2 py-0.5 text-xs font-semibold text-brand-dark">BK-{b.ref_no}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Latest conversations — every channel */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-4 md:px-5">
            <h2 className="text-sm font-semibold text-text">Latest conversations</h2>
            <Link href="/conversations" className="text-xs font-semibold text-brand hover:text-brand-dark">Open inbox</Link>
          </div>
          {recentChats.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-sm font-medium text-text">No conversations yet</p>
              <p className="mt-1 text-sm text-muted">{connectedCount ? "Customer chats will show up here." : "Connect a channel to start receiving messages."}</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {recentChats.map((c) => (
                <Link key={c.phone} href="/conversations" className="flex items-start gap-3 p-4 transition hover:bg-canvas/60 md:px-5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${CHANNELS[c.channel].cls}`}>{CHANNELS[c.channel].short}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-text">{c.name}</p>
                      {c.who === "customer" && now - new Date(c.at) < 864e5 && <span className="shrink-0 rounded-full bg-brand-tint px-1.5 py-px text-[10px] font-semibold text-brand-dark">Waiting</span>}
                      {pausedSet.has(c.phone) && <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-px text-[10px] font-semibold text-amber-700">AI paused</span>}
                    </div>
                    <p className="truncate text-xs text-muted">{c.who === "ai" ? "AI: " : c.who === "staff" ? "You: " : ""}{c.text}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted">{formatWhen(c.at, tz)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Booking links */}
      <div id="links" className="scroll-mt-6"><ShareLinks bookingPage={bookingPage} whatsappLink={whatsappLink} /></div>
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

function Stat({ label, value, accent, href }) {
  return (
    <Link href={href} className="stat block transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="text-[13px] font-medium text-muted">{label}</div>
      <div className={`mt-1.5 text-[26px] font-semibold leading-none tracking-tight ${accent ? "text-brand" : "text-text"}`}>{value}</div>
    </Link>
  );
}
