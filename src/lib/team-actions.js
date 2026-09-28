"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addTeamMember({ business_id, name, role }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!business_id) return { ok: false, error: "No business selected" };
  if (!name || !name.trim()) return { ok: false, error: "Name is required" };

  const { error } = await supabase.from("team_members").insert([{
    business_id,
    name: name.trim(),
    role: role && role.trim() ? role.trim() : null,
  }]);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/team");
  return { ok: true };
}

export async function updateTeamMember({ id, name, role, active }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const patch = {};
  if (name !== undefined) patch.name = name;
  if (role !== undefined) patch.role = role && role.trim() ? role.trim() : null;
  if (active !== undefined) patch.active = active;

  const { error } = await supabase.from("team_members").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/team");
  return { ok: true };
}

export async function deleteTeamMember(id) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/team");
  return { ok: true };
}
