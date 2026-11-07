import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { manageBusiness } from "@/lib/manage-actions";
import { formatPhone, channelOf, CHANNELS, senderOf } from "@/lib/phone";

export const dynamic = "force-dynamic";

function ago(ts) {
  const m = Math.round((Date.now() - new Date(ts)) / 60000);
  if (m < 60) return `${Math.max(1, m)}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}

// Every customer's chats in one list: who is waiting, where the AI is paused, and a jump into the chat.
export default async function AllConversations({ searchParams }) {
  const sp = (await searchParams) || {};
  const ch = ["whatsapp", "web", "messenger", "instagram"].includes(sp.ch) ? sp.ch : "all";
  const supabase = await createClient();
  const [{ data: msgs }, { data: biz }, { data: pauses }] = await Promise.all([
    supabase.from("messages").select("business_id, customer_phone, role, content, created_at")
      .gte("created_at", new Date(Date.now() - 14 * 864e5).toISOString()).order("created_at", { ascending: false }).limit(3000),
    supabase.from("businesses").select("id, name"),
    supabase.from("ai_pauses").select("business_id, customer_phone").gt("until", new Date().toISOString()),
  ]);
  const nameOf = Object.fromEntries((biz || []).map((b) => [b.id, b.name || "—"]));
  const paused = new Set((pauses || []).map((p) => `${p.business_id}|${p.customer_phone}`));
  const seen = new Map();
  for (const m of msgs || []) {
    const k = `${m.business_id}|${m.customer_phone}`;
    if (!seen.has(k)) seen.set(k, { ...m, key: k, count: 0 });
    seen.get(k).count++;
  }
  let chats = [...seen.values()].map((c) => ({ ...c, channel: channelOf(c.customer_phone), who: senderOf(c), paused: paused.has(c.key) }));
  const counts = { all: chats.length };
  chats.forEach((c) => { counts[c.channel] = (counts[c.channel] || 0) + 1; });
  if (ch !== "all") chats = chats.filter((c) => c.channel === ch);
  const waiting = chats.filter((c) => c.who === "customer").length;

  return (
    <div className="space-y-6">
      <div className="admin-hero rounded-3xl p-6 md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">All conversations</p>
        <h1 className="mt-1 text-[28px] font-bold tracking-tight">Every chat, every customer</h1>
        <p className="mt-1 text-sm text-white/80">{chats.length} chats in the last 14 days · {waiting} waiting for a reply</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {["all", "whatsapp", "web", "messenger", "instagram"].map((k) => (
          <Link key={k} href={k === "all" ? "/admin/conversations" : `/admin/conversations?ch=${k}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${ch === k ? "bg-brand text-white" : "bg-surface text-muted hover:text-text"}`}>
            {k === "all" ? "All" : CHANNELS[k].label} <span className="opacity-60">{counts[k] || 0}</span>
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        {chats.length === 0 ? <p className="px-5 py-14 text-center text-sm text-muted">No chats in the last 14 days.</p> : (
          <ul className="divide-y divide-line">
            {chats.slice(0, 200).map((c) => (
              <li key={c.key} className="flex items-center gap-3 px-5 py-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${CHANNELS[c.channel].cls}`}>{CHANNELS[c.channel].short}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-text">{formatPhone(c.customer_phone)}</p>
                    <span className="truncate text-xs text-muted">→ {nameOf[c.business_id]}</span>
                    {c.who === "customer" && <span className="shrink-0 rounded-full bg-brand-tint px-1.5 py-px text-[10px] font-semibold text-brand-dark">Waiting</span>}
                    {c.paused && <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-px text-[10px] font-semibold text-amber-700">AI paused</span>}
                  </div>
                  <p className="truncate text-xs text-muted">{c.who === "ai" ? "AI: " : c.who === "staff" ? "Staff: " : ""}{c.content}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted">{ago(c.created_at)} · {c.count} msg</span>
                <form action={manageBusiness}>
                  <input type="hidden" name="id" value={c.business_id} />
                  <input type="hidden" name="next" value="/conversations" />
                  <button className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-muted transition hover:border-brand hover:text-brand">Open chat</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
