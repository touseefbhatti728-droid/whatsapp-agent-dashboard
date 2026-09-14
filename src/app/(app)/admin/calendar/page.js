import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CalendarView from "@/components/CalendarView";

export default async function AdminCalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (profile?.is_admin !== true) redirect("/dashboard");

  const { data: businesses } = await supabase.from("businesses").select("id, name");
  const nameById = {};
  (businesses || []).forEach((b) => { nameById[b.id] = b.name; });

  const { data } = await supabase.from("bookings")
    .select("id, ref_no, customer_name, service, start_time, business_id");
  const bookings = (data || []).map((b) => ({ ...b, businessName: nameById[b.business_id] || "—" }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Calendar</h1>
        <p className="page-sub">Every appointment across all clients.</p>
      </div>
      <CalendarView bookings={bookings} showBusiness={true} />
    </div>
  );
}
