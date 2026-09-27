"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function num(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export async function addService({ business_id, name, category, price, duration_min }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!business_id) return { ok: false, error: "No business selected" };
  if (!name || !name.trim()) return { ok: false, error: "Service name is required" };

  const { error } = await supabase.from("services").insert([{
    business_id,
    name: name.trim(),
    category: category && category.trim() ? category.trim() : null,
    price: num(price),
    duration_min: num(duration_min),
  }]);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/services");
  return { ok: true };
}

export async function updateService({ id, name, category, price, duration_min, active }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const patch = {};
  if (name !== undefined) patch.name = name;
  if (category !== undefined) patch.category = category && category.trim() ? category.trim() : null;
  if (price !== undefined) patch.price = num(price);
  if (duration_min !== undefined) patch.duration_min = num(duration_min);
  if (active !== undefined) patch.active = active;

  const { error } = await supabase.from("services").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/services");
  return { ok: true };
}

export async function deleteService(id) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/services");
  return { ok: true };
}
