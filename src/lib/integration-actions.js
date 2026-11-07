"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getActiveBusiness, getIsAdmin } from "@/lib/session";
import { checkWebhookUrl } from "@/lib/safe-url";

// Save (or clear) the CRM webhook. Business plan only; admins can set it for any customer.
export async function saveWebhook(payload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const biz = await getActiveBusiness(user.id);
  if (!biz) return { ok: false, error: "No business found for this account." };
  const isAdmin = await getIsAdmin(user.id);
  if (!isAdmin && !/^business$/i.test(String(biz.plan || ""))) {
    return { ok: false, error: "Webhooks are part of the Business plan. Upgrade in Billing." };
  }

  let url = String(payload?.webhook_url || "").trim();
  if (url) {
    const check = await checkWebhookUrl(url);
    if (!check.ok) return check;
    url = check.url;
  }

  const { data, error } = await supabase.from("businesses").update({ webhook_url: url || null }).eq("id", biz.id).select("id");
  revalidatePath("/integrations");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "Couldn't save — please try again." };
  return { ok: true };
}

import { adminDb } from "@/lib/admin-db";
// Simple integrations that are just one value — saved straight from the Integrations page.
const FIELDS = {
  calendar_id: (v) => (v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Enter the calendar ID — it looks like an email (e.g. you@gmail.com)."),
  payment_link: (v) => (v === "" || /^https:\/\/\S+$/i.test(v) ? null : "Enter a link that starts with https://"),
  google_review_url: (v) => (v === "" || /^https:\/\/\S+$/i.test(v) ? null : "Enter a link that starts with https://"),
};

export async function saveIntegrationField({ field, value }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const biz = await getActiveBusiness(user.id);
  if (!biz) return { ok: false, error: "No business found for this account." };
  if (!FIELDS[field]) return { ok: false, error: "Unknown setting." };
  const v = String(value || "").trim().slice(0, 500);
  const bad = FIELDS[field](v);
  if (bad) return { ok: false, error: bad };
  const db = adminDb() || supabase;
  const { error } = await db.from("businesses").update({ [field]: v || null }).eq("id", biz.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/integrations");
  return { ok: true };
}
