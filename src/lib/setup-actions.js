"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import { importFromWebsite } from "@/lib/knowledge-import-actions";

// Saves the business's website and teaches the AI from it (once — if no website facts yet).
// Used by the WordPress plugin's Connect page and the Setup wizard.
export async function linkWebsite(siteUrl) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const biz = await getActiveBusiness(user.id);
  if (!biz) return { ok: false, error: "No business found for this account." };

  let site = String(siteUrl || "").trim();
  if (site && !/^https?:\/\//i.test(site)) site = "https://" + site;
  let learned = false, note = "";
  if (site) {
    await supabase.from("businesses").update({ website_url: site.slice(0, 300) }).eq("id", biz.id).then(() => {}, () => {});
    const { count } = await supabase.from("knowledge_items").select("id", { count: "exact", head: true }).eq("business_id", biz.id).eq("type", "document");
    if (!count) {
      const r = await importFromWebsite(site).catch((e) => ({ ok: false, error: e.message }));
      learned = !!r?.ok;
      if (!r?.ok) note = r?.error || "";
    }
  }
  revalidatePath("/setup");
  return { ok: true, businessId: biz.id, learned, note };
}
