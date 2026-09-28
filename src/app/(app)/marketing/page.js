import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CampaignsManager from "@/components/CampaignsManager";

export default async function MarketingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name")
    .order("created_at", { ascending: true });

  const ids = (businesses || []).map((b) => b.id);
  let campaigns = [];
  if (ids.length) {
    const { data } = await supabase
      .from("campaigns")
      .select("id, business_id, name, category, trigger_type, offset_minutes, message, active")
      .in("business_id", ids)
      .order("created_at", { ascending: true });
    campaigns = data || [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Marketing Campaigns</h1>
        <p className="mt-1 text-sm text-muted">Reminders, client reactivation and follow-ups — sent automatically on WhatsApp.</p>
      </div>

      <div className="card border-brand/30 bg-brand-tint/30 p-4 text-sm text-text">
        <b>Before you switch a campaign on:</b> WhatsApp requires Meta-approved message templates to send these automatic messages to customers. Build and edit them here, then turn each one on once your templates are approved.
      </div>

      {(!businesses || businesses.length === 0) ? (
        <div className="card p-8 text-center">
          <p className="text-sm font-medium text-text">No business linked yet</p>
        </div>
      ) : (
        <CampaignsManager businesses={businesses} campaigns={campaigns} />
      )}
    </div>
  );
}
