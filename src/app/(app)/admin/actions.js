"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function setBusinessStatus(formData) {
  const id = formData.get("id");
  const status = formData.get("status");
  const supabase = await createClient();
  await supabase.from("businesses").update({ status }).eq("id", id);
  revalidatePath(`/admin/clients/${id}`);
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
}
