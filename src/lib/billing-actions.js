"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const STATUSES = ["trialing", "active", "past_due", "cancelled"];

export async function setSubscription(payload) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (profile?.is_admin !== true) return { ok: false, error: "Admins only." };

  const { id, plan, sub_status, renews_at } = payload;
  const clean = {};
  if (typeof plan === "string" && plan) clean.plan = plan;
  if (STATUSES.includes(sub_status)) clean.sub_status = sub_status;
  clean.renews_at = renews_at ? renews_at : null;

  const { error } = await supabase.from("businesses").update(clean).eq("id", id);
  revalidatePath(`/admin/clients/${id}`);
  revalidatePath("/admin");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
