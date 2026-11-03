"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/admin-db";

// "2026-11-05" + "14:30" in the business's timezone -> UTC Date
function zonedToUtc(date, time, tz) {
  const guess = new Date(`${date}T${time}:00Z`);
  const offsetMs = new Date(guess.toLocaleString("en-US", { timeZone: tz })).getTime()
    - new Date(guess.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(guess.getTime() - offsetMs);
}

// Owner adds an appointment by hand (walk-in, phone call, Instagram DM...).
export async function createAppointment(input) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const name = String(input?.name || "").trim();
  const phone = String(input?.phone || "").replace(/\D/g, "");
  const service = String(input?.service || "").trim();
  const date = String(input?.date || "");
  const time = String(input?.time || "");
  const notes = String(input?.notes || "").trim();
  if (!name) return { ok: false, error: "Please enter the customer's name." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { ok: false, error: "Please pick a date and time." };

  const { data: biz } = await supabase
    .from("businesses").select("id, timezone")
    .eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!biz) return { ok: false, error: "No business found for this account." };

  const start = zonedToUtc(date, time, biz.timezone || "Asia/Dubai");
  if (isNaN(start)) return { ok: false, error: "That date or time isn't valid." };

  const db = adminDb();
  if (!db) return { ok: false, error: "Server not configured (SUPABASE_SERVICE_ROLE_KEY missing)." };
  const { data, error } = await db.from("bookings").insert({
    business_id: biz.id,
    customer_name: name,
    customer_phone: phone || null,
    service: service || null,
    start_time: start.toISOString(),
    notes: notes || null,
    source: "dashboard",
  }).select("ref_no").single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/clients");
  return { ok: true, ref: data?.ref_no ? `BK-${data.ref_no}` : null };
}
