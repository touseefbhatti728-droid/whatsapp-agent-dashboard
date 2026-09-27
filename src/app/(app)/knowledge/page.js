import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import KnowledgeManager from "@/components/KnowledgeManager";

export default async function KnowledgePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name")
    .order("created_at", { ascending: true });

  const ids = (businesses || []).map((b) => b.id);
  let items = [];
  if (ids.length) {
    const { data } = await supabase
      .from("knowledge_items")
      .select("id, business_id, type, title, content, active")
      .in("business_id", ids)
      .order("created_at", { ascending: true });
    items = data || [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Knowledge</h1>
        <p className="mt-1 text-sm text-muted">One source of truth for your AI. Add promotions, policies and things it must never do.</p>
      </div>

      {(!businesses || businesses.length === 0) ? (
        <div className="card p-8 text-center">
          <p className="text-sm font-medium text-text">No business linked yet</p>
          <p className="mt-1 text-sm text-muted">Your provider will connect your business shortly.</p>
        </div>
      ) : (
        <KnowledgeManager businesses={businesses} items={items} />
      )}
    </div>
  );
}
