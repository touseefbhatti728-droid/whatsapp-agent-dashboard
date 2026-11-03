import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import { checkWebhookUrl } from "@/lib/safe-url";

export const runtime = "nodejs";

// Sends a sample "booking.created" event to the saved webhook so the owner can see it arrive.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const biz = await getActiveBusiness(user.id);
  if (!biz?.webhook_url) return NextResponse.json({ ok: false, error: "Save a webhook URL first." });

  const check = await checkWebhookUrl(biz.webhook_url);
  if (!check.ok) return NextResponse.json(check);

  const sample = {
    event: "booking.created", business: biz.name || "Your Business", reference: "BK-0000",
    customer_name: "Test Customer", customer_phone: "971500000000", service: "Sample service",
    date: "2026-01-01", time: "12:00", start_time: "2026-01-01T08:00:00.000Z", test: true,
  };
  try {
    const res = await fetch(check.url, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "NextReply-Webhook/1.0" },
      body: JSON.stringify(sample),
      redirect: "manual",                 // don't follow redirects to other hosts
      signal: AbortSignal.timeout(8000),  // never hang the page
    });
    if (res.status >= 300 && res.status < 400) {
      return NextResponse.json({ ok: false, status: res.status, error: "The URL redirected. Use the final https URL instead." });
    }
    return NextResponse.json({ ok: res.ok, status: res.status, error: res.ok ? undefined : `Your tool answered ${res.status}.` });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.name === "TimeoutError" ? "The webhook didn't answer within 8 seconds." : "Could not reach the webhook URL." });
  }
}
