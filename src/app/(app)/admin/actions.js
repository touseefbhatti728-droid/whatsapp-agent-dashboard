"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSessionUser, getIsAdmin } from "@/lib/session";
import { phoneDigits } from "@/lib/phone";

// Rewrites an old-format number ("0031…", "+31 6…") to digits only — the format Meta uses.
export async function fixWhatsappNumber(formData) {
  const user = await getSessionUser();
  if (!user || !(await getIsAdmin(user.id))) return { ok: false, error: "Not allowed" };
  const id = formData.get("id");
  const supabase = await createClient();
  const { data: b } = await supabase.from("businesses").select("whatsapp_number").eq("id", id).single();
  const clean = phoneDigits(b?.whatsapp_number);
  if (!clean) return { ok: false, error: "No number" };
  const { error } = await supabase.from("businesses").update({ whatsapp_number: clean }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clients/${id}`);
  revalidatePath("/admin/clients");
  return { ok: true };
}

export async function setBusinessStatus(formData) {
  // Server actions can be called directly — only admins may suspend/activate.
  const user = await getSessionUser();
  if (!user || !(await getIsAdmin(user.id))) return { ok: false, error: "Not allowed" };
  const id = formData.get("id");
  const status = formData.get("status");
  if (!["active", "suspended"].includes(status)) return { ok: false, error: "Invalid status" };
  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/clients/${id}`);
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
}
