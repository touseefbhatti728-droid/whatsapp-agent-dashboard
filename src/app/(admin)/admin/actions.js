"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSessionUser, getIsAdmin } from "@/lib/session";
import { phoneDigits } from "@/lib/phone";

// Rewrites an old-format number ("0031…", "+31 6…") to digits only — the format Meta uses.
export async function fixWhatsappNumber(formData) {
  const user = await getSessionUser();
  if (!user || !(await getIsAdmin(user.id))) return { ok: false, error: "Not allowed" };
  const id = formData.get("id");
  const supabase = await createClient();
  const { data: b } = await supabase.from("businesses").select("whatsapp_number").eq("id", id).single();
  const clean = phoneDigits(b?.whatsapp_number);
  if (!clean) return { ok: false, error: "No number" };
  const { error } = await supabase.from("businesses").update({ whatsapp_number: clean }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clients/${id}`);
  revalidatePath("/admin/clients");
  return { ok: true };
}

export async function setBusinessStatus(formData) {
  // Server actions can be called directly — only admins may suspend/activate.
  const user = await getSessionUser();
  if (!user || !(await getIsAdmin(user.id))) return { ok: false, error: "Not allowed" };
  const id = formData.get("id");
  const status = formData.get("status");
  if (!["active", "suspended"].includes(status)) return { ok: false, error: "Invalid status" };
  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clients/${id}`);
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
}

// Permanently deletes a customer (business): stops their Stripe subscription, removes their
// phone line, all their data, and their login (unless that login is an admin or owns
// another business). The admin must type the business name to confirm.
const CHILD_TABLES = [
  "loyalty_redemptions", "feedback", "intake_responses", "quotes", "waitlist", "memberships", "leads",
  "ai_pauses", "notifications", "push_subscriptions", "messages", "campaigns", "bookings",
  "packages", "services", "team_members", "knowledge_items",
];
export async function deleteCustomer({ id, confirmName }) {
  const user = await getSessionUser();
  if (!user || !(await getIsAdmin(user.id))) return { ok: false, error: "Not allowed" };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ""))) return { ok: false, error: "Bad id" };
  const { adminDb } = await import("@/lib/admin-db");
  const db = adminDb();
  if (!db) return { ok: false, error: "Server not configured (SUPABASE_SERVICE_ROLE_KEY missing)." };
  const { data: b } = await db.from("businesses").select("*").eq("id", id).maybeSingle();
  if (!b) return { ok: false, error: "Customer not found." };
  if (String(confirmName || "").trim().toLowerCase() !== String(b.name || "").trim().toLowerCase()) {
    return { ok: false, error: "The name you typed doesn't match." };
  }

  // 1) Stop billing first — never leave a card being charged for a deleted account.
  if (b.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const subs = await stripe.subscriptions.list({ customer: b.stripe_customer_id, status: "all", limit: 20 });
      for (const s of subs.data) {
        if (!["canceled", "incomplete_expired"].includes(s.status)) await stripe.subscriptions.cancel(s.id);
      }
    } catch (e) {
      return { ok: false, error: "Couldn't cancel the Stripe subscription, so nothing was deleted: " + e.message };
    }
  }
  // 2) Phone line (Vapi) — best effort.
  if (process.env.VAPI_API_KEY && (b.vapi_phone_number_id || b.vapi_assistant_id)) {
    const h = { Authorization: `Bearer ${process.env.VAPI_API_KEY}` };
    if (b.vapi_phone_number_id) await fetch(`https://api.vapi.ai/phone-number/${b.vapi_phone_number_id}`, { method: "DELETE", headers: h }).catch(() => {});
    if (b.vapi_assistant_id) await fetch(`https://api.vapi.ai/assistant/${b.vapi_assistant_id}`, { method: "DELETE", headers: h }).catch(() => {});
  }
  // 3) Their data, children first.
  const { data: camps } = await db.from("campaigns").select("id").eq("business_id", id);
  if (camps?.length) await db.from("campaign_sends").delete().in("campaign_id", camps.map((c) => c.id));
  for (const t of CHILD_TABLES) {
    const { error } = await db.from(t).delete().eq("business_id", id);
    if (error && !/does not exist|schema cache/i.test(error.message)) return { ok: false, error: `Couldn't clear ${t}: ${error.message}` };
  }
  const { error: bErr } = await db.from("businesses").delete().eq("id", id);
  if (bErr) return { ok: false, error: "Couldn't delete the business: " + bErr.message };

  // 4) Their login — only if it isn't an admin, isn't you, and owns no other business.
  let loginDeleted = false;
  if (b.owner_id && b.owner_id !== user.id) {
    const [{ count }, { data: prof }] = await Promise.all([
      db.from("businesses").select("id", { count: "exact", head: true }).eq("owner_id", b.owner_id),
      db.from("profiles").select("is_admin").eq("id", b.owner_id).maybeSingle(),
    ]);
    if (!count && prof?.is_admin !== true) {
      await db.from("profiles").delete().eq("id", b.owner_id);
      const { error } = await db.auth.admin.deleteUser(b.owner_id);
      loginDeleted = !error;
    }
  }
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
  return { ok: true, loginDeleted };
}

// ---- Control room: the admin edits any setting of any customer directly ----
// Whitelist of editable fields and how each value is cleaned.
const str = (max) => (v) => { const s = String(v ?? "").trim(); return s ? s.slice(0, max) : null; };
const bool = (v) => v === true || v === "true" || v === "on" || v === 1;
const int = (min, max) => (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null; };
const url = (v) => { const s = String(v ?? "").trim(); if (!s) return null; if (!/^https:\/\/\S+$/i.test(s)) throw new Error("Links must start with https://"); return s.slice(0, 500); };
const oneOf = (...opts) => (v) => { const s = String(v ?? ""); if (!opts.includes(s)) throw new Error(`Must be one of: ${opts.join(", ")}`); return s; };
const EDITABLE = {
  name: str(120), location: str(200), timezone: str(60), hours: str(2000), website_url: url, industry: str(60),
  whatsapp_number: (v) => String(v ?? "").replace(/\D/g, "") || null, owner_email: str(200),
  assistant_name: str(60), primary_language: str(60), tone: str(60), reply_length: str(30),
  first_greeting: str(1000), final_message: str(1000), use_emoji: bool, use_formal: bool,
  ai_hours_enabled: bool, after_hours_message: str(1000), handover_pause_minutes: int(5, 10080),
  handover_rules: str(4000), booking: str(4000), faq: str(8000), knowledge: str(20000), services: str(8000),
  feedback_enabled: bool, feedback_delay_hours: int(1, 72), loyalty_enabled: bool, loyalty_visits: int(2, 50), loyalty_reward: str(120),
  deposit_required: bool, deposit_amount: str(60), currency: str(8), payment_link: url, payment_instructions: str(2000),
  google_review_url: url, calendar_id: str(200), webhook_url: url, notify_template: str(120), notify_template_lang: str(10),
  status: oneOf("active", "suspended"),
};

export async function adminUpdateBusiness({ id, patch }) {
  const user = await getSessionUser();
  if (!user || !(await getIsAdmin(user.id))) return { ok: false, error: "Not allowed" };
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) return { ok: false, error: "Bad id" };
  const clean = {};
  try {
    for (const [k, v] of Object.entries(patch || {})) {
      if (!EDITABLE[k]) return { ok: false, error: `"${k}" can't be changed here.` };
      clean[k] = EDITABLE[k](v);
    }
  } catch (e) { return { ok: false, error: e.message }; }
  if (!Object.keys(clean).length) return { ok: true };
  const { adminDb } = await import("@/lib/admin-db");
  const db = adminDb() || (await createClient());
  const { error } = await db.from("businesses").update(clean).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clients/${id}`);
  return { ok: true };
}

// Cut a connection for a customer (they can connect again from their dashboard).
const DISCONNECT = {
  whatsapp: { meta_phone_number_id: null, meta_access_token: null },
  facebook: { fb_page_id: null, fb_page_name: null, fb_page_token: null, ig_account_id: null, ig_username: null },
  instagram: { ig_account_id: null, ig_username: null },
  shopify: { shopify_domain: null, shopify_token: null },
  calendar: { calendar_id: null },
  crm: { webhook_url: null },
  widget: { widget_seen_at: null, widget_origin: null },
  phone: { vapi_assistant_id: null, vapi_phone_number_id: null, voice_number: null },
};
export async function adminDisconnect({ id, what }) {
  const user = await getSessionUser();
  if (!user || !(await getIsAdmin(user.id))) return { ok: false, error: "Not allowed" };
  if (!DISCONNECT[what] || !/^[0-9a-f-]{36}$/i.test(String(id || ""))) return { ok: false, error: "Bad request" };
  const { adminDb } = await import("@/lib/admin-db");
  const db = adminDb();
  if (!db) return { ok: false, error: "Server not configured." };
  if (what === "phone" && process.env.VAPI_API_KEY) {
    const { data: b } = await db.from("businesses").select("vapi_assistant_id, vapi_phone_number_id").eq("id", id).maybeSingle();
    const h = { Authorization: `Bearer ${process.env.VAPI_API_KEY}` };
    if (b?.vapi_phone_number_id) await fetch(`https://api.vapi.ai/phone-number/${b.vapi_phone_number_id}`, { method: "DELETE", headers: h }).catch(() => {});
    if (b?.vapi_assistant_id) await fetch(`https://api.vapi.ai/assistant/${b.vapi_assistant_id}`, { method: "DELETE", headers: h }).catch(() => {});
  }
  const { error } = await db.from("businesses").update(DISCONNECT[what]).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clients/${id}`);
  return { ok: true };
}

// Pause or resume the AI for every chat of a customer (uses the per-chat pause table).
export async function adminPauseAllChats({ id, minutes }) {
  const user = await getSessionUser();
  if (!user || !(await getIsAdmin(user.id))) return { ok: false, error: "Not allowed" };
  const { adminDb } = await import("@/lib/admin-db");
  const db = adminDb();
  if (!db) return { ok: false, error: "Server not configured." };
  if (!Number(minutes)) {
    const { error } = await db.from("ai_pauses").delete().eq("business_id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: rows } = await db.from("messages").select("customer_phone").eq("business_id", id).eq("role", "user")
      .gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString()).limit(2000);
    const phones = [...new Set((rows || []).map((r) => r.customer_phone).filter(Boolean))];
    const until = new Date(Date.now() + Number(minutes) * 60000).toISOString();
    if (phones.length) {
      const { error } = await db.from("ai_pauses").upsert(phones.map((p) => ({ business_id: id, customer_phone: p, until, reason: "paused_by_admin" })), { onConflict: "business_id,customer_phone" });
      if (error) return { ok: false, error: error.message };
    }
  }
  revalidatePath(`/admin/clients/${id}`);
  return { ok: true };
}

// Creates (or finds) every voice plan and add-on price in Stripe. Safe to press again.
export async function adminSetupVoiceStripe() {
  const user = await getSessionUser();
  if (!user || !(await getIsAdmin(user.id))) return { ok: false, error: "Not allowed" };
  if (!process.env.STRIPE_SECRET_KEY) return { ok: false, error: "Stripe secret key is missing." };
  try {
    const Stripe = (await import("stripe")).default;
    const { ensureAllVoicePrices } = await import("@/lib/stripe-voice");
    const prices = await ensureAllVoicePrices(new Stripe(process.env.STRIPE_SECRET_KEY));
    return { ok: true, prices };
  } catch (e) { return { ok: false, error: e.message }; }
}

// ---- WhatsApp calls (AI answers WhatsApp voice calls) ----
const GRAPH = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION || "v22.0"}`;
async function bizWithToken(id) {
  const { adminDb } = await import("@/lib/admin-db");
  const db = adminDb();
  if (!db) throw new Error("Server not configured.");
  const { data: b } = await db.from("businesses").select("id, meta_phone_number_id, meta_access_token").eq("id", id).maybeSingle();
  if (!b?.meta_phone_number_id || !b?.meta_access_token) throw new Error("This customer has no WhatsApp number connected.");
  return b;
}
async function graph(path, token, init = {}) {
  const r = await fetch(`${GRAPH}/${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) }, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.error_user_msg || j?.error?.message || `Meta answered ${r.status}`);
  return j;
}

// Status + what Meta requires (messaging limit, Cloud API number).
export async function adminWhatsappCallingInfo({ id }) {
  const user = await getSessionUser();
  if (!user || !(await getIsAdmin(user.id))) return { ok: false, error: "Not allowed" };
  try {
    const b = await bizWithToken(id);
    const [settings, phone] = await Promise.all([
      graph(`${b.meta_phone_number_id}/settings`, b.meta_access_token).catch((e) => ({ error: e.message })),
      graph(`${b.meta_phone_number_id}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier,platform_type,code_verification_status`, b.meta_access_token).catch((e) => ({ error: e.message })),
    ]);
    return { ok: true, calling: settings?.calling || null, settingsError: settings?.error || null, phone };
  } catch (e) { return { ok: false, error: e.message }; }
}

export async function adminWhatsappCalling({ id, on }) {
  const user = await getSessionUser();
  if (!user || !(await getIsAdmin(user.id))) return { ok: false, error: "Not allowed" };
  try {
    const b = await bizWithToken(id);
    await graph(`${b.meta_phone_number_id}/settings`, b.meta_access_token, {
      method: "POST",
      body: JSON.stringify({ calling: { status: on ? "ENABLED" : "DISABLED", call_icon_visibility: on ? "DEFAULT" : "DISABLE_ALL" } }),
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

// Connect a WhatsApp number by hand (e.g. Meta's test number): phone number ID + access token.
export async function adminConnectNumber({ id, phoneNumberId, token }) {
  const user = await getSessionUser();
  if (!user || !(await getIsAdmin(user.id))) return { ok: false, error: "Not allowed" };
  const pnid = String(phoneNumberId || "").trim();
  const tok = String(token || "").trim();
  if (!/^\d{6,25}$/.test(pnid)) return { ok: false, error: "Phone number ID is a long number (WhatsApp → API Setup)." };
  if (tok.length < 50) return { ok: false, error: "Paste the full access token." };
  try {
    const p = await graph(`${pnid}?fields=display_phone_number,verified_name`, tok);
    const { adminDb } = await import("@/lib/admin-db");
    const { error } = await adminDb().from("businesses").update({
      meta_phone_number_id: pnid, meta_access_token: tok, whatsapp_number: String(p.display_phone_number || "").replace(/\D/g, "") || null,
    }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/admin/clients/${id}`);
    return { ok: true, number: p.display_phone_number, name: p.verified_name };
  } catch (e) { return { ok: false, error: e.message }; }
}
