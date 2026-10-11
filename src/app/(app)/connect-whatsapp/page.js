import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConnectWhatsApp from "@/components/ConnectWhatsApp";

export default async function ConnectWhatsAppPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: biz } = await supabase
    .from("businesses")
    .select("whatsapp_number")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Connect WhatsApp</h1>
        <p className="page-sub">Apna WhatsApp Business number automatically connect karein — koi app delete kiye bina.</p>
      </div>
      <ConnectWhatsApp connectedNumber={biz?.whatsapp_number || null} />
    </div>
  );
}
