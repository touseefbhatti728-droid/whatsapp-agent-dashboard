"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";

async function ctx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const biz = await getActiveBusiness(user.id);
  if (!biz) return { error: "No business found for this account." };
  return { supabase, biz };
}
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));

export async function saveMembership(input) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const phone = String(input.customer_phone || "").replace(/\D/g, "").replace(/^00/, "");
  if (!String(input.plan_name || "").trim()) return { ok: false, error: "Name the plan, e.g. Monthly gym." };
  if (!isDate(input.start_date) || !isDate(input.end_date)) return { ok: false, error: "Pick the start and end dates." };
  if (input.end_date < input.start_date) return { ok: false, error: "The end date is before the start date." };
  const row = {
    customer_name: String(input.customer_name || "").trim().slice(0, 120) || null,
    customer_phone: phone || null,
    plan_name: String(input.plan_name).trim().slice(0, 120),
    price: String(input.price || "").trim().slice(0, 60) || null,
    start_date: input.start_date, end_date: input.end_date,
    notes: String(input.notes || "").trim().slice(0, 1000) || null,
  };
  // New dates → reminders start again.
  if (input.id) Object.assign(row, { status: "active", reminders_sent: 0, last_reminded_at: null });
  const q = input.id
    ? supabase.from("memberships").update(row).eq("id", input.id).eq("business_id", biz.id)
    : supabase.from("memberships").insert([{ ...row, business_id: biz.id }]);
  const { error: e } = await q;
  if (e) return { ok: false, error: /does not exist|schema cache/.test(e.message) ? "Memberships turn on after a quick database update by your provider." : e.message };
  revalidatePath("/memberships");
  return { ok: true };
}

// Renew for the same length again, starting the day after it ends (or today if already expired).
export async function renewMembership(id) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const { data: m } = await supabase.from("memberships").select("*").eq("id", id).eq("business_id", biz.id).maybeSingle();
  if (!m) return { ok: false, error: "Membership not found." };
  const day = 86400000;
  const length = Math.max(1, Math.round((new Date(m.end_date) - new Date(m.start_date)) / day) + 1);
  const today = new Date().toISOString().slice(0, 10);
  const startIso = m.end_date >= today ? new Date(new Date(m.end_date).getTime() + day).toISOString().slice(0, 10) : today;
  const endIso = new Date(new Date(startIso).getTime() + (length - 1) * day).toISOString().slice(0, 10);
  const { error: e } = await supabase.from("memberships").update({ start_date: startIso, end_date: endIso, status: "active", reminders_sent: 0, last_reminded_at: null }).eq("id", id);
  if (e) return { ok: false, error: e.message };
  revalidatePath("/memberships");
  return { ok: true, end: endIso };
}

export async function cancelMembership(id) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const { error: e } = await supabase.from("memberships").update({ status: "cancelled" }).eq("id", id).eq("business_id", biz.id);
  if (e) return { ok: false, error: e.message };
  revalidatePath("/memberships");
  return { ok: true };
}
