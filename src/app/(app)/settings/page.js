import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "@/components/SettingsForm";
import { getActiveBusiness } from "@/lib/session";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // owners: their business · admins: the customer they are managing
  const activeBizId = (await getActiveBusiness(user?.id))?.id ?? "00000000-0000-0000-0000-000000000000"; // no business -> matches nothing

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, location, hours, services, booking, faq, whatsapp_number, meta_phone_number_id, calendar_id")
    .eq("id", activeBizId)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Settings</h1>
        <p className="mt-1 text-sm text-muted">Update your business info and what your AI receptionist knows.</p>
      </div>

      {(!businesses || businesses.length === 0) ? (
        <div className="card p-8 text-center">
          <p className="text-sm font-medium text-text">No business linked yet</p>
          <p className="mt-1 text-sm text-muted">Your provider will connect your business shortly.</p>
        </div>
      ) : (
        <SettingsForm businesses={businesses} />
      )}
    </div>
  );
}
