import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBranding } from "@/lib/branding";
import OnboardingWizard from "@/components/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cols = "name, location, services, hours, faq, knowledge, calendar_id, whatsapp_number, meta_phone_number_id, sub_status";
  let { data: biz } = await supabase
    .from("businesses")
    .select(cols)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Accounts confirmed through an old email link may have no business yet —
  // create it now so "Connect WhatsApp" in step 5 has a row to save to.
  if (!biz) {
    const meta = user.user_metadata || {};
    const { data: created } = await supabase
      .from("businesses")
      .insert({ owner_id: user.id, owner_email: user.email || null, name: meta.business_name || meta.full_name || "", status: "active" })
      .select(cols)
      .single();
    biz = created;
  }

  const branding = await getBranding();

  return <OnboardingWizard initial={biz || {}} appName={branding.app_name} />;
}