"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sendReply, setAiPause } from "@/lib/conversation-actions";
import { formatPhone, channelOf, CHANNELS, senderOf } from "@/lib/phone";
import { toast } from "@/lib/toast";

const DAY_MS = 24 * 60 * 60 * 1000;

function initials(s) {
  if (!s) return "•";
  const parts = s.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function timeShort(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const today = new Date().toDateString() === d.toDateString();
  return today ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
function clock(ts) { return ts ? new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : ""; }
function dayLabel(ts) {
  const d = new Date(ts); const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === new Date(now.getTime() - DAY_MS).toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}
function untilLabel(ts) {
  const mins = Math.round((new Date(ts).getTime() - Date.now()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h`;
  return `${Math.round(mins / 1440)} days`;
}
// A saved message may be a call summary (phone) or a photo marker.
function msgChannel(conv, m) { return String(m.content || "").startsWith("📞") ? "phone" : conv.channel; }
function displayText(t) { return String(t || "").replace(/^\[photo\]\s*/, "📷 Photo  ").replace(/^\[(image|audio|video|document|sticker)\]$/, (_, k) => ({ image: "📷 Photo", audio: "🎤 Voice note", video: "🎬 Video", document: "📄 Document", sticker: "Sticker" }[k])); }
const WHO = { customer: "", ai: "AI", staff: "You" };

function ChannelBadge({ ch, small }) {
  const c = CHANNELS[ch] || CHANNELS.whatsapp;
  return <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${c.cls} ${small ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-[11px]"}`}><span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{small ? c.short : c.label}</span>;
}

function ReplyBox({ conv, onSent }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ch = conv.channel;
  const lastCustomer = [...conv.messages].reverse().find((m) => m.role === "user");
  // WhatsApp / Messenger / Instagram allow free replies only within 24 h; the website chat has no limit.
  const open = ch === "web" || (lastCustomer && Date.now() - new Date(lastCustomer.created_at).getTime() < DAY_MS);
  const where = { web: "in the website chat", messenger: "on Messenger", instagram: "on Instagram" }[ch] || "on WhatsApp";

  async function send(e) {
    e?.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true); setErr("");
    const r = await sendReply({ phone: conv.phone, text });
    setBusy(false);
    if (!r?.ok) { setErr(r?.error || "Couldn't send."); return; }
    onSent(text.trim());
    toast.success("Sent", "The AI is paused for this chat while you talk to the customer.");
    setText("");
    router.refresh();
  }

  if (!open) {
    return (
      <div className="border-t border-line bg-canvas/60 px-4 py-3 text-xs text-muted">
        {CHANNELS[ch]?.label || "WhatsApp"} only allows replies within 24 hours of the customer's last message. When they message again, you can reply here.
      </div>
    );
  }
  return (
    <form onSubmit={send} className="border-t border-line p-3">
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setErr(""); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
          rows={1}
          placeholder={`Reply ${where} as your business…`}
          className="field max-h-32 flex-1 resize-y"
        />
        <button disabled={busy || !text.trim()} className="btn-brand shrink-0">{busy ? "Sending…" : "Send"}</button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted">{err ? <span className="text-red-600">{err}</span> : "Enter to send · Shift+Enter for a new line · the AI pauses while you reply"}</p>
    </form>
  );
}

function AiControl({ conv }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const paused = conv.pause && new Date(conv.pause.until).getTime() > Date.now();
  async function set(minutes) {
    setBusy(true);
    const r = await setAiPause({ phone: conv.phone, minutes });
    setBusy(false);
    if (!r?.ok) { toast.error("Couldn't change", r?.error); return; }
    toast.success(minutes ? "AI paused" : "AI is back on", minutes ? "You handle this chat; the AI stays quiet." : "The AI will answer this customer's next message.");
    router.refresh();
  }
  if (conv.channel === "phone") return null;
  return paused ? (
    <div className="flex items-center gap-2">
      <span className="hidden rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 sm:inline">AI paused · {untilLabel(conv.pause.until)}</span>
      <button disabled={busy} onClick={() => set(0)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60">Resume AI</button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 sm:inline">AI on</span>
      <button disabled={busy} onClick={() => set(120)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-text hover:bg-canvas disabled:opacity-60">Take over</button>
    </div>
  );
}

export default function ConversationsView({ conversations: raw, showBusiness }) {
  const router = useRouter();
  const [sent, setSent] = useState({}); // key -> messages sent from here, shown until the refresh arrives
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [onlyWaiting, setOnlyWaiting] = useState(false);
  const [activeKey, setActiveKey] = useState(raw[0]?.key || null);
  const endRef = useRef(null);

  const conversations = useMemo(() => raw.map((c) => {
    const channel = channelOf(c.phone);
    const last = c.messages[c.messages.length - 1];
    return { ...c, channel, waiting: last?.role === "user", lastWho: last ? senderOf(last) : "customer" };
  }), [raw]);

  // New messages arrive on their own (LiveInbox in the layout reloads this page within seconds).

  const counts = useMemo(() => {
    const n = { all: conversations.length };
    conversations.forEach((c) => { n[c.channel] = (n[c.channel] || 0) + 1; });
    return n;
  }, [conversations]);

  const shown = conversations.filter((c) => {
    if (tab !== "all" && c.channel !== tab) return false;
    if (onlyWaiting && !c.waiting) return false;
    if (!q.trim()) return true;
    const s = q.trim().toLowerCase();
    return (c.name || "").toLowerCase().includes(s) || String(c.phone).includes(s) || formatPhone(c.phone).toLowerCase().includes(s)
      || c.messages.some((m) => String(m.content || "").toLowerCase().includes(s));
  });
  const active = conversations.find((c) => c.key === activeKey);
  const thread = active ? [...active.messages, ...(sent[active.key] || []).filter((s) => !active.messages.some((m) => m.role !== "user" && m.content === s.content && new Date(m.created_at) >= new Date(s.created_at) - 60000))] : [];

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [activeKey, thread.length]);

  if (conversations.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-sm font-medium text-text">No conversations yet</p>
        <p className="mt-1 text-sm text-muted">When customers message you on WhatsApp, your website, Messenger or Instagram, their chats appear here.</p>
      </div>
    );
  }

  const tabs = ["all", "whatsapp", "web", "messenger", "instagram"].filter((t) => t === "all" || counts[t]);
  const waitingCount = conversations.filter((c) => c.waiting).length;

  return (
    <div className="grid gap-4 md:grid-cols-[340px_1fr]">
      {/* Inbox */}
      <div className={`card flex flex-col overflow-hidden ${active ? "hidden md:flex" : ""}`}>
        <div className="space-y-2.5 border-b border-line p-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, number or message…" className="field w-full text-sm" />
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${tab === t ? "bg-ink text-white" : "bg-canvas text-muted hover:text-text"}`}>
                {t === "all" ? "All" : CHANNELS[t].label} <span className="opacity-60">{counts[t] || 0}</span>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={onlyWaiting} onChange={(e) => setOnlyWaiting(e.target.checked)} />
            Waiting for a reply only <span className="rounded-full bg-amber-50 px-1.5 text-[10px] font-semibold text-amber-700">{waitingCount}</span>
          </label>
        </div>
        <div className="max-h-[68vh] flex-1 divide-y divide-line overflow-y-auto">
          {shown.length === 0 && <p className="px-4 py-10 text-center text-xs text-muted">No chats match.</p>}
          {shown.map((c) => {
            const paused = c.pause && new Date(c.pause.until).getTime() > Date.now();
            return (
              <button key={c.key} onClick={() => setActiveKey(c.key)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-canvas ${c.key === activeKey ? "bg-canvas" : ""}`}>
                <div className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                  {initials(c.name || formatPhone(c.phone))}
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${CHANNELS[c.channel].dot}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`truncate text-sm ${c.waiting ? "font-semibold text-text" : "font-medium text-text"}`}>{c.name || formatPhone(c.phone)}</p>
                    <span className="ml-auto shrink-0 text-[11px] text-muted">{timeShort(c.lastAt)}</span>
                  </div>
                  <p className="truncate text-xs text-muted">
                    {WHO[c.lastWho] && <span className="font-semibold text-text/70">{WHO[c.lastWho]}: </span>}{displayText(c.preview)}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <ChannelBadge ch={c.channel} small />
                    {paused && <span className="rounded-full bg-amber-50 px-1.5 py-px text-[10px] font-semibold text-amber-700">AI paused</span>}
                    {c.waiting && <span className="rounded-full bg-brand-tint px-1.5 py-px text-[10px] font-semibold text-brand-dark">Waiting</span>}
                    {showBusiness && <span className="truncate text-[10px] text-muted/70">{c.businessName}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread */}
      <div className={`card flex flex-col overflow-hidden ${active ? "" : "hidden md:flex"}`}>
        {active ? (
          <>
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <button onClick={() => setActiveKey(null)} className="text-muted hover:text-text md:hidden">←</button>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                {initials(active.name || formatPhone(active.phone))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">{active.name || formatPhone(active.phone)}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <ChannelBadge ch={active.channel} small />
                  <span className="truncate">{active.channel === "whatsapp" ? formatPhone(active.phone) : `${active.messages.length} messages`}{showBusiness ? ` · ${active.businessName}` : ""}</span>
                </div>
              </div>
              <AiControl conv={active} />
            </div>
            <div className="flex max-h-[62vh] min-h-[320px] flex-col gap-2 overflow-y-auto bg-canvas/40 px-4 py-5">
              {thread.map((m, i) => {
                const who = senderOf(m);
                const prev = thread[i - 1];
                const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
                const ch = msgChannel(active, m);
                const fromCustomer = who === "customer";
                const bubble = fromCustomer ? "rounded-tl-sm bg-surface text-text shadow-sm"
                  : who === "staff" ? "rounded-tr-sm bg-ink text-white" : "rounded-tr-sm bg-brand text-white";
                return (
                  <div key={i}>
                    {newDay && <div className="my-2 text-center"><span className="rounded-full bg-surface px-3 py-1 text-[11px] font-medium text-muted shadow-sm">{dayLabel(m.created_at)}</span></div>}
                    <div className={`flex ${fromCustomer ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${bubble}`}>
                        {!fromCustomer && (
                          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                            {who === "staff" ? "You (staff)" : ch === "phone" ? "AI · phone call" : "AI receptionist"}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">{displayText(m.content)}</p>
                        <p className={`mt-1 flex items-center gap-1.5 text-[10px] ${fromCustomer ? "text-muted" : "text-white/70"}`}>
                          {clock(m.created_at)}{fromCustomer && ch !== active.channel ? ` · ${CHANNELS[ch].label}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <ReplyBox
              key={active.key}
              conv={active}
              onSent={(content) => setSent((s) => ({ ...s, [active.key]: [...(s[active.key] || []), { role: "staff", content, created_at: new Date().toISOString() }] }))}
            />
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-12 text-sm text-muted">Select a chat to read it.</div>
        )}
      </div>
    </div>
  );
}
