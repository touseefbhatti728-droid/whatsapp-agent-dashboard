import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import QuotesView from "@/components/QuotesView";

export default async function QuotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // owners: their business · admins: the customer they are managing
  const biz = await getActiveBusiness(user?.id);
  if (!biz) return <div className="card p-8 text-center text-sm text-muted">No business linked yet.</div>;

  const { data: quotes, error } = await supabase.from("quotes").select("*").eq("business_id", biz.id).order("created_at", { ascending: false }).limit(200);
  const { data: svc } = await supabase.from("services").select("name, price").eq("business_id", biz.id).eq("active", true).order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Quotes & invoices</h1>
        <p className="page-sub">Send a treatment quote or an invoice as a link on WhatsApp. Customers can accept quotes and pay online; unpaid invoices get automatic reminders.</p>
      </div>
      {error ? (
        <div className="card px-5 py-12 text-center">
          <p className="text-sm font-medium text-text">Quotes aren't switched on yet</p>
          <p className="mt-1 text-sm text-muted">Your provider needs to run a quick database update.</p>
        </div>
      ) : (
        <QuotesView quotes={quotes || []} services={svc || []} currency={biz.currency || "AED"} defaultLink={biz.payment_link || ""} />
      )}
    </div>
  );
}
