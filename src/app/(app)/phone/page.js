import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import VoiceLine from "@/components/VoiceLine";

export default async function PhonePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // owners: their business · admins: the customer they are managing
  const biz = await getActiveBusiness(user?.id);
  if (!biz) return <div className="card p-8 text-center text-sm text-muted">No business linked yet.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Phone receptionist</h1>
        <p className="page-sub">An AI that answers phone calls like your WhatsApp AI — it books, moves and cancels appointments and sends you a summary of every call.</p>
      </div>
      {!("voice_token" in biz) ? (
        <div className="card px-5 py-12 text-center">
          <p className="text-sm font-medium text-text">Not switched on yet</p>
          <p className="mt-1 text-sm text-muted">Your provider needs to run a quick database update.</p>
        </div>
      ) : (
        <VoiceLine number={biz.voice_number || ""} assistantId={biz.vapi_assistant_id || ""} serverReady={!!process.env.VAPI_API_KEY} />
      )}
    </div>
  );
}
