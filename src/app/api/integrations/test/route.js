import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { id } = await req.json();
  const { data: biz } = await supabase.from("businesses").select("name, webhook_url").eq("id", id).single();
  if (!biz?.webhook_url) return NextResponse.json({ ok: false, error: "No webhook saved yet." });

  const sample = {
    event: "booking.created", business: biz.name || "Your Business", reference: "BK-0000",
    customer_name: "Test Customer", customer_phone: "0000000000", service: "Sample service",
    date: "2026-01-01", time: "12:00", start_time: "2026-01-01T12:00:00+05:00", test: true,
  };
  try {
    const res = await fetch(biz.webhook_url, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sample),
    });
    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Could not reach the webhook URL." });
  }
}
