"use client";

import { useRef, useState } from "react";

const EXAMPLES = ["How much is our most popular service?", "Who can do a facial on Saturday?", "What is our cancellation policy?", "Draft a polite reply to a customer asking for a discount"];

export default function AskAiChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  async function ask(text) {
    const q = String(text || input).trim();
    if (!q || busy) return;
    const next = [...messages, { role: "user", content: q }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) });
      const j = await r.json().catch(() => ({}));
      setMessages([...next, { role: "assistant", content: r.ok ? j.text : j.error || "Something went wrong." }]);
    } catch (_) {
      setMessages([...next, { role: "assistant", content: "Connection problem — please try again." }]);
    }
    setBusy(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <div className="card flex h-[65vh] flex-col overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto bg-canvas/40 p-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted">Try:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((e) => <button key={e} onClick={() => ask(e)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-text hover:bg-canvas">{e}</button>)}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "ml-auto bg-ink text-white" : "bg-surface text-text shadow-sm"}`}>{m.content}</div>
        ))}
        {busy && <p className="text-xs text-muted">Thinking…</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="flex gap-2 border-t border-line p-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about your business…" className="field flex-1" />
        <button disabled={busy} className="btn-brand px-4 text-sm disabled:opacity-60">Ask</button>
      </form>
    </div>
  );
}
