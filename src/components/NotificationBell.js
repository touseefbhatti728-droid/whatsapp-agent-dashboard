"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/notification-actions";
import { usePush } from "@/lib/use-push";
import { toast } from "@/lib/toast";
import { NotifIcon, timeAgo } from "@/components/notif-meta";

const POLL_MS = 20000;

// Soft two-note chime made with Web Audio (no sound file needed).
function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [[880, 0], [1318.5, 0.12]].forEach(([f, d]) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + d);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d + 0.6);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.65);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch (_) {}
}

export function DeviceAlertStatus({ compact = false }) {
  const { status, busy, enable } = usePush();
  if (status === "loading" || status === "granted") return null;

  let text, action = null;
  if (status === "default") {
    text = "Get booking alerts on this device, even when NextReply is closed.";
    action = (
      <button
        onClick={async () => {
          const r = await enable();
          if (r.ok) toast.success("Alerts are on for this device");
          else toast.error("Could not turn on alerts", r.error);
        }}
        disabled={busy}
        className="btn-brand shrink-0 px-3 py-1.5 text-xs"
      >
        {busy ? "Turning on…" : "Turn on"}
      </button>
    );
  } else if (status === "denied") {
    text = "Alerts are blocked in this browser. Click the lock icon next to the address bar → Notifications → Allow.";
  } else if (status === "ios-install") {
    text = "On iPhone: tap Share → Add to Home Screen, open NextReply from your home screen, then turn on alerts.";
  } else {
    text = "This browser can't show alerts. Use Chrome, Edge or Safari (iPhone: add to Home Screen first).";
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl bg-[#f3f0ff] ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>
      <p className="flex-1 text-[12.5px] leading-snug text-text">{text}</p>
      {action}
    </div>
  );
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const seen = useRef(null); // ids already known (null until first load)
  const boxRef = useRef(null);

  const load = useCallback(async () => {
    let r;
    try { r = await getNotifications(20); } catch (_) { return; }
    if (!r || !r.ok) return;
    const list = r.items || [];

    if (seen.current === null) {
      seen.current = new Set(list.map((n) => n.id));
    } else {
      const fresh = list.filter((n) => !seen.current.has(n.id)).reverse();
      fresh.forEach((n) => seen.current.add(n.id));
      if (fresh.length) {
        fresh.slice(-3).forEach((n) => toast({ kind: "alert", type: n.type, title: n.title, body: n.body, url: n.url || undefined }));
        chime();
        // Keep counters like "Today: N appointments" fresh.
        if (fresh.some((n) => n.type === "booking" || n.type === "billing" || n.type === "whatsapp")) router.refresh();
      }
    }
    setItems(list);
    setUnread(r.unread || 0);
    setLoaded(true);
  }, [router]);

  // First load + polling while the tab is visible.
  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, POLL_MS);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    // A push arrived → the service worker pings us → refresh instantly.
    const onSw = (e) => { if (e.data && e.data.type === "nr-push") setTimeout(load, 600); };
    if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", onSw);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("message", onSw);
    };
  }, [load]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  async function openItem(n) {
    setOpen(false);
    if (!n.read_at) {
      setItems((l) => l.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      setUnread((u) => Math.max(0, u - 1));
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.url) router.push(n.url);
  }

  async function readAll() {
    setItems((l) => l.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
    setUnread(0);
    const r = await markAllNotificationsRead();
    if (r && r.ok === false) load();
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.06] bg-surface transition hover:text-text ${open ? "text-brand" : "text-muted"}`}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" /></svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10.5px] font-bold leading-none text-white ring-2 ring-[#f6f4ef]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[380px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_24px_60px_-20px_rgba(20,16,43,0.35)]">
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-[15px] font-bold text-text">Notifications</p>
            {unread > 0 && (
              <button onClick={readAll} className="text-[12.5px] font-semibold text-brand hover:underline">Mark all read</button>
            )}
          </div>

          <div className="px-3 pb-2"><DeviceAlertStatus compact /></div>

          <div className="max-h-[420px] overflow-y-auto border-t border-black/[0.05]">
            {!loaded && <p className="px-4 py-8 text-center text-sm text-muted">Loading…</p>}
            {loaded && items.length === 0 && (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-semibold text-text">You're all caught up</p>
                <p className="mt-1 text-[13px] text-muted">New bookings and important updates will show up here.</p>
              </div>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => openItem(n)}
                className={`flex w-full items-start gap-3 border-b border-black/[0.04] px-4 py-3 text-left transition hover:bg-black/[0.025] ${n.read_at ? "" : "bg-[#f7f5ff]"}`}
              >
                <NotifIcon type={n.type} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[13.5px] leading-snug text-text ${n.read_at ? "font-medium" : "font-semibold"}`}>{n.title}</p>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted">{n.body}</p>}
                  <p className="mt-1 text-[11.5px] text-muted">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
              </button>
            ))}
          </div>

          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-black/[0.05] px-4 py-3 text-center text-[13px] font-semibold text-brand hover:bg-black/[0.02]">
            Notification settings
          </Link>
        </div>
      )}
    </div>
  );
}
