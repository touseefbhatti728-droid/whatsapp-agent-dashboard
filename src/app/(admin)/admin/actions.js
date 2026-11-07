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
