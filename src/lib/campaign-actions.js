"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function num(v) { if (v === "" || v == null) return null; const n = Number(v); return Number.isNaN(n) ? null : n; }

const STARTER = [
  { name: "Appointment reminder — 1 day before", category: "reminder", trigger_type: "before", offset_minutes: 1440,
    message: "Hi, {name}! 👋 Just a friendly reminder about your appointment tomorrow at {event_time_only}. Services: {service_names}. If your plans have changed, please let us know in advance." },
  { name: "Appointment reminder — 1 hour before", category: "reminder", trigger_type: "before", offset_minutes: 60,
    message: "Hi, {name}! ⏳ We'll be expecting you in one hour, at {event_time_only}. See you soon!" },
  { name: "Feedback request after visit", category: "feedback", trigger_type: "after_visit", offset_minutes: 120,
    message: "Hi, {name}! 🌸 Thank you for visiting us. Were you happy with everything today? We'd love your feedback!" },
  { name: "We miss you — 35 days", category: "reactivation", trigger_type: "after_no_visit", offset_minutes: 50400,
    message: "Hi, {name}! 👋 We noticed it's been a while since your last visit and we'd love to welcome you back. Shall we plan your next one?" },
  { name: "We miss you — 65 days", category: "reactivation", trigger_type: "after_no_visit", offset_minutes: 93600,
    message: "Hi, {name}! 🧡 We haven't seen you in almost two months and wanted to check in. Is there anything we can do to make your next visit perfect?" },
  { name: "We miss you — 95 days", category: "reactivation", trigger_type: "after_no_visit", offset_minutes: 136800,
    message: "Hi, {name}! 🌷 It's been about three months since we last saw you. We hope you're doing wonderfully — shall we plan your next visit?" },
  { name: "When a booking is created", category: "event", trigger_type: "on_created", offset_minutes: 0,
    message: "Hi, {name}! ✅ Your appointment for {event_date_only} at {event_time_only} is confirmed. See you then! Need to change it? {booking_link}" },
];

export async function seedStarterCampaigns(business_id) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!business_id) return { ok: false, error: "No business selected" };

  const { count } = await supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("business_id", business_id);
  if ((count || 0) > 0) return { ok: false, error: "Campaigns already exist for this business" };

  const rows = STARTER.map((s) => ({ ...s, business_id, active: false }));
  const { error } = await supabase.from("campaigns").insert(rows);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/marketing");
  return { ok: true };
}

export async function addCampaign({ business_id, name, category, trigger_type, offset_minutes, message }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!business_id) return { ok: false, error: "No business selected" };
  if (!name || !name.trim()) return { ok: false, error: "Name is required" };
  if (!message || !message.trim()) return { ok: false, error: "Message is required" };

  const { error } = await supabase.from("campaigns").insert([{
    business_id, name: name.trim(), category: category || "custom",
    trigger_type: trigger_type || "before", offset_minutes: num(offset_minutes) || 0,
    message: message.trim(), active: false,
  }]);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/marketing");
  return { ok: true };
}

export async function updateCampaign({ id, name, message, offset_minutes }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const patch = {};
  if (name !== undefined) patch.name = name;
  if (message !== undefined) patch.message = message;
  if (offset_minutes !== undefined) patch.offset_minutes = num(offset_minutes) || 0;

  const { error } = await supabase.from("campaigns").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/marketing");
  return { ok: true };
}

export async function toggleCampaign({ id, active }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("campaigns").update({ active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/marketing");
  return { ok: true };
}

export async function deleteCampaign(id) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/marketing");
  return { ok: true };
}
