"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const TYPES = ["promotion", "policy_faq", "stop"];

export async function addKnowledge({ business_id, type, title, content }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!business_id) return { ok: false, error: "No business selected" };
  if (!TYPES.includes(type)) return { ok: false, error: "Invalid type" };
  if (!content || !content.trim()) return { ok: false, error: "Please enter some text" };

  const { error } = await supabase.from("knowledge_items").insert([{
    business_id,
    type,
    title: title && title.trim() ? title.trim() : null,
    content: content.trim(),
  }]);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/knowledge");
  return { ok: true };
}

export async function updateKnowledge({ id, title, content, active }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const patch = {};
  if (title !== undefined) patch.title = title && title.trim() ? title.trim() : null;
  if (content !== undefined) patch.content = content;
  if (active !== undefined) patch.active = active;

  const { error } = await supabase.from("knowledge_items").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/knowledge");
  return { ok: true };
}

export async function deleteKnowledge(id) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("knowledge_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/knowledge");
  return { ok: true };
}
