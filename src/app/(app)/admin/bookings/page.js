import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookingsTable from "@/components/BookingsTable";

export default async function AllBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (profile?.is_admin !== true) redirect("/dashboard");

  const { data: businesses } = await supabase.from("businesses").select("id, name");
  const nameById = {};
  (businesses || []).forEach((b) => { nameById[b.id] = b.name; });

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, ref_no, customer_name, customer_phone, service, start_time, business_id")
    .order("start_time", { ascending: false });

  const rows = (bookings || []).map((b) => ({ ...b, businessName: nameById[b.business_id] || "—" }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">All bookings</h1>
        <p className="mt-1 text-sm text-muted">Every appointment across all clients.</p>
      </div>
      <BookingsTable bookings={rows} />
    </div>
  );
}
