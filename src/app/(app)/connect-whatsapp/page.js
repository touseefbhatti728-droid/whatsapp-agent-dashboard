import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConnectWhatsApp from "@/components/ConnectWhatsApp";
import WhatsAppSetupGuide from "@/components/WhatsAppSetupGuide";

export default async function ConnectWhatsAppPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: biz } = await supabase
    .from("businesses")
    .select("whatsapp_number, meta_phone_number_id, sub_status")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Connect WhatsApp</h1>
        <p className="page-sub">Connect the WhatsApp number your customers already message. Your AI receptionist starts replying right away.</p>
      </div>
      {/* "Connected" only when Meta's number id is saved — a typed number alone can't send. */}
      <ConnectWhatsApp
        connectedNumber={biz?.meta_phone_number_id ? (biz?.whatsapp_number || "connected") : null}
        aiOn={["active", "trialing"].includes(biz?.sub_status)}
      />
      <WhatsAppSetupGuide />
    </div>
  );
}
