import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import { BACKEND_URL } from "@/lib/backend";
import SetupWizard from "@/components/SetupWizard";

export default async function SetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // owners: their business · admins: the customer they are managing
  const biz = await getActiveBusiness(user?.id);
  if (!biz) return <div className="card p-8 text-center text-sm text-muted">No business linked yet.</div>;

  const { count: facts } = await supabase.from("knowledge_items").select("id", { count: "exact", head: true }).eq("business_id", biz.id).eq("type", "document");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Get set up in 3 steps</h1>
        <p className="page-sub">Teach your AI from your website, put it on your site, and connect your channels. Works with WordPress, Wix, Shopify and any other website.</p>
      </div>
      <SetupWizard
        state={{
          website: biz.website_url || "",
          learned: (facts || 0) > 0,
          installedAt: biz.widget_seen_at || null,
          installedOn: biz.widget_origin || null,
          whatsapp: !!biz.meta_phone_number_id,
          page: biz.fb_page_name || null,
          instagram: biz.ig_username || null,
          phone: biz.voice_number || null,
        }}
        snippet={`<script src="${BACKEND_URL}/public/widget.js" data-business="${biz.id}" async></script>`}
        bookingUrl={`https://app.nextreply.io/book/${biz.id}`}
      />
    </div>
  );
}
