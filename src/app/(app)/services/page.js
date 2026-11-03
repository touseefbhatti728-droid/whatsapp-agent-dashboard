import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ServicesManager from "@/components/ServicesManager";
import { getActiveBusiness } from "@/lib/session";

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // owners: their business · admins: the customer they are managing
  const activeBizId = (await getActiveBusiness(user?.id))?.id ?? "00000000-0000-0000-0000-000000000000"; // no business -> matches nothing

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", activeBizId)
    .order("created_at", { ascending: true });

  const ids = (businesses || []).map((b) => b.id);
  let services = [];
  if (ids.length) {
    const { data } = await supabase
      .from("services")
      .select("id, business_id, name, category, price, duration_min, active")
      .in("business_id", ids)
      .order("created_at", { ascending: true });
    services = data || [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Services</h1>
        <p className="mt-1 text-sm text-muted">Your services with price and duration. Your AI uses these to answer questions and take bookings.</p>
      </div>

      {(!businesses || businesses.length === 0) ? (
        <div className="card p-8 text-center">
          <p className="text-sm font-medium text-text">No business linked yet</p>
          <p className="mt-1 text-sm text-muted">Your provider will connect your business shortly.</p>
        </div>
      ) : (
        <ServicesManager businesses={businesses} services={services} />
      )}
    </div>
  );
}
