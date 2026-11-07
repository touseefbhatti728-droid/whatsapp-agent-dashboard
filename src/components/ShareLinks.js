"use client";
import { useState } from "react";

// The links a business shares so customers can book: the online booking page (always on)
// and a WhatsApp chat link (once WhatsApp is connected).
function LinkRow({ title, desc, link, missing }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }
  return (
    <div className="rounded-xl border border-line p-3.5">
      <p className="text-sm font-semibold text-text">{title}</p>
      <p className="mt-0.5 text-xs text-muted">{desc}</p>
      {link ? (
        <div className="mt-2.5 flex gap-2">
          <input readOnly value={link} onFocus={(e) => e.target.select()} className="field min-w-0 flex-1 font-mono text-[12px]" />
          <button onClick={copy} className="btn-ghost whitespace-nowrap px-3 text-xs">{copied ? "Copied!" : "Copy"}</button>
          <a href={link} target="_blank" rel="noreferrer" className="btn-brand whitespace-nowrap px-3 text-xs">Open</a>
        </div>
      ) : (
        <p className="mt-2.5 rounded-lg bg-canvas px-3 py-2 text-xs text-muted">{missing}</p>
      )}
    </div>
  );
}

export default function ShareLinks({ bookingPage, whatsappLink }) {
  return (
    <section className="card p-4 md:p-5">
      <h2 className="text-sm font-semibold text-text">Your booking links</h2>
      <p className="mt-0.5 text-xs text-muted">Put these in your Instagram bio, Google Maps profile, website and ads — customers tap and book.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <LinkRow title="Online booking page" desc="Customers pick a service and a free time and book in seconds — no chat needed." link={bookingPage} />
        <LinkRow title="WhatsApp chat link" desc="Opens WhatsApp with your number and a ready 'I'd like to book' message — your AI takes it from there."
          link={whatsappLink}
          missing={<>Available once WhatsApp is connected. <a href="/connect-whatsapp" className="font-semibold text-brand">Connect WhatsApp</a></>} />
      </div>
    </section>
  );
}
