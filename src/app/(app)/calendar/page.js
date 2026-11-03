import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CalendarView from "@/components/CalendarView";
import { getActiveBusiness } from "@/lib/session";

export default async function CalendarPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // owners: their business · admins: the customer they are managing
  const activeBizId = (await getActiveBusiness(user?.id))?.id ?? -1;

  const { data: businesses } = await supabase.from("businesses").select("id, name, timezone").eq("id", activeBizId);
  const nameById = {};
  (businesses || []).forEach((b) => { nameById[b.id] = b.name; });
  const ids = (businesses || []).map((b) => b.id);

  let bookings = [];
  let services = [];
  if (ids.length > 0) {
    const [{ data }, { data: svc }] = await Promise.all([
      supabase.from("bookings")
        .select("id, ref_no, customer_name, customer_phone, service, start_time, business_id, source, notes, created_at")
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
      <CalendarView bookings={bookings} showBusiness={ids.length > 1} services={services} canCreate={ids.length > 0} openNew={sp.new === "1"} timezone={businesses?.[0]?.timezone || "Asia/Dubai"} />
    </div>
  );
}
