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
  const activeBizId = (await getActiveBusiness(user?.id))?.id ?? "00000000-0000-0000-0000-000000000000"; // no business -> matches nothing

  const { data: businesses } = await supabase.from("businesses").select("id, name, timezone").eq("id", activeBizId);
  const nameById = {};
  (businesses || []).forEach((b) => { nameById[b.id] = b.name; });
  const ids = (businesses || []).map((b) => b.id);

  let bookings = [];
  let services = [];
  let staff = []; // [] also before the staff SQL is run
  if (ids.length > 0) {
    const cols = "id, ref_no, customer_name, customer_phone, service, start_time, business_id, source, notes, created_at";
    const [bk, { data: svc }, { data: team }] = await Promise.all([
      supabase.from("bookings").select(cols + ", staff_id").in("business_id", ids),
      supabase.from("services").select("name").in("business_id", ids).eq("active", true).order("name"),
      supabase.from("team_members").select("id, name").in("business_id", ids).eq("active", true).order("created_at"),
    ]);
    let data = bk.data;
    if (bk.error) data = (await supabase.from("bookings").select(cols).in("business_id", ids)).data;
    else staff = team || [];
    const staffName = Object.fromEntries(staff.map((m) => [m.id, m.name]));
    // Deposit status (phase-3 SQL) and intake form answers for each booking.
    const ids2 = (data || []).map((b) => b.id);
    const { data: dep } = ids2.length ? await supabase.from("bookings").select("id, deposit_status").in("id", ids2) : { data: [] };
    const depositOf = Object.fromEntries((dep || []).map((d) => [d.id, d.deposit_status]));
    const { data: intake } = ids2.length ? await supabase.from("intake_responses").select("booking_id, answers, token, submitted_at").in("booking_id", ids2) : { data: [] };
    const intakeOf = Object.fromEntries((intake || []).map((r) => [r.booking_id, r]));
    bookings = (data || []).map((b) => ({ ...b, businessName: nameById[b.business_id] || "", staffName: staffName[b.staff_id] || null, deposit: depositOf[b.id] || null, intake: intakeOf[b.id] || null }));
    services = (svc || []).map((s) => s.name);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Calendar</h1>
        <p className="page-sub">All your appointments at a glance.</p>
      </div>
      <CalendarView bookings={bookings} showBusiness={ids.length > 1} services={services} staff={staff} canCreate={ids.length > 0} openNew={sp.new === "1"} timezone={businesses?.[0]?.timezone || "Asia/Dubai"} />
    </div>
  );
}
