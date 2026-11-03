import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";

export default async function InsightsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // owners: their business · admins: the customer they are managing
  const activeBizId = (await getActiveBusiness(user?.id))?.id ?? "00000000-0000-0000-0000-000000000000"; // no business -> matches nothing

  const { data: businesses } = await supabase.from("businesses").select("id, timezone").eq("id", activeBizId);
  const ids = (businesses || []).map((b) => b.id);

  let bookings = [];
  if (ids.length) {
    const { data } = await supabase
      .from("bookings")
      .select("customer_phone, service, start_time, business_id, source, created_at")
      .in("business_id", ids);
    bookings = data || [];
  }
  const impact = ids.length ? await aiImpact(supabase, ids[0], businesses[0]?.timezone || "Asia/Dubai", bookings) : null;

  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthCount = bookings.filter((b) => new Date(b.start_time) >= startMonth).length;
  const upcoming = bookings.filter((b) => new Date(b.start_time) >= now).length;
  const uniqueClients = new Set(bookings.map((b) => (b.customer_phone || "").trim()).filter(Boolean)).size;

  // Bookings by month — last 6 months
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleDateString(undefined, { month: "short" }), y: d.getFullYear(), m: d.getMonth(), count: 0 });
  }
  for (const b of bookings) {
    const d = new Date(b.start_time);
    const hit = months.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
    if (hit) hit.count += 1;
  }
  const monthMax = Math.max(1, ...months.map((x) => x.count));

  // Top services
  const svc = new Map();
  for (const b of bookings) {
    const s = (b.service || "Other").trim() || "Other";
    svc.set(s, (svc.get(s) || 0) + 1);
  }
  const topServices = [...svc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const svcMax = Math.max(1, ...topServices.map((x) => x[1]));

  // Busiest weekdays
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byDay = days.map((label) => ({ label, count: 0 }));
  for (const b of bookings) byDay[new Date(b.start_time).getDay()].count += 1;
  const dayMax = Math.max(1, ...byDay.map((x) => x.count));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Insights</h1>
        <p className="page-sub">How your AI receptionist is performing.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Total bookings" value={bookings.length} />
        <Stat label="This month" value={monthCount} />
        <Stat label="Unique clients" value={uniqueClients} />
        <Stat label="Upcoming" value={upcoming} accent />
      </section>

      {impact && <ImpactCard impact={impact} />}

      {bookings.length === 0 ? (
        <div className="card px-5 py-16 text-center">
          <p className="text-sm font-medium text-text">No data yet</p>
          <p className="mt-1 text-sm text-muted">Insights will appear once your AI starts booking customers.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Bookings by month */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-text">Bookings — last 6 months</h2>
            <div className="mt-6 flex h-40 items-end gap-3">
              {months.map((m, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div className="w-full rounded-t-lg bg-brand/85" style={{ height: `${(m.count / monthMax) * 100}%`, minHeight: m.count ? 6 : 2 }} title={`${m.count}`} />
                  </div>
                  <span className="text-[11px] font-medium text-muted">{m.label}</span>
                  <span className="-mt-1 text-[11px] font-semibold text-text">{m.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Busiest days */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-text">Busiest days</h2>
            <div className="mt-6 flex h-40 items-end gap-2">
              {byDay.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div className="w-full rounded-t-lg bg-ink/80" style={{ height: `${(d.count / dayMax) * 100}%`, minHeight: d.count ? 6 : 2 }} />
                  </div>
                  <span className="text-[11px] font-medium text-muted">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top services */}
          <div className="card p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-text">Top services</h2>
            <div className="mt-5 space-y-3">
              {topServices.map(([name, count], i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-sm text-text">{name}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-canvas">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(count / svcMax) * 100}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-semibold text-text">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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

// "What your AI did for you" — last 30 days, from chats + bookings the AI made.
async function aiImpact(supabase, bizId, tz, bookings) {
  const since = new Date(Date.now() - 30 * 86400000);
  const [{ count: replies }, { data: inbound }, { data: services }] = await Promise.all([
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("business_id", bizId).eq("role", "assistant").gte("created_at", since.toISOString()),
    supabase.from("messages").select("customer_phone, created_at").eq("business_id", bizId).eq("role", "user").gte("created_at", since.toISOString()).limit(5000),
    supabase.from("services").select("name, price").eq("business_id", bizId),
  ]);
  const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false });
  const chats = new Set();
  const lateChats = new Set();
  for (const m of inbound || []) {
    const phone = m.customer_phone || "";
    const day = String(m.created_at).slice(0, 10);
    chats.add(phone + day);
    const h = Number(hourFmt.format(new Date(m.created_at))) % 24;
    if (h < 9 || h >= 21) lateChats.add(phone + day);
  }
  const priceOf = new Map((services || []).map((s) => [String(s.name || "").trim().toLowerCase(), Number(String(s.price ?? "").replace(/[^\d.]/g, "")) || 0]));
  const aiBookings = bookings.filter((b) => (b.source || "whatsapp") === "whatsapp" && new Date(b.created_at || b.start_time) >= since);
  const value = aiBookings.reduce((sum, b) => sum + (priceOf.get(String(b.service || "").trim().toLowerCase()) || 0), 0);
  return {
    replies: replies || 0,
    chats: chats.size,
    lateChats: lateChats.size,
    bookings: aiBookings.length,
    value,
    currency: tz === "Asia/Karachi" ? "PKR" : "AED",
    hoursSaved: Math.round(((replies || 0) * 1.5) / 60),
  };
}

function ImpactCard({ impact }) {
  const money = impact.value ? `${impact.currency} ${Math.round(impact.value).toLocaleString("en-US")}` : "—";
  return (
    <section className="card p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-text">What your AI did for you</h2>
        <span className="text-xs text-muted">Last 30 days</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Mini label="Customer chats handled" value={impact.chats} />
        <Mini label="Replies sent" value={impact.replies} />
        <Mini label="Chats before 9am / after 9pm" value={impact.lateChats} hint="when you'd usually be closed" />
        <Mini label="Bookings made by AI" value={impact.bookings} accent />
        <Mini label="Value of AI bookings" value={money} hint={impact.value ? "from your service prices" : "add prices in Services"} accent />
      </div>
      <p className="mt-5 text-sm text-muted">
        That's about <span className="font-semibold text-text">{impact.hoursSaved} hours</span> of typing you didn't have to do.
      </p>
    </section>
  );
}

function Mini({ label, value, hint, accent }) {
  return (
    <div>
      <div className={`text-[22px] font-bold leading-none tracking-tight ${accent ? "text-brand" : "text-text"}`}>{value}</div>
      <div className="mt-1.5 text-[12px] font-medium text-muted">{label}</div>
      {hint && <div className="text-[11px] text-muted/80">{hint}</div>}
    </div>
  );
}
