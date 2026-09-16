import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AssistantChat from "@/components/AssistantChat";

export default async function AssistantPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (profile?.is_admin !== true) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Assistant</h1>
        <p className="mt-1 text-sm text-muted">Ask about your data, or tell it to make a change — you confirm before anything happens.</p>
      </div>
      <AssistantChat />
    </div>
  );
}
