"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import { adminDb } from "@/lib/admin-db";

const NOT_READY = "These tools turn on after a quick database update by your provider.";
const friendly = (e) => (/column|does not exist|schema cache/i.test(e?.message || "") ? NOT_READY : e?.message || "Couldn't save.");

async function ctx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const biz = await getActiveBusiness(user.id);
  if (!biz) return { error: "No business found for this account." };
  return { supabase, biz };
}
const txt = (v, max) => (String(v ?? "").trim().slice(0, max) || null);

// Payments, deposits and the template used to message customers first.
export async function savePaymentSettings(input) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const link = txt(input.payment_link, 500);
  if (link && !/^https:\/\/\S+$/i.test(link)) return { ok: false, error: "The payment link must start with https://" };
  const template = txt(input.notify_template, 512);
  if (template && !/^[a-z0-9_]+$/.test(template)) return { ok: false, error: "Template name is lowercase letters, numbers and _ — exactly as in WhatsApp Manager." };
  const { error: e } = await supabase.from("businesses").update({
    payment_link: link,
    payment_instructions: txt(input.payment_instructions, 600),
    deposit_required: !!input.deposit_required,
    deposit_amount: txt(input.deposit_amount, 40),
    currency: (txt(input.currency, 6) || "AED").toUpperCase(),
    notify_template: template,
    notify_template_lang: txt(input.notify_template_lang, 10) || "en",
  }).eq("id", biz.id);
  if (e) return { ok: false, error: friendly(e) };
  revalidatePath("/followups");
  return { ok: true };
}

export async function saveFeedbackLoyalty(input) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const visits = Math.round(Number(input.loyalty_visits) || 5);
  if (input.loyalty_enabled && !txt(input.loyalty_reward, 120)) return { ok: false, error: "Write the reward, e.g. \"a free blow-dry\"." };
  const { error: e } = await supabase.from("businesses").update({
    feedback_enabled: !!input.feedback_enabled,
    feedback_delay_hours: Math.min(72, Math.max(1, Math.round(Number(input.feedback_delay_hours) || 3))),
    loyalty_enabled: !!input.loyalty_enabled,
    loyalty_visits: Math.min(50, Math.max(2, visits)),
    loyalty_reward: txt(input.loyalty_reward, 120),
  }).eq("id", biz.id);
  if (e) return { ok: false, error: friendly(e) };
  revalidatePath("/followups");
  return { ok: true };
}

// Intake form: [{ label, type: text|yesno|choice, options: [], required }]
export async function saveIntakeForm(fields) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const clean = (Array.isArray(fields) ? fields : []).slice(0, 20).map((f) => ({
    label: String(f.label || "").trim().slice(0, 200),
    type: ["text", "yesno", "choice"].includes(f.type) ? f.type : "text",
    options: f.type === "choice" ? (Array.isArray(f.options) ? f.options : String(f.options || "").split(",")).map((o) => String(o).trim()).filter(Boolean).slice(0, 12) : [],
    required: !!f.required,
  })).filter((f) => f.label);
  if (clean.some((f) => f.type === "choice" && f.options.length < 2)) return { ok: false, error: "Choice questions need at least 2 options (comma separated)." };
  const { error: e } = await supabase.from("businesses").update({ intake_form: clean.length ? clean : null }).eq("id", biz.id);
  if (e) return { ok: false, error: friendly(e) };
  revalidatePath("/followups");
  return { ok: true };
}

// Owner gives out a loyalty reward to a customer.
export async function redeemReward(phone) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return { ok: false, error: "Missing customer." };
  const { error: e } = await supabase.from("loyalty_redemptions").insert([{ business_id: biz.id, customer_phone: digits, reward: biz.loyalty_reward || null }]);
  if (e) return { ok: false, error: friendly(e) };
  revalidatePath("/clients");
  return { ok: true };
}

// Deposit received (or not) for a booking.
export async function setDepositStatus(bookingId, status) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  if (!["none", "pending", "paid"].includes(status)) return { ok: false, error: "Unknown status." };
  // Bookings are written with the service role (like the other calendar actions), scoped to this business.
  const db = adminDb() || supabase;
  const { data, error: e } = await db.from("bookings").update({ deposit_status: status }).eq("id", bookingId).eq("business_id", biz.id).select("id");
  if (e) return { ok: false, error: friendly(e) };
  if (!data?.length) return { ok: false, error: "Booking not found." };
  revalidatePath("/calendar");
  return { ok: true };
}
