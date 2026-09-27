import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AiFrontDeskForm from "@/components/AiFrontDeskForm";

export default async function AiFrontDeskPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, whatsapp_number, assistant_name, primary_language, tone, reply_length, first_greeting, final_message, use_formal, use_emoji, ai_hours_enabled, ai_hours, after_hours_message, timezone, handover_pause_minutes, handover_rules, handover_notify")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">AI front desk</h1>
        <p className="mt-1 text-sm text-muted">Shape how your AI receptionist introduces itself, when it replies, and when it hands over to a human.</p>
      </div>

      {(!businesses || businesses.length === 0) ? (
        <div className="card p-8 text-center">
          <p className="text-sm font-medium text-text">No business linked yet</p>
          <p className="mt-1 text-sm text-muted">Your provider will connect your business shortly.</p>
        </div>
      ) : (
        <AiFrontDeskForm businesses={businesses} />
      )}
    </div>
  );
}
