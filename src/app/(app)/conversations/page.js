import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConversationsView from "@/components/ConversationsView";
import { getActiveBusiness } from "@/lib/session";

export default async function ConversationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // owners: their business · admins: the customer they are managing
  const activeBizId = (await getActiveBusiness(user?.id))?.id ?? "00000000-0000-0000-0000-000000000000"; // no business -> matches nothing

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  const isAdmin = profile?.is_admin === true;

  if (!isAdmin) {
    const { data: myBiz } = await supabase.from("businesses").select("plan").eq("id", activeBizId).order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (myBiz) {
      const { data: pl } = await supabase.from("plans").select("chat_history").eq("name", myBiz.plan).maybeSingle();
      if (pl?.chat_history === false) {
        return (
          <div className="space-y-6">
            <div>
              <h1 className="page-title">Conversations</h1>
              <p className="page-sub">Read every chat your AI receptionist has with customers.</p>
            </div>
            <div className="card p-10 text-center">
              <p className="text-sm font-medium text-text">Conversation history is a Pro feature</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Upgrade your plan to read the full chat history between your AI receptionist and your customers.</p>
              <a href="/billing" className="btn-brand mt-5 inline-flex">View plans</a>
            </div>
          </div>
        );
      }
    }
  }

  const { data: businesses } = await supabase.from("businesses").select("id, name").eq("id", activeBizId);
  const nameById = {};
  (businesses || []).forEach((b) => { nameById[b.id] = b.name; });

  // Map phone -> customer name (from bookings)
  // Only this owner's business, and the newest 2,000 messages (oldest-first broke past 1,000 rows).
  const ids = (businesses || []).map((b) => b.id);
  const scope = ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];
  const [{ data: bookings }, { data: newest }] = await Promise.all([
    supabase.from("bookings").select("customer_phone, customer_name, business_id").in("business_id", scope),
    supabase
      .from("messages")
      .select("business_id, customer_phone, role, content, created_at")
      .in("business_id", scope)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);
  const phoneName = {};
  (bookings || []).forEach((b) => {
    if (b.customer_phone && b.customer_name) phoneName[`${b.business_id}::${b.customer_phone}`] = b.customer_name;
  });
  const messages = (newest || []).reverse();

  // Group into conversations by business + phone
  const map = new Map();
  (messages || []).forEach((m) => {
    const key = `${m.business_id}::${m.customer_phone}`;
    if (!map.has(key)) {
      map.set(key, {
        key, businessId: m.business_id, businessName: nameById[m.business_id] || "—",
        phone: m.customer_phone, name: phoneName[key] || null, messages: [],
      });
    }
    map.get(key).messages.push({ role: m.role, content: m.content, created_at: m.created_at });
  });

  const conversations = Array.from(map.values()).map((c) => {
    const last = c.messages[c.messages.length - 1];
    return { ...c, lastAt: last?.created_at, preview: last?.content || "" };
  }).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Conversations</h1>
        <p className="mt-1 text-sm text-muted">Every chat your AI receptionist has had with customers.</p>
      </div>
      <ConversationsView conversations={conversations} showBusiness={isAdmin} />
    </div>
  );
}
