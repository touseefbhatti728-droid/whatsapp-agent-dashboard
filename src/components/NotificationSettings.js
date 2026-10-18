"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePush } from "@/lib/use-push";
import { toast } from "@/lib/toast";
import { saveNotifyPrefs, sendTestNotification, markAllNotificationsRead, markNotificationRead } from "@/lib/notification-actions";
import { NotifIcon, timeAgo } from "@/components/notif-meta";

const TYPES = [
  ["booking", "New bookings", "Every time the AI books an appointment for you."],
  ["handover", "Customer wants a person", "When a customer asks for a human or the AI hands a chat over."],
  ["limit", "Booking limit warnings", "At 80% of your monthly bookings, and when the limit is reached."],
  ["billing", "Billing & payments", "Trial started, payment received, payment failed, plan changes."],
  ["whatsapp", "WhatsApp connection", "When your WhatsApp number is connected."],
];

function Switch({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-brand" : "bg-black/15"} ${disabled ? "opacity-50" : ""}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function NotificationSettings({ hasBusiness, initialPrefs, initialItems }) {
  const router = useRouter();
  const { status, busy, enable, disable } = usePush();
  const [prefs, setPrefs] = useState(initialPrefs);
  const [items, setItems] = useState(initialItems);
  const [testing, setTesting] = useState(false);

  async function toggle(key, value) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const r = await saveNotifyPrefs(next);
    if (r && r.ok) toast.success("Preferences saved");
    else { setPrefs(prefs); toast.error("Could not save", r?.error); }
  }

  async function test() {
    setTesting(true);
    const r = await sendTestNotification();
    setTesting(false);
    if (r && r.ok) toast.success("Test alert sent", `Sent to ${r.pushed} of ${r.devices} device${r.devices === 1 ? "" : "s"}. Check your notifications.`);
    else toast.error("Test alert failed", r?.error);
    router.refresh();
  }

  async function readAll() {
    setItems((l) => l.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
    await markAllNotificationsRead();
    router.refresh();
  }

  function openItem(n) {
    if (!n.read_at) markNotificationRead(n.id).catch(() => {});
    if (n.url) router.push(n.url);
  }

  const deviceText = {
    loading: "Checking this device…",
    granted: "Alerts are ON for this device.",
    default: "Alerts are off for this device.",
    denied: "Alerts are blocked in this browser. Click the lock icon next to the address bar → Notifications → Allow, then reload.",
    "ios-install": "iPhone needs one extra step: tap Share → Add to Home Screen, then open NextReply from your home screen and turn on alerts.",
    unsupported: "This browser can't show alerts. Use Chrome, Edge, Firefox or Safari.",
  }[status];

  return (
    <div className="space-y-6">
      {/* This device */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-[15px] font-bold text-text">Alerts on this device</p>
            <p className="mt-1 text-sm text-muted">Get a pop-up on your phone or computer the moment something happens — even when NextReply is closed.</p>
            <p className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold ${status === "granted" ? "text-green-700" : "text-text"}`}>
              <span className={`h-2 w-2 rounded-full ${status === "granted" ? "bg-green-500" : status === "denied" ? "bg-red-500" : "bg-black/25"}`} />
              {deviceText}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {status === "default" && (
              <button
                onClick={async () => { const r = await enable(); r.ok ? toast.success("Alerts are on for this device") : toast.error("Could not turn on alerts", r.error); }}
                disabled={busy}
                className="btn-brand"
              >
                {busy ? "Turning on…" : "Turn on alerts"}
              </button>
            )}
            {status === "granted" && (
              <>
                <button onClick={test} disabled={testing || !hasBusiness} className="btn-brand">{testing ? "Sending…" : "Send test alert"}</button>
                <button
                  onClick={async () => { const r = await disable(); r.ok ? toast.info("Alerts turned off for this device") : toast.error("Could not turn off", r.error); }}
                  disabled={busy}
                  className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-text transition hover:bg-black/[0.03]"
                >
                  Turn off
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* What to alert about */}
      <div className="card p-6">
        <p className="text-[15px] font-bold text-text">What should we alert you about?</p>
        <p className="mt-1 text-sm text-muted">Applies to phone/computer pop-ups. Everything is always saved in your notification list.</p>
        <div className="mt-4 divide-y divide-black/[0.06]">
          {TYPES.map(([key, label, desc]) => (
            <div key={key} className="flex items-center gap-4 py-3.5">
              <NotifIcon type={key} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">{label}</p>
                <p className="text-[13px] text-muted">{desc}</p>
              </div>
              <Switch on={prefs[key] !== false} onChange={(v) => toggle(key, v)} disabled={!hasBusiness} />
            </div>
          ))}
        </div>
      </div>

      {/* Phone setup help */}
      <div className="card p-6">
        <p className="text-[15px] font-bold text-text">Get alerts on your phone</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-black/[0.025] p-4">
            <p className="text-sm font-semibold text-text">Android</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] text-muted">
              <li>Open app.nextreply.io in Chrome and log in.</li>
              <li>Open this page and tap <b className="text-text">Turn on alerts</b> → Allow.</li>
              <li>Optional: Chrome menu → <b className="text-text">Add to Home screen</b>.</li>
            </ol>
          </div>
          <div className="rounded-xl bg-black/[0.025] p-4">
            <p className="text-sm font-semibold text-text">iPhone (iOS 16.4 or newer)</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] text-muted">
              <li>Open app.nextreply.io in Safari and log in.</li>
              <li>Tap Share → <b className="text-text">Add to Home Screen</b>.</li>
              <li>Open NextReply from your home screen, come to this page and tap <b className="text-text">Turn on alerts</b>.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <p className="text-[15px] font-bold text-text">All notifications</p>
          {items.some((n) => !n.read_at) && (
            <button onClick={readAll} className="text-[13px] font-semibold text-brand hover:underline">Mark all read</button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="border-t border-black/[0.05] px-6 py-10 text-center text-sm text-muted">No notifications yet. New bookings and important updates will appear here.</p>
        ) : (
          <div className="border-t border-black/[0.05]">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => openItem(n)}
                className={`flex w-full items-start gap-3 border-b border-black/[0.04] px-6 py-3.5 text-left transition hover:bg-black/[0.02] ${n.read_at ? "" : "bg-[#f7f5ff]"}`}
              >
                <NotifIcon type={n.type} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm text-text ${n.read_at ? "font-medium" : "font-semibold"}`}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-[13px] text-muted">{n.body}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted">{timeAgo(n.created_at)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
