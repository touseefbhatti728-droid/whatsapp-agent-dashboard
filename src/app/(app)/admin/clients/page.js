import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientSearch from "@/components/ClientSearch";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (profile?.is_admin !== true) redirect("/dashboard");

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, location, whatsapp_number, owner_email, status, created_at")
    .order("created_at", { ascending: false });

  const { data: bookings } = await supabase.from("bookings").select("business_id");
  const counts = {};
  (bookings || []).forEach((b) => { counts[b.business_id] = (counts[b.business_id] || 0) + 1; });

  const clients = (businesses || []).map((b) => ({ ...b, count: counts[b.id] || 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Clients</h1>
        <p className="mt-1 text-sm text-muted">{clients.length} businesses on the platform.</p>
      </div>
      <ClientSearch clients={clients} />
    </div>
  );
}
