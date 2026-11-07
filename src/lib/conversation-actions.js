"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/admin-db";
import { getActiveBusiness } from "@/lib/session";

const GV = process.env.FB_GRAPH_VERSION || "v22.0";
const DAY_MS = 24 * 60 * 60 * 1000;

// Owner replies to a customer from the Conversations page (after a handover, etc.).
export async function sendReply({ phone, text }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  // owners: their business · admins: the customer they are managing
  const activeBizId = (await getActiveBusiness(user?.id))?.id ?? "00000000-0000-0000-0000-000000000000"; // no business -> matches nothing

  // Website chat visitors ("web:<id>") see the reply in the chat widget, not on WhatsApp.
  const isWeb = /^web:[a-z0-9-]{8,40}$/i.test(String(phone || ""));
  const social = /^(fb|ig):\d{5,30}$/.exec(String(phone || "")); // Messenger / Instagram DM
  const to = isWeb || social ? String(phone) : String(phone || "").replace(/\D/g, "");
  const body = String(text || "").trim();
  if (!to) return { ok: false, error: "Missing customer number." };
  if (!body) return { ok: false, error: "Type a message first." };
  if (body.length > 4000) return { ok: false, error: "Message is too long (max 4,000 characters)." };

  const { data: biz } = await supabase
    .from("businesses").select("id, meta_phone_number_id, meta_access_token")
    .eq("id", activeBizId).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!biz) return { ok: false, error: "No business found for this account." };
  if (isWeb) return saveOwnerReply(biz.id, to, body);
  if (social) {
    // Messenger / Instagram allow free replies within 24 hours of the customer's last message.
    const db0 = adminDb();
    const { data: page } = await db0.from("businesses").select("fb_page_id, fb_page_token").eq("id", biz.id).maybeSingle();
    if (!page?.fb_page_id || !page?.fb_page_token) return { ok: false, error: "Connect your Facebook Page first (Instagram & Messenger)." };
    const { data: lastMsg } = await db0.from("messages").select("created_at").eq("business_id", biz.id).eq("customer_phone", to).eq("role", "user")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!lastMsg || Date.now() - new Date(lastMsg.created_at).getTime() > DAY_MS) {
      return { ok: false, error: "Messenger and Instagram only allow replies within 24 hours of the customer's last message." };
    }
    try {
      const res = await fetch(`https://graph.facebook.com/${GV}/${page.fb_page_id}/messages?access_token=${encodeURIComponent(page.fb_page_token)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: social[0].split(":")[1] }, messaging_type: "RESPONSE", message: { text: body.slice(0, 1900) } }),
      });
      const j = await res.json();
      if (!res.ok) return { ok: false, error: j?.error?.message || "Facebook didn't accept the message." };
    } catch (e) {
      return { ok: false, error: "Couldn't reach Facebook: " + e.message };
    }
    return saveOwnerReply(biz.id, to, body);
  }
  if (!biz.meta_phone_number_id || !biz.meta_access_token) {
    return { ok: false, error: "Connect WhatsApp first (menu → Connect WhatsApp)." };
  }

  // WhatsApp only allows free-text replies within 24 hours of the customer's last message.
  const { data: last } = await supabase
    .from("messages").select("created_at")
    .eq("business_id", biz.id).eq("customer_phone", to).eq("role", "user")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!last || Date.now() - new Date(last.created_at).getTime() > DAY_MS) {
    return { ok: false, error: "WhatsApp only allows replies within 24 hours of the customer's last message. Ask them to message you again." };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${GV}/${biz.meta_phone_number_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${biz.meta_access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
    });
    const j = await res.json();
    if (!res.ok) return { ok: false, error: j?.error?.message || "WhatsApp didn't accept the message." };
  } catch (e) {
    return { ok: false, error: "Couldn't reach WhatsApp: " + e.message };
  }

  return saveOwnerReply(biz.id, to, body);
}

// Save the owner's reply so it shows in the thread (and in an open website chat),
// and keep the AI quiet for that customer during the handover pause (default 2 h).
async function saveOwnerReply(businessId, to, body) {
  const db = adminDb();
  if (!db) return { ok: false, error: "Server not configured (SUPABASE_SERVICE_ROLE_KEY missing)." };
  const { error } = await db.from("messages").insert({ business_id: businessId, customer_phone: to, role: "staff", content: body }); // staff = typed by a person, not the AI
  if (error) return { ok: false, error: error.message };
  const { data: b2 } = await db.from("businesses").select("handover_pause_minutes").eq("id", businessId).maybeSingle();
  const minutes = Number(b2?.handover_pause_minutes) > 0 ? Number(b2.handover_pause_minutes) : 120;
  await db.from("ai_pauses").upsert(
    { business_id: businessId, customer_phone: to, until: new Date(Date.now() + minutes * 60000).toISOString(), reason: "owner_replied_in_dashboard" },
    { onConflict: "business_id,customer_phone" },
  );
  revalidatePath("/conversations");
  return { ok: true };
}

// Pause the AI for one chat (minutes > 0) or switch it back on (minutes = 0).
export async function setAiPause({ phone, minutes }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const biz = await getActiveBusiness(user.id);
  if (!biz) return { ok: false, error: "No business found for this account." };
  const to = String(phone || "");
  if (!/^(web:[a-z0-9-]{8,40}|(fb|ig):\d{5,30}|\d{6,20})$/i.test(to)) return { ok: false, error: "Unknown chat." };
  const db = adminDb();
  if (!db) return { ok: false, error: "Server not configured." };
  const m = Math.max(0, Math.min(60 * 24 * 7, Number(minutes) || 0));
  const { error } = m === 0
    ? await db.from("ai_pauses").delete().eq("business_id", biz.id).eq("customer_phone", to)
    : await db.from("ai_pauses").upsert(
      { business_id: biz.id, customer_phone: to, until: new Date(Date.now() + m * 60000).toISOString(), reason: "paused_in_dashboard" },
      { onConflict: "business_id,customer_phone" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/conversations");
  return { ok: true };
}
