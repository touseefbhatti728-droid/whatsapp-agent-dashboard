"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import { INDUSTRIES } from "@/lib/industry-templates";

// Adds the industry's FAQs, lead questions, intake form and example services —
// only where the business hasn't set its own yet. Nothing is deleted.
export async function applyIndustryTemplate(key) {
  const t = INDUSTRIES[key];
  if (!t) return { ok: false, error: "Unknown industry." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const biz = await getActiveBusiness(user.id);
  if (!biz) return { ok: false, error: "No business found for this account." };

  const added = { faqs: 0, services: 0, intake: false, questions: false };
  const { data: existing } = await supabase.from("knowledge_items").select("title").eq("business_id", biz.id);
  const have = new Set((existing || []).map((k) => String(k.title || "").toLowerCase()));
  const faqRows = t.faqs.filter(([q]) => !have.has(q.toLowerCase())).map(([title, content]) => ({ business_id: biz.id, type: "policy_faq", title, content }));
  if (faqRows.length) { const { error } = await supabase.from("knowledge_items").insert(faqRows); if (!error) added.faqs = faqRows.length; }

  const { count } = await supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", biz.id);
  if (!count) {
    const { error } = await supabase.from("services").insert(t.services.map(([name, duration_min]) => ({ business_id: biz.id, name, duration_min, active: true })));
    if (!error) added.services = t.services.length;
  }

  const patch = { industry: key };
  if (!biz.lead_questions) { patch.lead_questions = t.leadQuestions; added.questions = true; }
  if (t.intake.length && !(Array.isArray(biz.intake_form) && biz.intake_form.length)) { patch.intake_form = t.intake; added.intake = true; }
  const { error: e } = await supabase.from("businesses").update(patch).eq("id", biz.id);
  if (e && /industry|intake_form|lead_questions/.test(e.message)) {
    // Columns from later SQL files may be missing — keep what worked.
    delete patch.industry; delete patch.intake_form; added.intake = false;
    if (Object.keys(patch).length) await supabase.from("businesses").update(patch).eq("id", biz.id);
  }
  ["/knowledge", "/services", "/leads", "/followups"].forEach((p) => revalidatePath(p));
  return { ok: true, added };
}
