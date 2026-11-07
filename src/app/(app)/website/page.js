import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import { BACKEND_URL } from "@/lib/backend";
import CopyBox from "@/components/CopyBox";

export default async function WebsitePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // owners: their business · admins: the customer they are managing
  const biz = await getActiveBusiness(user?.id);
  if (!biz) {
    return <div className="card p-8 text-center text-sm text-muted">No business linked yet.</div>;
  }

  const bookingUrl = `https://app.nextreply.io/book/${biz.id}`;
  const snippet = `<script src="${BACKEND_URL}/public/widget.js" data-business="${biz.id}" data-color="#6d28d9" async></script>`;
  const live = ["active", "trialing"].includes(biz.sub_status) && biz.status !== "suspended";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Website chat & online booking</h1>
        <p className="page-sub">Put your AI receptionist on your website, and share a booking link anywhere — Instagram bio, Google profile, ads.</p>
      </div>

      {!live && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          These go live when your plan or free trial is active. <a href="/billing" className="font-semibold underline">Go to Billing</a>
        </div>
      )}

      <section className="card p-6">
        <h2 className="text-sm font-semibold text-text">1. Online booking link</h2>
        <p className="mt-1 text-sm text-muted">Customers pick a service, day and free time, then book — no chat needed. Free times follow your opening hours, team size and service lengths, so nothing double-books.</p>
        <CopyBox value={bookingUrl} />
        <a href={bookingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-brand hover:text-brand-dark">Open your booking page ↗</a>
      </section>

      <section className="card p-6">
        <h2 className="text-sm font-semibold text-text">2. Chat widget for your website</h2>
        <p className="mt-1 text-sm text-muted">
          A chat bubble in the corner of your site. It's the same AI as on WhatsApp — it answers questions, books, moves and cancels appointments. Website chats show up in Conversations, and you can reply from there.
        </p>
        <p className="mt-4 text-xs font-medium text-text">Paste this just before <code className="rounded bg-canvas px-1">&lt;/body&gt;</code> on every page (WordPress: a "header &amp; footer scripts" plugin; Wix/Squarespace: Custom code):</p>
        <CopyBox value={snippet} multiline />
        <p className="mt-3 text-xs text-muted">Change <code className="rounded bg-canvas px-1">data-color</code> to your brand colour. Add <code className="rounded bg-canvas px-1">data-position="left"</code> to show it on the left.</p>
      </section>
    </div>
  );
}
