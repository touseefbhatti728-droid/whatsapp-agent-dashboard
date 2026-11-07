import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import MembershipsView from "@/components/MembershipsView";

export default async function MembershipsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // owners: their business · admins: the customer they are managing
  const biz = await getActiveBusiness(user?.id);
  if (!biz) return <div className="card p-8 text-center text-sm text-muted">No business linked yet.</div>;
  const { data, error } = await supabase.from("memberships").select("*").eq("business_id", biz.id).order("end_date", { ascending: true }).limit(500);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Memberships</h1>
        <p className="page-sub">Gym, spa or clinic plans. Members get a WhatsApp reminder 7 days and 1 day before their plan ends, and you get an alert to follow up.</p>
      </div>
      {error ? (
        <div className="card px-5 py-12 text-center">
          <p className="text-sm font-medium text-text">Memberships aren't switched on yet</p>
          <p className="mt-1 text-sm text-muted">Your provider needs to run a quick database update.</p>
        </div>
      ) : <MembershipsView rows={data || []} />}
    </div>
  );
}
