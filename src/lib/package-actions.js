"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";

async function ctx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const biz = await getActiveBusiness(user.id);
  if (!biz) return { error: "No business found for this account." };
  return { supabase, biz };
}

function fields(input) {
  const sessions = Math.round(Number(input.sessions) || 1);
  const validity = input.validity_days === "" || input.validity_days == null ? null : Math.round(Number(input.validity_days));
  return {
    name: String(input.name || "").trim().slice(0, 120),
    description: String(input.description || "").trim().slice(0, 600) || null,
    services: Array.isArray(input.services) ? input.services.map(String).slice(0, 50) : [],
    price: String(input.price || "").trim().slice(0, 60) || null,
    sessions: Math.min(100, Math.max(1, sessions)),
    validity_days: validity && validity > 0 ? Math.min(3650, validity) : null,
  };
}

export async function savePackage(input) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const row = fields(input || {});
  if (!row.name) return { ok: false, error: "Give the package a name." };
  const q = input.id
    ? supabase.from("packages").update(row).eq("id", input.id).eq("business_id", biz.id)
    : supabase.from("packages").insert([{ ...row, business_id: biz.id }]);
  const { error: e } = await q;
  if (e) return { ok: false, error: e.message };
  revalidatePath("/services");
  return { ok: true };
}

export async function setPackageActive(id, active) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const { error: e } = await supabase.from("packages").update({ active: !!active }).eq("id", id).eq("business_id", biz.id);
  if (e) return { ok: false, error: e.message };
  revalidatePath("/services");
  return { ok: true };
}

export async function deletePackage(id) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const { error: e } = await supabase.from("packages").delete().eq("id", id).eq("business_id", biz.id);
  if (e) return { ok: false, error: e.message };
  revalidatePath("/services");
  return { ok: true };
}
