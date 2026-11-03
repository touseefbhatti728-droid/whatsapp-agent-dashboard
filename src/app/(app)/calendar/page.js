import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CalendarView from "@/components/CalendarView";

export default async function CalendarPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: businesses } = await supabase.from("businesses").select("id, name").eq("owner_id", user.id);
  const nameById = {};
  (businesses || []).forEach((b) => { nameById[b.id] = b.name; });
  const ids = (businesses || []).map((b) => b.id);

  let bookings = [];
  let services = [];
  if (ids.length > 0) {
    const [{ data }, { data: svc }] = await Promise.all([
      supabase.from("bookings")
        .select("id, ref_no, customer_name, customer_phone, service, start_time, business_id, source")
        .in("business_id", ids),
      supabase.from("services").select("name").in("business_id", ids).eq("active", true).order("name"),
    ]);
    bookings = (data || []).map((b) => ({ ...b, businessName: nameById[b.business_id] || "" }));
    services = (svc || []).map((s) => s.name);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Calendar</h1>
        <p className="page-sub">All your appointments at a glance.</p>
      </div>
      <CalendarView bookings={bookings} showBusiness={ids.length > 1} services={services} canCreate={ids.length > 0} openNew={sp.new === "1"} />
    </div>
  );
}
