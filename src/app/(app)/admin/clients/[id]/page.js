import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { setBusinessStatus } from "../../actions";
import SubscriptionForm from "@/components/SubscriptionForm";
import { manageBusiness } from "@/lib/manage-actions";
import { fixWhatsappNumber } from "../../actions";
import { phoneDigits, formatPhone } from "@/lib/phone";

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

  const [{ data: bookings }, { data: plans }, { data: services }, { data: team }, { data: knowledge }, { data: msgs }, { count: msgCount }] = await Promise.all([
    supabase.from("bookings").select("id, ref_no, customer_name, customer_phone, service, start_time, source")
      .eq("business_id", id).order("start_time", { ascending: false }).limit(200),
    supabase.from("plans").select("name, price, interval").order("sort"),
    supabase.from("services").select("name, category, price, duration_min, active").eq("business_id", id).order("name"),
    supabase.from("team_members").select("name, role, active").eq("business_id", id),
    supabase.from("knowledge_items").select("type, title, content, active").eq("business_id", id),
    supabase.from("messages").select("customer_phone, role, content, created_at").eq("business_id", id).order("created_at", { ascending: false }).limit(12),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("business_id", id),
  ]);

  const suspended = b.status === "suspended";
  const now = new Date();
  const tz = b.timezone || "Asia/Dubai";
  const waConnected = !!(b.meta_phone_number_id && b.meta_access_token);
  const savedNumber = String(b.whatsapp_number || "");
  const cleanNumber = phoneDigits(savedNumber);
  const numberNeedsFix = !!savedNumber && savedNumber !== cleanNumber;
  const aiOn = ["active", "trialing"].includes(b.sub_status) && !suspended;

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
        <div className="flex flex-wrap items-center gap-2">
        {/* Opens the full customer dashboard for this business — every page and every change applies to them */}
        <form action={manageBusiness}>
          <input type="hidden" name="id" value={b.id} />
          <button className="btn-brand px-4 py-2.5 text-sm">Manage as customer</button>
        </form>
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
      </div>

      {/* Subscription */}
      <section className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-text">Subscription</h2>
        <SubscriptionForm businessId={b.id} plans={plans || []} current={{ plan: b.plan, sub_status: b.sub_status, renews_at: b.renews_at }} />
      </section>

      {/* Health: can this client's AI actually reply right now? */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Health ok={aiOn} label="AI replies" value={aiOn ? "On" : "Off"} sub={suspended ? "Account suspended" : aiOn ? `Plan ${b.plan || "—"} · ${b.sub_status}` : `Subscription: ${b.sub_status || "none"}`} />
        <Health ok={waConnected} label="WhatsApp (Meta)" value={waConnected ? "Connected" : savedNumber ? "Number only" : "Not connected"}
          sub={waConnected ? `Phone ID ${b.meta_phone_number_id}` : savedNumber ? "Number saved but no Meta token — AI can't send" : "Client must use Connect WhatsApp"} />
        <Health ok={!!b.calendar_id} label="Google Calendar" value={b.calendar_id ? "Linked" : "Not linked"} sub={b.calendar_id || "Bookings still save to the dashboard"} />
        <Health ok label="Activity" value={`${bookings?.length || 0} bookings`} sub={`${msgCount || 0} WhatsApp messages`} />
      </section>

      {/* Business profile */}
      <section className="card overflow-hidden">
        <div className="border-b border-line px-5 py-4"><h2 className="text-sm font-semibold text-text">Business profile</h2></div>
        <dl className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
          <Row label="Owner email" value={b.owner_email} />
          <Row label="WhatsApp number" value={
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{formatPhone(savedNumber) || "—"}</span>
              {numberNeedsFix && (
                <form action={fixWhatsappNumber}>
                  <input type="hidden" name="id" value={b.id} />
                  <button className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100" title={`Saved as "${savedNumber}"`}>Fix format → {cleanNumber}</button>
                </form>
              )}
            </span>
          } />
          <Row label="Location" value={b.location} />
          <Row label="Timezone" value={tz} />
          <Row label="Business hours" value={b.hours} />
          <Row label="AI working hours" value={b.ai_hours_enabled ? "On (custom schedule)" : "Off — replies 24/7"} />
          <Row label="Joined" value={when(b.created_at)} />
          <Row label="Renews / trial ends" value={b.renews_at ? when(b.renews_at) : "—"} />
        </dl>
      </section>

      {/* AI front desk */}
      <section className="card overflow-hidden">
        <div className="border-b border-line px-5 py-4"><h2 className="text-sm font-semibold text-text">AI front desk</h2></div>
        <dl className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
          <Row label="Assistant name" value={b.assistant_name} />
          <Row label="Language" value={b.primary_language} />
          <Row label="Tone" value={b.tone} />
          <Row label="Reply length" value={b.reply_length} />
          <Row label="First greeting" value={b.first_greeting} />
          <Row label="Handover rules" value={b.handover_rules} />
          <Row label="Booking rules" value={b.booking} />
          <Row label="FAQ" value={b.faq} />
        </dl>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Services */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><h2 className="text-sm font-semibold text-text">Services</h2><span className="text-xs text-muted">{services?.length || 0}</span></div>
          {(services?.length || 0) === 0
            ? <p className="px-5 py-6 text-sm text-muted">{b.services ? `Quick text: ${b.services}` : "No services added."}</p>
            : <ul className="divide-y divide-line">{services.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <span className={s.active === false ? "text-muted line-through" : "text-text"}>{s.name}{s.category ? <span className="text-muted"> · {s.category}</span> : null}</span>
                  <span className="shrink-0 text-xs text-muted">{s.price ?? "—"}{s.duration_min ? ` · ${s.duration_min} min` : ""}</span>
                </li>))}</ul>}
        </section>

        {/* Team + knowledge */}
        <section className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4"><h2 className="text-sm font-semibold text-text">Team & knowledge</h2></div>
          <div className="space-y-3 px-5 py-4 text-sm">
            <p><span className="font-medium text-text">Team: </span><span className="text-muted">{(team || []).map((t) => t.role ? `${t.name} (${t.role})` : t.name).join(", ") || "—"}</span></p>
            {(knowledge || []).length === 0
              ? <p className="text-muted">No knowledge items.</p>
              : (knowledge || []).map((k, i) => <p key={i}><span className="pill mr-1.5 bg-canvas text-muted">{k.type}</span><span className="text-text">{k.title ? `${k.title}: ` : ""}</span><span className="text-muted">{k.content}</span></p>)}
          </div>
        </section>
      </div>

      {/* Latest chats */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4"><h2 className="text-sm font-semibold text-text">Latest WhatsApp messages</h2><span className="text-xs text-muted">{msgCount || 0} total</span></div>
        {(msgs?.length || 0) === 0 ? <p className="px-5 py-8 text-center text-sm text-muted">No messages yet.</p> : (
          <ul className="divide-y divide-line">{msgs.map((m, i) => (
            <li key={i} className="flex gap-3 px-5 py-2.5 text-sm">
              <span className={`pill h-fit shrink-0 ${m.role === "user" ? "bg-canvas text-muted" : "bg-brand-tint text-brand-dark"}`}>{m.role === "user" ? formatPhone(m.customer_phone) : "AI"}</span>
              <span className="min-w-0 flex-1 text-text">{m.content}</span>
              <span className="shrink-0 text-[11px] text-muted">{when(m.created_at)}</span>
            </li>))}</ul>)}
      </section>

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

function Health({ ok, label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between"><span className="text-xs font-medium text-muted">{label}</span><span className={`h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-400"}`} /></div>
      <p className="mt-1 text-[15px] font-semibold text-text">{value}</p>
      <p className="truncate text-xs text-muted" title={typeof sub === "string" ? sub : undefined}>{sub}</p>
    </div>
  );
}
function Row({ label, value }) {
  return (
    <div className="flex gap-3 px-5 py-3 text-sm sm:border-b sm:border-line sm:[&:nth-child(odd)]:border-r">
      <dt className="w-36 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 whitespace-pre-wrap break-words text-text">{value || "—"}</dd>
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
