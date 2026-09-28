import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeamManager from "@/components/TeamManager";

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name")
    .order("created_at", { ascending: true });

  const ids = (businesses || []).map((b) => b.id);
  let members = [];
  if (ids.length) {
    const { data } = await supabase
      .from("team_members")
      .select("id, business_id, name, role, active")
      .in("business_id", ids)
      .order("created_at", { ascending: true });
    members = data || [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Team</h1>
        <p className="mt-1 text-sm text-muted">Your team members. The AI can mention them when a customer asks for a specific person.</p>
      </div>

      {(!businesses || businesses.length === 0) ? (
        <div className="card p-8 text-center">
          <p className="text-sm font-medium text-text">No business linked yet</p>
          <p className="mt-1 text-sm text-muted">Your provider will connect your business shortly.</p>
        </div>
      ) : (
        <TeamManager businesses={businesses} members={members} />
      )}
    </div>
  );
}
