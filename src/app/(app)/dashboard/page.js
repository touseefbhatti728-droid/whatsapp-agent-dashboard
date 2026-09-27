import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BookingLink from "@/components/BookingLink";

function formatWhen(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}
function initials(name) {
  if (!name) return "•";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

export default async function DashboardPage() {
  const supabase = await createClient();
  await supabase.auth.getUser();

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, location, whatsapp_number")
    .order("created_at", { ascending: true });

  const businessIds = (businesses || []).map((b) => b.id);

  let bookings = [];
  if (businessIds.length > 0) {
    const { data } = await supabase
      .from("bookings")
      .select("id, ref_no, customer_name, customer_phone, service, start_time, business_id")
      .in("business_id", businessIds)
      .order("start_time", { ascending: true });
    bookings = data || [];
  }

  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(startToday); endToday.setDate(endToday.getDate() + 1);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const inRange = (b, a, z) => { const t = new Date(b.start_time); return t >= a && t < z; };
  const todayCount = bookings.filter((b) => inRange(b, startToday, endToday)).length;
  const monthCount = bookings.filter((b) => inRange(b, startMonth, endMonth)).length;
  const upcomingAll = bookings.filter((b) => new Date(b.start_time) >= now);
  const upcoming = upcomingAll.slice(0, 6);

  const multi = businessIds.length > 1;
  const primary = (businesses || [])[0];
  const businessTitle = primary?.name || "your business";
  const businessName = (id) => (businesses || []).find((b) => b.id === id)?.name || "—";

  const waConnected = !!primary?.whatsapp_number;
  const waDigits = (primary?.whatsapp_number || "").replace(/\D/g, "");
  const bookingLink = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent("Hi, I'd like to book an appointment")}` : "";
  const hasBookings = bookings.length > 0;
  const showSetup = !waConnected || !hasBookings;
  const steps = [
    { label: "Add your services", href: "/services", done: false },
    { label: "Set up your AI front desk", href: "/ai-front-desk", done: false },
    { label: "Connect your WhatsApp number", href: "/integrations", done: waConnected },
    { label: "Get your first booking on WhatsApp", href: "/conversations", done: hasBookings },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Today at {businessTitle}</h1>
          <p className="page-sub">Everything you need for a calm working day.</p>
        </div>
        <Link href="/calendar" className="btn-brand inline-flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          New appointment
        </Link>
      </div>

      {/* WhatsApp booking link */}
      <BookingLink link={bookingLink} connected={waConnected} />

      {/* Setup — dark banner + progress + light step cards */}
      {showSetup && (
        <section className="overflow-hidden rounded-[20px] bg-ink text-white shadow-[0_24px_48px_-28px_rgba(17,24,39,0.5)]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="7" width="16" height="12" rx="3" /><path d="M12 3v4M9 13h.01M15 13h.01" /></svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold">Launch your AI receptionist</h2>
                <p className="text-xs text-white/50">{doneCount} of {steps.length} steps complete</p>
              </div>
            </div>
            <Link href="/ai-front-desk" className="btn-brand">Continue setup</Link>
          </div>
          <div className="px-5 pb-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="grid gap-3 bg-surface p-5 sm:grid-cols-2">
            {steps.map((s) => (
              <Link key={s.label} href={s.href} className="flex items-center gap-3 rounded-xl border border-line bg-canvas/40 p-3.5 transition hover:border-brand/40 hover:bg-brand-tint/40">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${s.done ? "border-brand bg-brand text-white" : "border-line text-muted"}`}>
                  {s.done
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </span>
                <span className={`text-sm ${s.done ? "text-muted line-through" : "font-medium text-text"}`}>{s.label}</span>
                <svg className="ml-auto text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Stat tiles */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Appointments today" value={todayCount} />
        <Stat label="This month" value={monthCount} />
        <Stat label="Total bookings" value={bookings.length} />
        <Stat label="Upcoming" value={upcomingAll.length} accent />
      </section>

      {/* Control panel */}
      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-text">Control panel</h2>
          <p className="text-xs text-muted">Your main actions in one place.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Action href="/calendar" title="New appointment" desc="Add a client, service and time."
            icon={<><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M8 2v4M16 2v4M3 10h18" /></>} />
          <Action href="/ai-front-desk" title="AI front desk" desc="Set your assistant, hours and handover."
            icon={<><rect x="4" y="7" width="16" height="12" rx="3" /><path d="M12 3v4M9 13h.01M15 13h.01" /></>} />
          <Action href="/services" title="Services" desc="Add your services and prices."
            icon={<><path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><path d="M7 7h.01" /></>} />
          <Action href="/conversations" title="Conversations" desc="Read every WhatsApp chat."
            icon={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />} />
        </div>
      </section>

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
                  <p className="text-xs font-medium text-text">{formatWhen(b.start_time)}</p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-brand-tint px-2 py-0.5 text-xs font-semibold text-brand-dark">
                    {b.ref_no ? `BK-${b.ref_no}` : "Booked"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="stat p-4 md:p-6">
      <div className="text-[13px] font-medium text-muted">{label}</div>
      <div className={`mt-2 text-[24px] font-bold leading-none tracking-tight md:text-[30px] ${accent ? "text-brand" : "text-text"}`}>{value}</div>
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
