"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveBranding(payload) {
  const supabase = await createClient();
  const clean = {};
  if (typeof payload.app_name === "string" && payload.app_name.trim()) clean.app_name = payload.app_name.trim().slice(0, 40);
  if (typeof payload.brand_color === "string" && /^#[0-9a-fA-F]{6}$/.test(payload.brand_color)) clean.brand_color = payload.brand_color;
  if (Object.keys(clean).length === 0) return { ok: false, error: "Nothing valid to save." };
  const { error } = await supabase.from("settings").update(clean).eq("id", 1);
  revalidatePath("/", "layout");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
