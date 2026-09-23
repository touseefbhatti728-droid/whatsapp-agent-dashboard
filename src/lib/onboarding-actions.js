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

  // normalise the WhatsApp number (digits only, keep it simple)
  const rawNumber = fields.whatsapp_number?.trim() || "";
  const number = rawNumber ? rawNumber.replace(/[^\d]/g, "") : "";

  // basic number sanity check (7–15 digits, per international format)
  if (number && (number.length < 7 || number.length > 15)) {
    return { ok: false, error: "Please enter a valid WhatsApp number with country code (digits only)." };
  }

  // duplicate-number guard: no two businesses may use the same WhatsApp number
  if (number) {
    const { data: taken } = await supabase
      .from("businesses")
      .select("id, owner_id")
      .eq("whatsapp_number", number)
      .maybeSingle();
    if (taken && taken.id !== biz?.id) {
      return { ok: false, error: "This WhatsApp number is already connected to another account. Please use a different number." };
    }
  }

  const clean = {
    name: fields.name?.trim() || null,
    location: fields.location?.trim() || null,
    hours: fields.hours?.trim() || null,
    services: fields.services?.trim() || null,
    faq: fields.faq?.trim() || null,
    knowledge: fields.knowledge?.trim() || null,
    calendar_id: fields.calendar_id?.trim() || null,
    whatsapp_number: number || null,
    wa_mode: fields.wa_mode || null,
  };

  let error;
  if (biz) {
    ({ error } = await supabase.from("businesses").update(clean).eq("id", biz.id));
  } else {
    ({ error } = await supabase.from("businesses").insert({ owner_id: user.id, status: "active", ...clean }));
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