import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import IntegrationsForm from "@/components/IntegrationsForm";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: businesses } = await supabase
    .from("businesses").select("id, name, webhook_url").order("created_at", { ascending: true });
  const biz = businesses?.[0];

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
