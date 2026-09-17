import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBranding } from "@/lib/branding";
import OnboardingWizard from "@/components/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: biz } = await supabase
    .from("businesses")
    .select("name, location, services, hours, faq, knowledge, calendar_id, whatsapp_number")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const branding = await getBranding();

  return <OnboardingWizard initial={biz || {}} appName={branding.app_name} />;
}