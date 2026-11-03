"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Only these profile fields can be edited from Settings — never plan, sub_status,
// status, owner or the Meta token (those were writable before).
const EDITABLE = ["name", "location", "hours", "services", "booking", "faq", "calendar_id"];

export async function saveBusinessInfo(payload) {
  const { id } = payload || {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const fields = {};
  for (const k of EDITABLE) if (typeof payload[k] === "string") fields[k] = payload[k].trim();
  const { data, error } = await supabase.from("businesses").update(fields).eq("id", id).select("id");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  if (error) return { ok: false, error: error.message };
  if (!data || !data.length) return { ok: false, error: "Couldn't save — business not found." };
  return { ok: true };
}
