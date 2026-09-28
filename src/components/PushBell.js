"use client";

import { useEffect, useState } from "react";
import { savePushSubscription } from "@/lib/push-actions";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushBell() {
  const [status, setStatus] = useState("loading"); // loading | unsupported | default | granted | denied
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    setStatus(Notification.permission);
  }, []);

  async function enable() {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) { alert("Notifications are not configured yet."); return; }
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setStatus(perm);
      if (perm !== "granted") { setBusy(false); return; }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
      }
      await savePushSubscription(JSON.parse(JSON.stringify(sub)));
    } catch (e) {
      // stay quiet; user can retry
    }
    setBusy(false);
  }

  const active = status === "granted";
  const clickable = status === "default";
  const title =
    status === "unsupported" ? "Notifications not supported in this browser"
    : active ? "Booking alerts are on"
    : status === "denied" ? "Notifications are blocked — enable them in your browser settings"
    : "Turn on booking alerts";

  return (
    <button
      onClick={clickable ? enable : undefined}
      disabled={busy || !clickable}
      title={title}
      aria-label={title}
      className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.06] bg-surface transition ${active ? "text-brand" : "text-muted hover:text-text"} ${!clickable ? "cursor-default" : ""}`}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" /></svg>
      {clickable && (
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-[#f6f4ef]" />
      )}
    </button>
  );
}
