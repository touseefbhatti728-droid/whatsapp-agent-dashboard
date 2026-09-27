"use client";
import { useState } from "react";

export default function BookingLink({ link, connected }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <section className="card p-4 md:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-text">Your WhatsApp booking link</h2>
          <p className="mt-0.5 text-xs text-muted">Share it on Google Maps, Instagram, your website or anywhere. Customers tap to chat and book on WhatsApp.</p>

          {connected ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input readOnly value={link} onFocus={(e) => e.target.select()} className="field flex-1 font-mono text-[12.5px]" />
              <div className="flex gap-2">
                <button onClick={copy} className="btn-ghost whitespace-nowrap">{copied ? "Copied!" : "Copy link"}</button>
                <a href={link} target="_blank" rel="noreferrer" className="btn-brand whitespace-nowrap">Open</a>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-line bg-canvas/50 px-3.5 py-3 text-sm text-muted">
              Connect your WhatsApp number to get your booking link.{" "}
              <a href="/integrations" className="font-semibold text-brand hover:text-brand-dark">Connect WhatsApp</a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
