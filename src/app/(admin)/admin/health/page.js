import { createClient } from "@/lib/supabase/server";
import { BACKEND_URL } from "@/lib/backend";

export const dynamic = "force-dynamic";

function ago(ts) {
  if (!ts) return "never";
  const m = Math.round((Date.now() - new Date(ts)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} days ago`;
}

// System health: is every part of the platform up, configured and doing work?
export default async function HealthPage() {
  const supabase = await createClient();
  const t0 = Date.now();
  let backend = { ok: false, ms: 0, note: "" };
  try {
    const r = await fetch(`${BACKEND_URL}/`, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    backend = { ok: r.ok, ms: Date.now() - t0, note: `HTTP ${r.status}` };
  } catch (e) { backend = { ok: false, ms: Date.now() - t0, note: e.name === "TimeoutError" ? "No answer in 6 s" : e.message }; }

  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const dayAgo = new Date(Date.now() - 864e5).toISOString();
  const last = (q) => q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  const [lastMsg, lastAi, lastWeb, lastFb, lastBooking, { count: msgsHour }, { count: msgsDay }, { count: aiDay }, { count: pastDue }, { count: paused }] = await Promise.all([
    last(supabase.from("messages").select("created_at").eq("role", "user")),
    last(supabase.from("messages").select("created_at").eq("role", "assistant")),
    last(supabase.from("messages").select("created_at").like("customer_phone", "web:%")),
    last(supabase.from("messages").select("created_at").or("customer_phone.like.fb:%,customer_phone.like.ig:%")),
    last(supabase.from("bookings").select("created_at")),
    supabase.from("messages").select("id", { count: "exact", head: true }).gte("created_at", hourAgo),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("role", "user").gte("created_at", dayAgo),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("role", "assistant").gte("created_at", dayAgo),
    supabase.from("businesses").select("id", { count: "exact", head: true }).eq("sub_status", "past_due"),
    supabase.from("ai_pauses").select("business_id", { count: "exact", head: true }).gt("until", new Date().toISOString()),
  ]);

  const env = (k) => !!process.env[k];
  const config = [
    ["Database (Supabase service key)", env("SUPABASE_SERVICE_ROLE_KEY"), "Admin actions, deletes, owner replies"],
    ["Stripe secret key", env("STRIPE_SECRET_KEY"), "Checkout, subscriptions, cancelling"],
    ["Stripe webhook secret", env("STRIPE_WEBHOOK_SECRET"), "Plan changes reaching the app"],
    ["Stripe prices (Starter / Pro / Business)", env("STRIPE_PRICE_STARTER") && env("STRIPE_PRICE_PRO") && env("STRIPE_PRICE_BUSINESS"), "The three paid plans"],
    ["Meta app (WhatsApp sign-up)", env("NEXT_PUBLIC_FB_APP_ID") && env("FB_APP_SECRET"), "Customers connecting WhatsApp"],
    ["Meta login for Pages (Messenger / Instagram)", env("NEXT_PUBLIC_FB_PAGES_CONFIG_ID"), "Customers connecting Facebook & Instagram"],
    ["Vapi (phone receptionist)", env("VAPI_API_KEY"), "Phone numbers for paid customers"],
    ["Push notifications (VAPID)", env("NEXT_PUBLIC_VAPID_PUBLIC_KEY") && env("VAPID_PRIVATE_KEY"), "Owner alerts on their phone"],
    ["Claude API (dashboard AI)", env("ANTHROPIC_API_KEY"), "Ask AI and the admin assistant"],
  ];
  const aiRate = msgsDay ? Math.round(((aiDay || 0) / msgsDay) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="admin-hero rounded-3xl p-6 md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">System health</p>
        <h1 className="mt-1 text-[28px] font-bold tracking-tight">{backend.ok && config.every((c) => c[1]) ? "Everything is running" : "Some things need a look"}</h1>
        <p className="mt-1 text-sm text-white/80">Checked just now · refresh the page to check again</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile ok={backend.ok} label="AI server (Railway)" value={backend.ok ? `Up · ${backend.ms} ms` : "Down"} sub={backend.note} />
        <Tile ok={(msgsHour || 0) > 0} warn label="Messages in the last hour" value={msgsHour || 0} sub={`Last customer message ${ago(lastMsg.data?.created_at)}`} />
        <Tile ok={aiRate === null || aiRate >= 60} label="AI replies (24 h)" value={aiRate === null ? "—" : `${aiRate}%`} sub={`${aiDay || 0} replies to ${msgsDay || 0} customer messages`} />
        <Tile ok={!pastDue} label="Failed payments" value={pastDue || 0} sub={`${paused || 0} chats with the AI paused`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4"><h2 className="text-sm font-semibold text-text">Configuration</h2></div>
          <ul className="divide-y divide-line">
            {config.map(([label, ok, what]) => (
              <li key={label} className="flex items-center gap-3 px-5 py-3">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{ok ? "✓" : "!"}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-text">{label}</span><span className="block text-xs text-muted">{what}</span></span>
                <span className={`text-xs font-semibold ${ok ? "text-emerald-700" : "text-red-600"}`}>{ok ? "Set" : "Missing"}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4"><h2 className="text-sm font-semibold text-text">Last activity per channel</h2></div>
          <ul className="divide-y divide-line">
            {[
              ["Customer message (any channel)", lastMsg.data?.created_at],
              ["AI reply", lastAi.data?.created_at],
              ["Website chat", lastWeb.data?.created_at],
              ["Messenger / Instagram", lastFb.data?.created_at],
              ["Booking", lastBooking.data?.created_at],
            ].map(([label, ts]) => (
              <li key={label} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-text">{label}</span>
                <span className={`font-medium ${ts && Date.now() - new Date(ts) < 864e5 ? "text-emerald-700" : "text-muted"}`}>{ago(ts)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Tile({ ok, label, value, sub }) {
  return (
    <div className={`card p-5 ${ok ? "" : "ring-1 ring-red-200"}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" : "bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.15)]"}`} />
      </div>
      <p className="mt-2 text-[26px] font-bold tracking-tight text-text">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted">{sub}</p>
    </div>
  );
}
