"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/admin-db";
import { getActiveBusiness } from "@/lib/session";

// "2026-11-05" + "14:30" in the business's timezone -> UTC Date
function zonedToUtc(date, time, tz) {
  const guess = new Date(`${date}T${time}:00Z`);
  const offsetMs = new Date(guess.toLocaleString("en-US", { timeZone: tz })).getTime()
    - new Date(guess.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(guess.getTime() - offsetMs);
}

// How many people are waiting for the day a slot just opened on (0 if the waitlist isn't set up).
async function waitingThatDay(db, businessId, startIso, tz) {
  if (!startIso) return 0;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Asia/Dubai" }).format(new Date(startIso));
  const { count, error } = await db.from("waitlist").select("id", { count: "exact", head: true })
    .eq("business_id", businessId).eq("wanted_date", day).eq("status", "waiting");
  return error ? 0 : count || 0;
}

// staff_id must be one of this business's team members ("" = anyone).
async function validStaff(db, businessId, staffId) {
  if (!staffId) return null;
  const { data } = await db.from("team_members").select("id").eq("id", staffId).eq("business_id", businessId).maybeSingle();
  return data ? data.id : null;
}

// Saves; retries without staff_id before the staff SQL is run.
async function writeWithStaff(run, row) {
  let { data, error } = await run(row);
  if (error && /staff_id/.test(error.message) && "staff_id" in row) {
    const { staff_id, ...rest } = row;
    ({ data, error } = await run(rest));
  }
  return { data, error };
}

// Confirms the booking belongs to the business this user may manage (owner, or admin managing it).
async function ownedBooking(supabase, user, bookingId) {
  const activeBizId = (await getActiveBusiness(user?.id))?.id ?? "00000000-0000-0000-0000-000000000000"; // no business -> matches nothing
  const { data } = await supabase.from("bookings").select("id, business_id, start_time").eq("id", bookingId).maybeSingle();
  if (!data || String(data.business_id) !== String(activeBizId)) return null;
  return data;
}

export async function updateAppointment(input) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const booking = await ownedBooking(supabase, user, input?.id);
  if (!booking) return { ok: false, error: "Booking not found." };

  const { data: biz } = await supabase.from("businesses").select("timezone").eq("id", booking.business_id).maybeSingle();
  const patch = {};
  if (typeof input.name === "string" && input.name.trim()) patch.customer_name = input.name.trim();
  if (typeof input.phone === "string") patch.customer_phone = input.phone.replace(/\D/g, "") || null;
  if (typeof input.service === "string") patch.service = input.service.trim() || null;
  if (typeof input.notes === "string") patch.notes = input.notes.trim() || null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(input.date || "")) && /^\d{2}:\d{2}$/.test(String(input.time || ""))) {
    const start = zonedToUtc(input.date, input.time, biz?.timezone || "Asia/Dubai");
    if (!isNaN(start)) patch.start_time = start.toISOString();
  }
  const db = adminDb();
  if (!db) return { ok: false, error: "Server not configured (SUPABASE_SERVICE_ROLE_KEY missing)." };
  if (input.staff_id !== undefined) patch.staff_id = await validStaff(db, booking.business_id, input.staff_id);
  const { error } = await writeWithStaff((row) => db.from("bookings").update(row).eq("id", booking.id), patch);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar"); revalidatePath("/dashboard"); revalidatePath("/clients");
  const moved = patch.start_time && new Date(patch.start_time).getTime() !== new Date(booking.start_time).getTime();
  return { ok: true, waiting: moved ? await waitingThatDay(db, booking.business_id, booking.start_time, biz?.timezone) : 0 };
}

export async function cancelAppointment(id) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const booking = await ownedBooking(supabase, user, id);
  if (!booking) return { ok: false, error: "Booking not found." };
  const db = adminDb();
  if (!db) return { ok: false, error: "Server not configured (SUPABASE_SERVICE_ROLE_KEY missing)." };
  const { error } = await db.from("bookings").delete().eq("id", booking.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar"); revalidatePath("/dashboard"); revalidatePath("/clients");
  const { data: biz } = await db.from("businesses").select("timezone").eq("id", booking.business_id).maybeSingle();
  return { ok: true, waiting: new Date(booking.start_time) > new Date() ? await waitingThatDay(db, booking.business_id, booking.start_time, biz?.timezone) : 0 };
}

// Owner adds an appointment by hand (walk-in, phone call, Instagram DM...).
export async function createAppointment(input) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  // owners: their business · admins: the customer they are managing
  const activeBizId = (await getActiveBusiness(user?.id))?.id ?? "00000000-0000-0000-0000-000000000000"; // no business -> matches nothing

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
    .eq("id", activeBizId).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!biz) return { ok: false, error: "No business found for this account." };

  const start = zonedToUtc(date, time, biz.timezone || "Asia/Dubai");
  if (isNaN(start)) return { ok: false, error: "That date or time isn't valid." };

  const db = adminDb();
  if (!db) return { ok: false, error: "Server not configured (SUPABASE_SERVICE_ROLE_KEY missing)." };
  const { data, error } = await writeWithStaff((row) => db.from("bookings").insert(row).select("ref_no").single(), {
    business_id: biz.id,
    customer_name: name,
    customer_phone: phone || null,
    service: service || null,
    start_time: start.toISOString(),
    notes: notes || null,
    source: "dashboard",
    staff_id: await validStaff(db, biz.id, input?.staff_id),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/clients");
  return { ok: true, ref: data?.ref_no ? `BK-${data.ref_no}` : null };
}
