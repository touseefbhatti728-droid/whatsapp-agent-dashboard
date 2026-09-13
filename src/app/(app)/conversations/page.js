import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConversationsView from "@/components/ConversationsView";

export default async function ConversationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  const isAdmin = profile?.is_admin === true;

  const { data: businesses } = await supabase.from("businesses").select("id, name");
  const nameById = {};
  (businesses || []).forEach((b) => { nameById[b.id] = b.name; });

  // Map phone -> customer name (from bookings)
  const { data: bookings } = await supabase.from("bookings").select("customer_phone, customer_name, business_id");
  const phoneName = {};
  (bookings || []).forEach((b) => {
    if (b.customer_phone && b.customer_name) phoneName[`${b.business_id}::${b.customer_phone}`] = b.customer_name;
  });

  const { data: messages } = await supabase
    .from("messages")
    .select("business_id, customer_phone, role, content, created_at")
    .order("created_at", { ascending: true });

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
