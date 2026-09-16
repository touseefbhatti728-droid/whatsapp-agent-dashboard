"use client";

import { useState } from "react";

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

export default function ConversationsView({ conversations, showBusiness }) {
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
              {active.messages.map((m, i) => {
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
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-12 text-sm text-muted">Select a chat to read it.</div>
        )}
      </div>
    </div>
  );
}
