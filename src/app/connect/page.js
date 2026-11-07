import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import PublicShell from "@/components/PublicShell";
import ConnectSite from "@/components/ConnectSite";

export const metadata = { title: "Connect your website", robots: { index: false } };
export const maxDuration = 60;

// Opened by the WordPress plugin's "Connect" button:
// /connect?platform=wordpress&site=<home url>&return=<wp-admin url>&state=<nonce>
export default async function ConnectPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const here = `/connect?${new URLSearchParams(Object.entries(sp || {}).map(([k, v]) => [k, String(v)])).toString()}`;
    redirect(`/login?next=${encodeURIComponent(here)}`);
  }
  const biz = await getActiveBusiness(user.id);

  let ret = null;
  try { ret = new URL(String(sp?.return || "")); } catch (_) {}
  const site = String(sp?.site || "");
  const valid = ret && /^https?:$/.test(ret.protocol) && ret.pathname.includes("/wp-admin/") && /^[a-zA-Z0-9_-]{6,64}$/.test(String(sp?.state || ""));

  if (!biz) return <PublicShell title="Almost there"><p className="text-center text-sm text-muted">Finish setting up your NextReply account first, then click Connect again in WordPress.</p></PublicShell>;
  if (!valid) return <PublicShell title="Link not valid"><p className="text-center text-sm text-muted">Open NextReply in your WordPress admin and click Connect again.</p></PublicShell>;

  return (
    <PublicShell title="Connect your website" sub={site ? site.replace(/^https?:\/\//, "") : undefined}>
      <ConnectSite businessName={biz.name} site={site} returnUrl={ret.toString()} state={String(sp.state)} />
    </PublicShell>
  );
}
