"use server";

import { createClient } from "@/lib/supabase/server";

const GV = process.env.FB_GRAPH_VERSION || "v21.0";

// Called by the Connect WhatsApp button after Meta's Embedded Signup finishes.
// It exchanges the one-time code for a long-lived business token, subscribes our
// app to the business's WhatsApp webhooks, and stores the number + token on the
// user's business row so the AI can send/receive on their behalf.
export async function connectWhatsApp({ code, phoneNumberId, wabaId }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!code) return { ok: false, error: "Missing authorization code" };

  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  if (!appId || !appSecret) {
    return { ok: false, error: "Server not configured (FB_APP_ID / FB_APP_SECRET missing)" };
  }

  // 1) Exchange code -> business access token
  let accessToken;
  try {
    const url = `https://graph.facebook.com/${GV}/oauth/access_token`
      + `?client_id=${encodeURIComponent(appId)}`
      + `&client_secret=${encodeURIComponent(appSecret)}`
      + `&code=${encodeURIComponent(code)}`;
    const res = await fetch(url);
    const j = await res.json();
    if (!res.ok || !j.access_token) {
      return { ok: false, error: j?.error?.message || "Token exchange failed" };
    }
    accessToken = j.access_token;
  } catch (e) {
    return { ok: false, error: "Token exchange error: " + e.message };
  }

  // 2) Subscribe our app to this WABA's webhooks (best-effort)
  if (wabaId) {
    try {
      await fetch(`https://graph.facebook.com/${GV}/${wabaId}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (_) {}
  }

  // 3) Register the phone number for Cloud API (best-effort; a PIN may already be set)
  if (phoneNumberId) {
    try {
      await fetch(`https://graph.facebook.com/${GV}/${phoneNumberId}/register`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", pin: "000000" }),
      });
    } catch (_) {}
  }

  // 4) Fetch the display phone number — this is what incoming webhooks match on
  let displayNumber = null, verifiedName = null;
  if (phoneNumberId) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/${GV}/${phoneNumberId}?fields=display_phone_number,verified_name`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const j = await res.json();
      displayNumber = j.display_phone_number || null;
      verifiedName = j.verified_name || null;
    } catch (_) {}
  }

  // 5) Save on the user's business row
  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!biz) return { ok: false, error: "No business found for this account" };

  const update = {
    meta_phone_number_id: phoneNumberId || null,
    meta_access_token: accessToken,
  };
  if (displayNumber) update.whatsapp_number = displayNumber;

  const { error } = await supabase.from("businesses").update(update).eq("id", biz.id);
  if (error) return { ok: false, error: error.message };

  return { ok: true, phoneNumberId: phoneNumberId || null, phoneNumber: displayNumber, verifiedName };
}
