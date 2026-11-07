import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import FollowupsForm from "@/components/FollowupsForm";

export default async function FollowupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // owners: their business · admins: the customer they are managing
  const biz = await getActiveBusiness(user?.id);
  if (!biz) return <div className="card p-8 text-center text-sm text-muted">No business linked yet.</div>;
  const ready = "deposit_required" in biz; // the phase-3 SQL adds these columns

  // Latest feedback for the results card.
  let feedback = [];
  if (ready) {
    const { data } = await supabase.from("feedback").select("customer_name, service, staff_name, rating, comment, answered_at")
      .eq("business_id", biz.id).not("rating", "is", null).order("answered_at", { ascending: false }).limit(20);
    feedback = data || [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Payments & follow-ups</h1>
        <p className="page-sub">Take deposits, ask for feedback after visits, reward loyal customers and collect details before appointments — all automatic.</p>
      </div>
      {!ready ? (
        <div className="card px-5 py-12 text-center">
          <p className="text-sm font-medium text-text">These tools aren't switched on yet</p>
          <p className="mt-1 text-sm text-muted">Your provider needs to run a quick database update.</p>
        </div>
      ) : (
        <FollowupsForm
          biz={{
            payment_link: biz.payment_link || "", payment_instructions: biz.payment_instructions || "",
            deposit_required: !!biz.deposit_required, deposit_amount: biz.deposit_amount || "", currency: biz.currency || "AED",
            notify_template: biz.notify_template || "", notify_template_lang: biz.notify_template_lang || "en",
            feedback_enabled: !!biz.feedback_enabled, feedback_delay_hours: biz.feedback_delay_hours || 3,
            loyalty_enabled: !!biz.loyalty_enabled, loyalty_visits: biz.loyalty_visits || 5, loyalty_reward: biz.loyalty_reward || "",
            intake_form: Array.isArray(biz.intake_form) ? biz.intake_form : [],
            whatsappConnected: !!biz.meta_phone_number_id,
          }}
          feedback={feedback}
        />
      )}
    </div>
  );
}
