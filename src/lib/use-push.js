"use client";

import { useCallback, useEffect, useState } from "react";
import { savePushSubscription } from "@/lib/push-actions";
import { deletePushSubscription } from "@/lib/notification-actions";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

const OFF_KEY = "nr-push-off";
function offFlag(v) {
  try {
    if (v === undefined) return localStorage.getItem(OFF_KEY) === "1";
    if (v) localStorage.setItem(OFF_KEY, "1"); else localStorage.removeItem(OFF_KEY);
  } catch (_) {}
  return false;
}

async function subscribeAndSave() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error("Alerts are not configured yet (VAPID key missing).");
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
  }
  const r = await savePushSubscription(JSON.parse(JSON.stringify(sub)));
  if (r && r.ok === false) throw new Error(r.error || "Could not save this device.");
  return sub;
}

// status: loading | unsupported | ios-install | default | granted | denied
export function usePush() {
  const [status, setStatus] = useState("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) { setStatus(isIos() && !isStandalone() ? "ios-install" : "unsupported"); return; }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    const perm = Notification.permission;
    if (perm === "granted" && offFlag()) { setStatus("default"); return; }
    if (perm !== "granted") { setStatus(perm); return; }
    // Permission already given (e.g. earlier session) — make sure this device is
    // really subscribed and saved before we say alerts are ON.
    subscribeAndSave().then(() => setStatus("granted")).catch(() => setStatus("default"));
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm);
        return { ok: false, error: perm === "denied" ? "Alerts are blocked in this browser." : "Permission not given." };
      }
      await subscribeAndSave();
      offFlag(false);
      setStatus("granted");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || "Could not turn on alerts." };
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      offFlag(true);
      setStatus("default");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || "Could not turn off alerts." };
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, enable, disable };
}
