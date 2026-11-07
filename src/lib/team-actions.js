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

export async function updateTeamMember({ id, name, role, active, availability, services }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const patch = {};
  if (name !== undefined) patch.name = name;
  if (role !== undefined) patch.role = role && role.trim() ? role.trim() : null;
  if (active !== undefined) patch.active = active;
  // Personal hours: same shape as the AI working hours, or null = whenever the business is open.
  if (availability !== undefined) patch.availability = availability && typeof availability === "object" ? availability : null;
  if (services !== undefined) patch.services = Array.isArray(services) ? services.map((s) => String(s).trim()).filter(Boolean).slice(0, 100) : [];

  const { error } = await supabase.from("team_members").update(patch).eq("id", id);
  if (error) return { ok: false, error: /availability|services/.test(error.message) ? "Staff schedules aren't switched on yet — your provider needs to run a quick database update." : error.message };
  revalidatePath("/team");
  revalidatePath("/calendar");
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
