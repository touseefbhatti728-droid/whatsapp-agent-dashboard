"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ALLOWED = [
  "assistant_name",
  "primary_language",
  "tone",
  "reply_length",
  "first_greeting",
  "final_message",
  "use_formal",
  "use_emoji",
  "ai_hours_enabled",
  "ai_hours",
  "after_hours_message",
  "timezone",
  "handover_pause_minutes",
  "handover_rules",
  "handover_notify",
];

export async function saveAiPersona({ id, ...fields }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!id) return { ok: false, error: "No business selected" };

  const clean = {};
  for (const k of ALLOWED) if (k in fields) clean[k] = fields[k];

  const { error } = await supabase.from("businesses").update(clean).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/ai-front-desk");
  return { ok: true };
}
