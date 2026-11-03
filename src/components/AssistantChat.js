"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const SUGGESTIONS = [
  "Give me today's platform report",
  "Which clients have WhatsApp not connected yet?",
  "Full details of Swastha Fit Pro",
  "What's my estimated monthly revenue?",
  "Latest WhatsApp Business coexistence rules from Meta",
  "Fix the WhatsApp number format for Swastha Fit Pro",
];

// Tiny, safe renderer for the assistant's answers: **bold**, `code`, "- " bullets and links.
function renderText(text) {
  const inline = (s, key) => {
    const parts = String(s).split(/(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s)]+)/g);
    return parts.map((p, i) => {
      if (/^\*\*[^*]+\*\*$/.test(p)) return <b key={`${key}-${i}`} className="font-semibold">{p.slice(2, -2)}</b>;
      if (/^`[^`]+`$/.test(p)) return <code key={`${key}-${i}`} className="rounded bg-canvas px-1 py-0.5 text-[12.5px]">{p.slice(1, -1)}</code>;
      if (/^https?:\/\//.test(p)) return <a key={`${key}-${i}`} href={p} target="_blank" rel="noreferrer" className="break-all text-brand underline">{p}</a>;
      return p;
    });
  };
  return String(text).split("\n").map((line, i) => {
    const t = line.replace(/^#{1,6}\s+/, "");
    if (/^\s*[-•*]\s+/.test(t)) return <div key={i} className="flex gap-2 pl-1"><span className="text-muted">•</span><span>{inline(t.replace(/^\s*[-•*]\s+/, ""), i)}</span></div>;
    if (!t.trim()) return <div key={i} className="h-2" />;
    return <div key={i} className={/^#{1,6}\s/.test(line) ? "font-semibold" : ""}>{inline(t, i)}</div>;
  });
}

const SendIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>
);
const SparkIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9z"/><path d="M19 14l.9 2.4 2.4.9-2.4.9L19 21l-.9-2.8-2.4-.9 2.4-.9z"/></svg>
);

export default function AssistantChat() {
  const router = useRouter();
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  function history() {
    const h = [];
    for (const m of msgs) {
      if (m.role === "user") h.push({ role: "user", content: m.text });
      else if (m.role === "assistant") h.push({ role: "assistant", content: m.text });
      else if (m.role === "proposal") {
        if (m.status === "confirmed") h.push({ role: "assistant", content: `Action completed: ${m.resultText || m.proposal.summary}` });
        else if (m.status === "cancelled") h.push({ role: "assistant", content: `Action cancelled: ${m.proposal.summary}` });
      }
    }
    return h;
  }

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ history: [...history(), { role: "user", content: q }] }),
      });
      const data = await res.json();
      if (data.type === "proposal") {
        setMsgs((m) => [...m, ...(data.text ? [{ role: "assistant", text: data.text }] : []), { role: "proposal", proposal: data.proposal, status: "pending" }]);
      } else {
        setMsgs((m) => [...m, { role: "assistant", text: data.text || "(no answer)" }]);
      }
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Something went wrong. Please try again." }]);
    } finally { setLoading(false); }
  }

  async function confirm(idx) {
    const item = msgs[idx];
    setLoading(true);
    try {
      const res = await fetch("/api/assistant/execute", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ proposal: item.proposal }),
      });
      const data = await res.json();
      setMsgs((m) => m.map((x, i) => i === idx ? { ...x, status: data.ok ? "confirmed" : "pending", resultText: data.text } : x));
      setMsgs((m) => [...m, { role: "assistant", text: data.text }]);
      router.refresh();
    } finally { setLoading(false); }
  }

  function cancel(idx) {
    setMsgs((m) => m.map((x, i) => i === idx ? { ...x, status: "cancelled" } : x));
  }

  return (
    <div className="card flex h-[74vh] flex-col overflow-hidden">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-7">
        {msgs.length === 0 && (
          <div className="mx-auto max-w-md pt-10 text-center">
            <div className="logo-mark mx-auto mb-4 flex h-14 w-14 items-center justify-center">{SparkIcon}</div>
            <p className="text-[15px] font-semibold text-text">Your command center</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
              I can see every client, booking and chat, search the web for the latest info, and make changes — suspend, edit settings, fix numbers, change plans, cancel bookings or message a customer. You confirm every change with one click.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] text-text transition hover:border-brand/40 hover:bg-brand-tint/40">{s}</button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => {
          if (m.role === "user")
            return <div key={i} className="flex justify-end"><div className="max-w-[78%] rounded-2xl rounded-tr-md bg-brand px-4 py-2.5 text-sm leading-relaxed text-white">{m.text}</div></div>;
          if (m.role === "assistant")
            return <div key={i} className="flex justify-start"><div className="max-w-[85%] space-y-0.5 rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-text">{renderText(m.text)}</div></div>;
          const p = m.proposal;
          return (
            <div key={i} className="flex justify-start">
              <div className="w-full max-w-[85%] rounded-2xl border border-brand/25 bg-brand-tint/30 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-dark">Confirm action</p>
                <p className="mt-1.5 text-sm font-medium text-text">{p.summary}</p>
                {p.clientName && <p className="mt-1 text-xs text-muted">Client: <b className="text-text">{p.clientName}</b></p>}
                {p.changes && <p className="mt-1 break-words text-xs text-muted">{Object.entries(p.changes).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ")}</p>}
                {m.status === "pending" ? (
                  <div className="mt-3.5 flex gap-2">
                    <button onClick={() => confirm(i)} disabled={loading} className="rounded-lg bg-brand px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60">Confirm</button>
                    <button onClick={() => cancel(i)} disabled={loading} className="rounded-lg border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-text transition hover:bg-canvas">Cancel</button>
                  </div>
                ) : (
                  <p className={`mt-2.5 text-xs font-semibold ${m.status === "confirmed" ? "text-brand-dark" : "text-muted"}`}>{m.status === "confirmed" ? "✓ Confirmed" : "Cancelled"}</p>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-line bg-canvas/40 p-3">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-1.5 pl-4 transition focus-within:border-brand" style={{ boxShadow: "0 0 0 0 transparent" }}>
          <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask anything, or tell me what to change… (Shift+Enter for a new line)" className="max-h-40 flex-1 resize-none bg-transparent py-2 text-sm text-text outline-none placeholder:text-muted/60" />
          <button onClick={() => send()} disabled={loading || !input.trim()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white transition hover:bg-brand-dark disabled:opacity-40">{SendIcon}</button>
        </div>
      </div>
    </div>
  );
}
