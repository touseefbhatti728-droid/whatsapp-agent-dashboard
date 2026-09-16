"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveWebhook(payload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { id } = payload;
  let url = (payload.webhook_url || "").trim();
  if (url && !/^https?:\/\//i.test(url)) return { ok: false, error: "URL must start with https://" };

  const { error } = await supabase.from("businesses").update({ webhook_url: url || null }).eq("id", id);
  revalidatePath("/integrations");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
