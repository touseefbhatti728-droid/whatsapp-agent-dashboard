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
        <h1 className="page-title">AI Assistant</h1>
        <p className="page-sub">Your command center: ask anything about the platform or the web, or tell it what to change. You confirm every change.</p>
      </div>
      <AssistantChat />
    </div>
  );
}
