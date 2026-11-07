import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBranding } from "@/lib/branding";
import BrandingForm from "@/components/BrandingForm";

export default async function BrandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (profile?.is_admin !== true) redirect("/dashboard");

  const b = await getBranding();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Branding</h1>
        <p className="mt-1 text-sm text-muted">Change your app name and colour. Applies across the whole dashboard.</p>
      </div>
      <BrandingForm initial={{ app_name: b.app_name, brand_color: b.brand_color }} />
    </div>
  );
}
