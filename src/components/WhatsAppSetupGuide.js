"use client";

import { useState } from "react";

// Step-by-step guide shown under the Connect button so business owners can
// connect their WhatsApp Business app number (Coexistence) on their own.
const STEPS = [
  {
    title: "Update your WhatsApp Business app",
    body: "On your phone, open the App Store or Google Play and update WhatsApp Business to the latest version. Keep your phone nearby with the app open.",
  },
  {
    title: "Accept the Meta invite (only if we sent you one)",
    body: "During early access, Meta asks us to invite your Facebook account first. If you received an invite, open developers.facebook.com/requests on this computer, log in with the same Facebook account and tap Accept.",
    link: { href: "https://developers.facebook.com/requests", label: "Open Meta invites" },
  },
  {
    title: "Click “I use the WhatsApp Business app on this number”",
    body: "A Meta window opens. Log in with the Facebook account that manages your business (the same one that accepted the invite).",
  },
  {
    title: "Choose your business and enter your WhatsApp number",
    body: "Select your business portfolio (or create one with your business name), then type the number your customers message today. Confirm the code Meta sends to that number.",
  },
  {
    title: "Scan the QR code with your WhatsApp Business app",
    body: "A QR code appears on your screen. Open WhatsApp Business on your phone, follow the prompt to connect to the Business Platform, and scan the code. When asked, choose to share your chat history and contacts.",
  },
  {
    title: "Done — send a test message",
    body: "You'll see “WhatsApp connected ✅” here. Ask a friend to message your number “Hi”. Your AI receptionist replies within seconds, and you still see every chat in your WhatsApp Business app.",
  },
];

const FAQ = [
  ["Will I lose my WhatsApp Business app or chats?", "No. With this option your number keeps working in the app on your phone. Your contacts and recent chats are kept, and you can still reply yourself anytime."],
  ["The Meta window says “Feature unavailable” or asks for permission again", "Your Facebook account hasn't accepted our invite yet. Open the Meta invites link in step 2, accept it, then try again."],
  ["I don't see a QR code", "Update the WhatsApp Business app (step 1) and try again. The QR option only appears on recent versions."],
  ["Connected, but no AI reply", "Check that your plan or free trial is active on the Billing page and that your AI working hours (AI front desk) cover the current time."],
];

export default function WhatsAppSetupGuide() {
  const [open, setOpen] = useState(null);
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-surface p-6">
        <p className="text-base font-semibold text-text">How to connect (about 5 minutes)</p>
        <p className="mt-1 text-sm text-muted">Do this on a computer, with your phone and WhatsApp Business app next to you.</p>
        <ol className="mt-5 space-y-4">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
              <div className="min-w-0 pt-1">
                <p className="text-sm font-semibold text-text">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
                {s.link && (
                  <a href={s.link.href} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand hover:underline">
                    {s.link.label} ↗
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <p className="text-base font-semibold text-text">Having trouble?</p>
        <div className="mt-3 divide-y divide-line">
          {FAQ.map(([q, a], i) => (
            <div key={i} className="py-3">
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-text">
                {q}
                <span className="text-muted">{open === i ? "−" : "+"}</span>
              </button>
              {open === i && <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
