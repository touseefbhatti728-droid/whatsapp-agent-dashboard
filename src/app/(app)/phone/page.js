import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import VoiceLine from "@/components/VoiceLine";
import { voicePlanByKey, voiceRemaining } from "@/lib/voice-plans";

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
      {biz.sub_status !== "active" && !biz.vapi_assistant_id ? (
        <div className="card px-5 py-10 text-center">
          <p className="text-sm font-semibold text-text">Available on paid plans</p>
          <p className="mt-1 text-sm text-muted">Phone calls are charged per minute, so the AI phone line switches on once you're on a paid plan.</p>
          <a href="/billing" className="btn-brand mt-4 inline-block">Go to Billing</a>
        </div>
      ) : "voice_plan" in biz && !biz.voice_plan && !biz.vapi_assistant_id ? (
        <div className="card px-5 py-10 text-center">
          <p className="text-sm font-semibold text-text">Pick a voice plan</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">Choose how many call minutes you need each month — 120 minutes for $35, 250 for $70 or 500 for $120. It's added to your current plan, one bill.</p>
          <a href="/billing" className="btn-brand mt-4 inline-block">Choose a voice plan</a>
        </div>
      ) : !("voice_token" in biz) ? (
        <div className="card px-5 py-12 text-center">
          <p className="text-sm font-medium text-text">Not switched on yet</p>
          <p className="mt-1 text-sm text-muted">Your provider needs to run a quick database update.</p>
        </div>
      ) : (
        <>
        {biz.voice_plan && (
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold text-text">{voicePlanByKey(biz.voice_plan)?.name || "Voice plan"} · {Math.round(voiceRemaining(biz))} minutes left</p>
              <p className="text-xs text-muted">{Math.round(Number(biz.voice_minutes_used) || 0)} of {biz.voice_minutes_included} plan minutes used this month{Number(biz.voice_addon_minutes) > 0 ? ` · +${Math.round(biz.voice_addon_minutes)} extra` : ""}</p>
            </div>
            <a href="/billing" className="btn-ghost text-sm">More minutes</a>
          </div>
        )}
        <VoiceLine number={biz.voice_number || ""} assistantId={biz.vapi_assistant_id || ""} serverReady={!!(process.env.VAPI_PRIVATE_KEY || process.env.VAPI_API_KEY)} />
        </>
      )}
    </div>
  );
}
