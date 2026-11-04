import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import WaitlistList from "@/components/WaitlistList";

export default async function WaitlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // owners: their business · admins: the customer they are managing
  const biz = await getActiveBusiness(user?.id);
  const activeBizId = biz?.id ?? "00000000-0000-0000-0000-000000000000"; // no business -> matches nothing

  const tz = biz?.timezone || "Asia/Dubai";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  const { data, error } = await supabase.from("waitlist")
    .select("id, created_at, customer_name, customer_phone, service, wanted_date, wanted_time, status, offered_at")
    .eq("business_id", activeBizId).in("status", ["waiting", "offered"]).gte("wanted_date", today)
    .order("wanted_date", { ascending: true }).order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Waitlist</h1>
        <p className="page-sub">Customers who wanted a time that was full. When a booking that day is cancelled or moved, your AI offers the slot to the first person waiting.</p>
      </div>

      {error ? (
        <div className="card px-5 py-12 text-center">
          <p className="text-sm font-medium text-text">The waitlist isn't switched on yet</p>
          <p className="mt-1 text-sm text-muted">Your provider needs to run a quick database update. Nothing is lost in the meantime — your AI tells customers the team will message them.</p>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="card px-5 py-16 text-center">
          <p className="text-sm font-medium text-text">Nobody is waiting</p>
          <p className="mt-1 text-sm text-muted">When a customer wants a full slot, your AI offers to put them here.</p>
        </div>
      ) : (
        <WaitlistList entries={data} />
      )}
    </div>
  );
}
