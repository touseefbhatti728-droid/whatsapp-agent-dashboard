"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";

// Owner removes someone from the waitlist (they booked elsewhere, no longer wants it…).
export async function removeWaitlistEntry(id) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const activeBizId = (await getActiveBusiness(user?.id))?.id ?? "00000000-0000-0000-0000-000000000000"; // no business -> matches nothing
  const { data, error } = await supabase.from("waitlist").update({ status: "removed" })
    .eq("id", id).eq("business_id", activeBizId).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || !data.length) return { ok: false, error: "Entry not found." };
  revalidatePath("/waitlist");
  return { ok: true };
}

// Google review link the AI shares with happy customers (and {review_link} in Marketing).
export async function saveReviewLink(url) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const activeBizId = (await getActiveBusiness(user?.id))?.id ?? "00000000-0000-0000-0000-000000000000"; // no business -> matches nothing
  const value = String(url || "").trim();
  if (value && !/^https:\/\/\S+$/i.test(value)) return { ok: false, error: "Paste the full link, starting with https://" };
  const { data, error } = await supabase.from("businesses").update({ google_review_url: value || null })
    .eq("id", activeBizId).select("id");
  if (error) return { ok: false, error: /google_review_url/.test(error.message) ? "Reviews aren't switched on yet — your provider needs to run a quick update." : error.message };
  if (!data || !data.length) return { ok: false, error: "Couldn't save — business not found." };
  revalidatePath("/settings");
  return { ok: true };
}
