import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PlansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (profile?.is_admin !== true) redirect("/dashboard");

  const { data: plans } = await supabase.from("plans").select("*").order("sort");
  const { data: bs } = await supabase.from("businesses").select("plan");
  const countOn = (name) => (bs || []).filter((b) => b.plan === name).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Plans</h1>
        <p className="page-sub">Your subscription plans and their limits. Assign them to clients from a client's detail page.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {(plans || []).map((p) => (
          <div key={p.id} className="card p-5">
            <p className="font-semibold text-text">{p.name}</p>
            <p className="mt-2 text-2xl font-bold text-text">${p.price}<span className="text-sm font-normal text-muted">/{p.interval}</span></p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              <li className="flex gap-2"><span className="text-brand">✓</span>{p.monthly_booking_limit == null ? "Unlimited bookings / month" : `${p.monthly_booking_limit} bookings / month`}</li>
              <li className="flex gap-2"><span className={p.chat_history ? "text-brand" : "text-muted/50"}>{p.chat_history ? "✓" : "✗"}</span>Conversation history</li>
              {p.features && <li className="flex gap-2"><span className="text-brand">✓</span>{p.features}</li>}
            </ul>
            <p className="mt-3 text-xs text-muted">{countOn(p.name)} client{countOn(p.name) === 1 ? "" : "s"} on this plan</p>
          </div>
        ))}
      </div>
    </div>
  );
}
