"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveBusinessInfo(payload) {
  const { id, ...fields } = payload;
  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update(fields).eq("id", id);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
