"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendReply } from "@/lib/conversation-actions";

function initials(s) {
  if (!s) return "•";
  const parts = s.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function timeShort(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

const DAY_MS = 24 * 60 * 60 * 1000;

function ReplyBox({ conv, onSent }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const lastCustomer = [...conv.messages].reverse().find((m) => m.role === "user");
  const open = lastCustomer && Date.now() - new Date(lastCustomer.created_at).getTime() < DAY_MS;

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true); setErr("");
    const r = await sendReply({ phone: conv.phone, text });
    setBusy(false);
    if (!r?.ok) { setErr(r?.error || "Couldn't send."); return; }
    onSent(text.trim());
    setText("");
    router.refresh();
  }

  if (!open) {
    return (
      <div className="border-t border-line px-4 py-3 text-xs text-muted">
        WhatsApp only allows replies within 24 hours of the customer's last message. When they message again, you can reply here.
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
          placeholder="Reply on WhatsApp as your business…"
          className="field max-h-32 flex-1 resize-y"
        />
        <button disabled={busy || !text.trim()} className="btn-brand shrink-0">{busy ? "Sending…" : "Send"}</button>
      </div>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </form>
  );
}

export default function ConversationsView({ conversations, showBusiness }) {
  const [sent, setSent] = useState({}); // key -> messages sent from here, shown until the refresh arrives
  const [activeKey, setActiveKey] = useState(conversations[0]?.key || null);
  const active = conversations.find((c) => c.key === activeKey);

  if (conversations.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-sm font-medium text-text">No conversations yet</p>
        <p className="mt-1 text-sm text-muted">When customers message on WhatsApp, their chats appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      {/* List */}
      <div className={`card overflow-hidden ${active ? "hidden md:block" : ""}`}>
        <div className="border-b border-line px-4 py-3">
          <p className="text-sm font-semibold text-text">Chats</p>
        </div>
        <div className="max-h-[70vh] divide-y divide-line overflow-y-auto">
          {conversations.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveKey(c.key)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-canvas ${
                c.key === activeKey ? "bg-canvas" : ""
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                {initials(c.name || c.phone)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{c.name || c.phone}</p>
                <p className="truncate text-xs text-muted">{c.preview}</p>
                {showBusiness && <p className="truncate text-[11px] text-muted/70">{c.businessName}</p>}
              </div>
              <span className="shrink-0 text-[11px] text-muted">{timeShort(c.lastAt)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className={`card flex flex-col overflow-hidden ${active ? "" : "hidden md:flex"}`}>
        {active ? (
          <>
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <button onClick={() => setActiveKey(null)} className="text-muted hover:text-text md:hidden">←</button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                {initials(active.name || active.phone)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{active.name || active.phone}</p>
                <p className="truncate text-xs text-muted">{active.phone}{showBusiness ? ` · ${active.businessName}` : ""}</p>
              </div>
            </div>
            <div className="flex max-h-[64vh] flex-col gap-3 overflow-y-auto bg-canvas/40 px-4 py-5">
              {[...active.messages, ...(sent[active.key] || []).filter((s) => !active.messages.some((m) => m.role === "assistant" && m.content === s.content && new Date(m.created_at) >= new Date(s.created_at) - 60000))].map((m, i) => {
                const fromCustomer = m.role === "user";
                return (
                  <div key={i} className={`flex ${fromCustomer ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                      fromCustomer ? "rounded-tl-sm bg-surface text-text shadow-sm" : "rounded-tr-sm bg-brand text-white"
                    }`}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <p className={`mt-1 text-[10px] ${fromCustomer ? "text-muted" : "text-white/70"}`}>{timeShort(m.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <ReplyBox
              key={active.key}
              conv={active}
              onSent={(content) => setSent((s) => ({ ...s, [active.key]: [...(s[active.key] || []), { role: "assistant", content, created_at: new Date().toISOString() }] }))}
            />
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-12 text-sm text-muted">Select a chat to read it.</div>
        )}
      </div>
    </div>
  );
}
