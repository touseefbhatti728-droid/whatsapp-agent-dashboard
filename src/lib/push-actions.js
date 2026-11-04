"use server";

import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/admin-db";

export async function savePushSubscription(sub) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
    return { ok: false, error: "Invalid subscription" };
  }

  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const row = {
    business_id: biz?.id || null,
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  };

  // A browser's endpoint belongs to whoever is signed in on it now. If another account
  // used this browser before, RLS blocks updating their row — so replace it server-side.
  const db = adminDb();
  if (!db) {
    const { error } = await supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
    return error ? { ok: false, error: error.message } : { ok: true };
  }
  const { error: delErr } = await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  if (delErr) return { ok: false, error: delErr.message };
  const { error } = await db.from("push_subscriptions").insert(row);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
