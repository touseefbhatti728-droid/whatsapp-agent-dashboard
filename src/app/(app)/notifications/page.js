import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationSettings from "@/components/NotificationSettings";
import { DEFAULT_PREFS } from "@/lib/notify";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: biz } = await supabase
    .from("businesses")
    .select("id, notify_prefs")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: items } = await supabase
    .from("notifications")
    .select("id, type, title, body, url, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const prefs = { ...DEFAULT_PREFS, ...(biz?.notify_prefs || {}) };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Notifications</h1>
        <p className="page-sub">Choose what NextReply alerts you about, and where.</p>
      </div>
      <NotificationSettings hasBusiness={!!biz} initialPrefs={prefs} initialItems={items || []} />
    </div>
  );
}
