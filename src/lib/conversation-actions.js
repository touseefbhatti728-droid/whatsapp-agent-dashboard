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
  const activeBizId = (await getActiveBusiness(user?.id))?.id ?? -1;

  const to = String(phone || "").replace(/\D/g, "");
  const body = String(text || "").trim();
  if (!to) return { ok: false, error: "Missing customer number." };
  if (!body) return { ok: false, error: "Type a message first." };
  if (body.length > 4000) return { ok: false, error: "Message is too long (max 4,000 characters)." };

  const { data: biz } = await supabase
    .from("businesses").select("id, meta_phone_number_id, meta_access_token")
    .eq("id", activeBizId).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!biz) return { ok: false, error: "No business found for this account." };
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

  // Save it so it shows in the thread and the AI sees it in its history.
  const db = adminDb();
  if (db) {
    await db.from("messages").insert({ business_id: biz.id, customer_phone: to, role: "assistant", content: body });
  }
  revalidatePath("/conversations");
  return { ok: true };
}
