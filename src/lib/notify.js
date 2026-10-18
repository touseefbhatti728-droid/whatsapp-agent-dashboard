// Server-only helper: save an owner alert in the notification centre and push it
// to every device where the owner turned alerts on. Used by the Stripe webhook,
// WhatsApp connect and the "Send test notification" button.
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export const DEFAULT_PREFS = { booking: true, handover: true, limit: true, billing: true, whatsapp: true };

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:support@nextreply.io", pub, priv);
  vapidReady = true;
  return true;
}

// type: booking | handover | limit | billing | whatsapp | test
// options.force = true sends the push even if the owner switched that alert type off (used by the test button)
// options.save = false skips saving to the notification centre
export async function notifyBusiness(businessId, { type, title, body, url, tag }, options = {}) {
  const result = { saved: false, devices: 0, pushed: 0, error: null };
  const db = adminClient();
  if (!db || !businessId) { result.error = "Server not configured (SUPABASE_SERVICE_ROLE_KEY missing)"; return result; }

  try {
    if (options.save !== false) {
      const { error } = await db.from("notifications").insert([{ business_id: businessId, type, title, body: body || null, url: url || null }]);
      if (error) result.error = error.message; else result.saved = true;
    }

    const { data: biz } = await db.from("businesses").select("notify_prefs").eq("id", businessId).maybeSingle();
    const prefs = { ...DEFAULT_PREFS, ...(biz?.notify_prefs || {}) };
    if (!options.force && type !== "test" && prefs[type] === false) return result;

    if (!ensureVapid()) { result.error = result.error || "Push not configured (VAPID_PRIVATE_KEY missing on Vercel)"; return result; }

    const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("business_id", businessId);
    result.devices = subs?.length || 0;
    const payload = JSON.stringify({ title, body: body || "", url: url || "/dashboard", tag: tag || type, type });

    for (const s of subs || []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
        result.pushed++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await db.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.log("Push send failed:", err.statusCode || err.message);
        }
      }
    }
  } catch (e) {
    result.error = e.message;
  }
  return result;
}
