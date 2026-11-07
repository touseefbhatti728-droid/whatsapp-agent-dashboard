"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";

const STAGES = ["new", "contacted", "qualified", "booked", "won", "lost"];
const notReady = (e) => /leads|lead_|does not exist|schema cache/i.test(e?.message || "")
  ? "Leads aren't switched on yet — your provider needs to run a quick database update."
  : e?.message || "Something went wrong.";

async function ctx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const biz = await getActiveBusiness(user.id);
  if (!biz) return { error: "No business found for this account." };
  return { supabase, biz };
}

const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) || null : undefined);

export async function updateLead(id, input) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const patch = { updated_at: new Date().toISOString() };
  if (input.stage !== undefined) {
    if (!STAGES.includes(input.stage)) return { ok: false, error: "Unknown stage." };
    patch.stage = input.stage;
  }
  for (const [k, max] of [["name", 120], ["email", 200], ["interest", 300], ["budget", 120], ["timeline", 120], ["notes", 4000]]) {
    const v = clean(input[k], max);
    if (v !== undefined) patch[k] = v;
  }
  const { error: e } = await supabase.from("leads").update(patch).eq("id", id).eq("business_id", biz.id);
  if (e) return { ok: false, error: notReady(e) };
  revalidatePath("/leads");
  return { ok: true };
}

export async function addLead(input) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const phone = String(input?.phone || "").replace(/\D/g, "").replace(/^00/, "");
  if (!input?.name?.trim() && !phone) return { ok: false, error: "Add a name or a phone number." };
  if (phone && (phone.length < 8 || phone.length > 15)) return { ok: false, error: "Phone needs the country code, e.g. +971 50 123 4567." };
  const { error: e } = await supabase.from("leads").insert([{
    business_id: biz.id, phone: phone || null, source: "manual", stage: "new",
    name: clean(input.name, 120) ?? null, interest: clean(input.interest, 300) ?? null, notes: clean(input.notes, 4000) ?? null,
  }]);
  if (e) return { ok: false, error: /duplicate key/i.test(e.message) ? "A lead with this phone number already exists." : notReady(e) };
  revalidatePath("/leads");
  return { ok: true };
}

export async function deleteLead(id) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const { error: e } = await supabase.from("leads").delete().eq("id", id).eq("business_id", biz.id);
  if (e) return { ok: false, error: notReady(e) };
  revalidatePath("/leads");
  return { ok: true };
}

// What the AI should find out, and the approved template for messaging new ad leads.
export async function saveLeadSettings(input) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const template = String(input?.lead_template || "").trim();
  if (template && !/^[a-z0-9_]{1,512}$/.test(template)) return { ok: false, error: "Template name is lowercase letters, numbers and _ — exactly as in WhatsApp Manager." };
  const { error: e } = await supabase.from("businesses").update({
    lead_questions: clean(input?.lead_questions, 600) ?? null,
    lead_template: template || null,
    lead_template_lang: String(input?.lead_template_lang || "en").trim().slice(0, 10) || "en",
  }).eq("id", biz.id);
  if (e) return { ok: false, error: notReady(e) };
  revalidatePath("/leads");
  return { ok: true };
}

// New secret for the lead webhook (the old one stops working).
export async function regenerateLeadKey() {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const key = crypto.randomBytes(24).toString("hex");
  const { error: e } = await supabase.from("businesses").update({ lead_webhook_key: key }).eq("id", biz.id);
  if (e) return { ok: false, error: notReady(e) };
  revalidatePath("/leads");
  return { ok: true };
}
