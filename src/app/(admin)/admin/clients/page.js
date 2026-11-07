import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientSearch from "@/components/ClientSearch";

export default async function ClientsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (profile?.is_admin !== true) redirect("/dashboard");

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, location, whatsapp_number, meta_phone_number_id, owner_email, status, plan, sub_status, created_at, stripe_customer_id")
    .order("created_at", { ascending: false });

  const { data: bookings } = await supabase.from("bookings").select("business_id");
  const counts = {};
  (bookings || []).forEach((b) => { counts[b.business_id] = (counts[b.business_id] || 0) + 1; });

  // Never send the Meta id itself to the browser — only whether WhatsApp is really connected.
  const clients = (businesses || []).map(({ meta_phone_number_id, stripe_customer_id, ...b }) => ({ ...b, connected: !!meta_phone_number_id, hasStripe: !!stripe_customer_id, count: counts[b.id] || 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Customers</h1>
        <p className="page-sub">{clients.length} businesses that use NextReply. Their own customers are their clients.</p>
      </div>
      <ClientSearch clients={clients} initialQ={String(sp.q || "")} initialFilter={String(sp.f || "all")} />
    </div>
  );
}