"use server";

import { createClient } from "@/lib/supabase/server";
import { notifyBusiness, DEFAULT_PREFS } from "@/lib/notify";

async function ownerBusiness(supabase, userId) {
  const { data } = await supabase
    .from("businesses")
    .select("id, name, notify_prefs")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

// Latest alerts for the bell + unread count. (RLS: owners only see their own businesses.)
export async function getNotifications(limit = 20) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, items: [], unread: 0 };
  const n = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, url, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(n);
  if (error) return { ok: false, items: [], unread: 0, error: error.message };

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  return { ok: true, items: data || [], unread: count || 0 };
}

export async function markNotificationRead(id) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !id) return { ok: false };
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function getNotifyPrefs() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ...DEFAULT_PREFS };
  const biz = await ownerBusiness(supabase, user.id);
  return { ...DEFAULT_PREFS, ...(biz?.notify_prefs || {}) };
}

export async function saveNotifyPrefs(prefs) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const clean = {};
  for (const k of Object.keys(DEFAULT_PREFS)) clean[k] = prefs && prefs[k] === false ? false : true;
  const { error } = await supabase.from("businesses").update({ notify_prefs: clean }).eq("owner_id", user.id);
  return error ? { ok: false, error: error.message } : { ok: true, prefs: clean };
}

// Sends a real push to every device this owner turned alerts on for.
export async function sendTestNotification() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const biz = await ownerBusiness(supabase, user.id);
  if (!biz) return { ok: false, error: "No business found for this account." };

  const r = await notifyBusiness(biz.id, {
    type: "test",
    title: "Alerts are working",
    body: "This is how new bookings will show up on this device.",
    url: "/notifications",
    tag: "test",
  }, { force: true });

  if (r.error && !r.pushed) return { ok: false, error: r.error, devices: r.devices };
  if (!r.devices) return { ok: false, error: "No device has alerts turned on yet. Turn on alerts first.", devices: 0 };
  return { ok: true, devices: r.devices, pushed: r.pushed };
}

// Removes this browser's subscription (Turn off on this device).
export async function deletePushSubscription(endpoint) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !endpoint) return { ok: false };
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
