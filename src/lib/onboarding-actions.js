"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Saves the onboarding data to the user's business row.
// Creates the business row if it does not exist yet, otherwise updates it.
export async function saveOnboarding(fields) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // find this owner's business
  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // WhatsApp is connected through Meta (Connect WhatsApp), which saves the number +
  // credentials itself — onboarding never writes or clears whatsapp_number.
  const clean = {
    name: fields.name?.trim() || null,
    location: fields.location?.trim() || null,
    hours: fields.hours?.trim() || null,
    services: fields.services?.trim() || null,
    faq: fields.faq?.trim() || null,
    knowledge: fields.knowledge?.trim() || null,
    calendar_id: fields.calendar_id?.trim() || null,
  };

  let error;
  if (biz) {
    ({ error } = await supabase.from("businesses").update(clean).eq("id", biz.id));
  } else {
    ({ error } = await supabase.from("businesses").insert({ owner_id: user.id, owner_email: user.email || null, status: "active", ...clean }));
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  if (error) {
    // handle the DB-level unique constraint too (if you add one), just in case
    if (/duplicate key|unique constraint/i.test(error.message)) {
      return { ok: false, error: "This WhatsApp number is already connected to another account." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}