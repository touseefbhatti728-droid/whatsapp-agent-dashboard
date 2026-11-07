import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import ConnectSocial from "@/components/ConnectSocial";

export default async function ChannelsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // owners: their business · admins: the customer they are managing
  const biz = await getActiveBusiness(user?.id);
  if (!biz) return <div className="card p-8 text-center text-sm text-muted">No business linked yet.</div>;
  const ready = "fb_page_id" in biz;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Instagram & Messenger</h1>
        <p className="page-sub">Connect your Facebook Page and its Instagram account — the same AI answers DMs, books appointments and hands over to you, all in one inbox.</p>
      </div>
      {!ready ? (
        <div className="card px-5 py-12 text-center">
          <p className="text-sm font-medium text-text">Not switched on yet</p>
          <p className="mt-1 text-sm text-muted">Your provider needs to run a quick database update.</p>
        </div>
      ) : (
        <ConnectSocial
          connected={biz.fb_page_id ? { page: biz.fb_page_name, instagram: biz.ig_username } : null}
          configId={process.env.NEXT_PUBLIC_FB_PAGES_CONFIG_ID || ""}
          appId={process.env.NEXT_PUBLIC_FB_APP_ID || ""}
        />
      )}
    </div>
  );
}
