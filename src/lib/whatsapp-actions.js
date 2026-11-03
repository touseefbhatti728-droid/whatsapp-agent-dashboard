"use server";

import { createClient } from "@/lib/supabase/server";
import { notifyBusiness } from "@/lib/notify";

const GV = process.env.FB_GRAPH_VERSION || "v21.0";

// Called by the Connect WhatsApp button after Meta's Embedded Signup finishes.
// It exchanges the one-time code for a long-lived business token, subscribes our
// app to the business's WhatsApp webhooks, and stores the number + token on the
// user's business row so the AI can send/receive on their behalf.
export async function connectWhatsApp({ code, phoneNumberId, wabaId, coexistence }) {
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

  // 1b) The browser's session-info message can be lost (popup closed early, race with the
  //     callback). Look the WABA and number up from the token instead of saving nothing.
  if (!wabaId) {
    try {
      const res = await fetch(`https://graph.facebook.com/${GV}/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appId + "|" + appSecret)}`);
      const j = await res.json();
      const scope = (j?.data?.granular_scopes || []).find((s) => s.scope === "whatsapp_business_management");
      wabaId = scope?.target_ids?.[0] || null;
    } catch (_) {}
  }
  if (wabaId && !phoneNumberId) {
    try {
      const res = await fetch(`https://graph.facebook.com/${GV}/${wabaId}/phone_numbers?fields=id,display_phone_number`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const j = await res.json();
      phoneNumberId = j?.data?.[0]?.id || null;
    } catch (_) {}
  }
  if (!wabaId || !phoneNumberId) {
    return { ok: false, error: "Meta didn't share your WhatsApp number with us. Please click Connect again and finish every step (choose your business and number)." };
  }

  // 1c) One number can only belong to one business.
  const { data: taken } = await supabase.from("businesses").select("id, owner_id").eq("meta_phone_number_id", String(phoneNumberId)).limit(1).maybeSingle();
  if (taken && taken.owner_id !== user.id) {
    return { ok: false, error: "This WhatsApp number is already connected to another account. Contact support if it's yours." };
  }

  // 2) Subscribe our app to this WABA's webhooks — without this no message ever reaches the AI.
  try {
    const res = await fetch(`https://graph.facebook.com/${GV}/${wabaId}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const j = await res.json();
    if (!res.ok || j?.success !== true) {
      return { ok: false, error: "Couldn't link your WhatsApp to the AI: " + (j?.error?.message || "Meta refused the webhook subscription") };
    }
  } catch (e) {
    return { ok: false, error: "Couldn't link your WhatsApp to the AI: " + e.message };
  }

  // 3) Register the phone number for Cloud API with a random 6-digit PIN (two-step verification).
  //    Coexistence numbers are already registered through the WhatsApp Business app — skip.
  if (!coexistence) {
    try {
      const pin = String(Math.floor(100000 + Math.random() * 900000));
      const res = await fetch(`https://graph.facebook.com/${GV}/${phoneNumberId}/register`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", pin }),
      });
      const j = await res.json();
      // Already registered is fine; anything else means the number can't send yet.
      const msg = j?.error?.message || "";
      if (!res.ok && !/already registered|already been registered/i.test(msg)) {
        return { ok: false, error: "Meta couldn't activate this number: " + (msg || "registration failed") + ". If the number has a two-step PIN, remove it in WhatsApp Manager and try again." };
      }
    } catch (e) {
      return { ok: false, error: "Meta couldn't activate this number: " + e.message };
    }
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

  // 4b) Coexistence: ask Meta to sync contacts + recent chat history from the app (best-effort)
  if (phoneNumberId && coexistence) {
    for (const sync_type of ["smb_app_state_sync", "history"]) {
      try {
        await fetch(`https://graph.facebook.com/${GV}/${phoneNumberId}/smb_app_data`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", sync_type }),
        });
      } catch (_) {}
    }
  }

  // 5) Save on the user's business row
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, sub_status")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!biz) return { ok: false, error: "No business found for this account" };

  const update = {
    meta_phone_number_id: String(phoneNumberId),
    meta_access_token: accessToken,
  };
  // Store digits only (e.g. "31687224652") — exactly how Meta sends it in webhooks.
  if (displayNumber) update.whatsapp_number = String(displayNumber).replace(/\D/g, "");

  const { error } = await supabase.from("businesses").update(update).eq("id", biz.id);
  if (error) return { ok: false, error: error.message };

  // The AI only replies on an active plan or trial — say so instead of promising it's live.
  const aiOn = ["active", "trialing"].includes(biz.sub_status);

  // Owner alert (notification centre + push). Never blocks the connect result.
  try {
    await notifyBusiness(biz.id, {
      type: "whatsapp",
      title: "WhatsApp connected",
      body: aiOn
        ? `${displayNumber || "Your number"} is live — your AI now replies to customers.`
        : `${displayNumber || "Your number"} is connected. Start your free trial in Billing to switch the AI on.`,
      url: aiOn ? "/connect-whatsapp" : "/billing",
      tag: "whatsapp-connected",
    });
  } catch (_) {}

  return { ok: true, phoneNumberId: String(phoneNumberId), phoneNumber: displayNumber, verifiedName, aiOn };
}
