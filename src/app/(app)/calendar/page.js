import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CalendarView from "@/components/CalendarView";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: businesses } = await supabase.from("businesses").select("id, name");
  const nameById = {};
  (businesses || []).forEach((b) => { nameById[b.id] = b.name; });
  const ids = (businesses || []).map((b) => b.id);

  let bookings = [];
  if (ids.length > 0) {
    const { data } = await supabase.from("bookings")
      .select("id, ref_no, customer_name, service, start_time, business_id")
      .in("business_id", ids);
    bookings = (data || []).map((b) => ({ ...b, businessName: nameById[b.business_id] || "" }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Calendar</h1>
        <p className="page-sub">All your appointments at a glance.</p>
      </div>
      <CalendarView bookings={bookings} showBusiness={ids.length > 1} />
    </div>
  );
}
