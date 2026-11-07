import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import IntegrationsHub from "@/components/IntegrationsHub";
import { getActiveBusiness, getIsAdmin } from "@/lib/session";

// Every integration in one place: what it does, whether it's on, a setup guide, and a way to connect.
export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // owners: their business · admins: the customer they are managing
  const b = await getActiveBusiness(user.id);
  if (!b) return <div className="card p-8 text-center text-sm text-muted">No business linked yet.</div>;
  const isAdmin = await getIsAdmin(user.id);
  const paid = b.sub_status === "active";
  const businessPlan = isAdmin || /^business$/i.test(String(b.plan || ""));

  const status = {
    whatsapp: !!(b.meta_phone_number_id && b.meta_access_token),
    widget: !!b.widget_seen_at,
    booking: true,
    wordpress: !!b.widget_seen_at,
    messenger: !!b.fb_page_id,
    instagram: !!b.ig_account_id,
    leadads: !!b.fb_page_id,
    shopify: !!b.shopify_domain,
    calendar: !!b.calendar_id,
    phone: !!b.vapi_assistant_id,
    payments: !!b.payment_link,
    reviews: !!b.google_review_url,
    leadhook: !!b.lead_webhook_key,
    crm: !!b.webhook_url,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Integrations</h1>
        <p className="page-sub">Everything your AI receptionist can connect to — switch each one on here, with a step-by-step guide.</p>
      </div>
      <IntegrationsHub
        businessId={b.id}
        status={status}
        values={{
          calendar_id: b.calendar_id || "",
          payment_link: b.payment_link || "",
          google_review_url: b.google_review_url || "",
          webhook_url: b.webhook_url || "",
          shopify_domain: b.shopify_domain || "",
          fb_page_name: b.fb_page_name || "",
          ig_username: b.ig_username || "",
          widget_origin: b.widget_origin || b.website_url || "",
          voice_number: b.voice_number || "",
        }}
        paid={paid}
        businessPlan={businessPlan}
      />
    </div>
  );
}
