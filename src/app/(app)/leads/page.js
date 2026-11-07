import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import { BACKEND_URL } from "@/lib/backend";
import LeadsView from "@/components/LeadsView";

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // owners: their business · admins: the customer they are managing
  const biz = await getActiveBusiness(user?.id);
  if (!biz) return <div className="card p-8 text-center text-sm text-muted">No business linked yet.</div>;

  const { data: leads, error } = await supabase.from("leads")
    .select("id, created_at, name, phone, email, source, campaign, interest, budget, timeline, notes, score, stage, last_contact_at")
    .eq("business_id", biz.id).order("created_at", { ascending: false }).limit(500);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Leads</h1>
        <p className="page-sub">Everyone who contacted you, how ready they are to buy, and where they came from. Your AI fills this in while it chats.</p>
      </div>
      {error ? (
        <div className="card px-5 py-12 text-center">
          <p className="text-sm font-medium text-text">Leads aren't switched on yet</p>
          <p className="mt-1 text-sm text-muted">Your provider needs to run a quick database update.</p>
        </div>
      ) : (
        <LeadsView
          leads={leads || []}
          settings={{
            lead_questions: biz.lead_questions || "",
            lead_template: biz.lead_template || "",
            lead_template_lang: biz.lead_template_lang || "en",
            key: biz.lead_webhook_key || "",
            webhookUrl: `${BACKEND_URL}/public/${biz.id}/lead`,
            whatsappConnected: !!biz.meta_phone_number_id,
          }}
        />
      )}
    </div>
  );
}
