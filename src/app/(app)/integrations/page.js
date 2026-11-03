import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import IntegrationsForm from "@/components/IntegrationsForm";
import { getActiveBusiness, getIsAdmin } from "@/lib/session";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // owners: their business · admins: the customer they are managing
  const activeBizId = (await getActiveBusiness(user?.id))?.id ?? -1;

  const { data: businesses } = await supabase
    .from("businesses").select("id, name, webhook_url, plan").eq("id", activeBizId).order("created_at", { ascending: true });
  const biz = businesses?.[0];

  // CRM webhooks are a Business-plan feature (admins always have access).
  const isAdmin = await getIsAdmin(user.id);
  if (!isAdmin && !/^business$/i.test(String(biz?.plan || ""))) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="page-sub">Send every booking to your CRM, Zapier, Make, HubSpot or Google Sheets.</p>
        </div>
        <div className="card p-8 text-center">
          <p className="text-sm font-semibold text-text">Available on the Business plan</p>
          <p className="mt-1 text-sm text-muted">Upgrade to send each new booking to your own tools automatically.</p>
          <a href="/billing" className="btn-brand mt-4 inline-block">See plans</a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Integrations</h1>
        <p className="page-sub">Send your bookings to any CRM or tool via a webhook.</p>
      </div>
      {biz ? (
        <IntegrationsForm businessId={biz.id} initialUrl={biz.webhook_url || ""} />
      ) : (
        <div className="card p-8 text-center text-sm text-muted">No business linked yet.</div>
      )}
    </div>
  );
}
