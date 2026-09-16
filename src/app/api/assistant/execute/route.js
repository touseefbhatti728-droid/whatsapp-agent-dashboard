import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
const ALLOWED = ["name", "location", "hours", "services", "booking", "faq", "calendar_id"];

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, text: "Not signed in." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (profile?.is_admin !== true) return NextResponse.json({ ok: false, text: "Admins only." }, { status: 403 });

  const { proposal } = await req.json();
  if (!proposal || !proposal.businessId || !proposal.action)
    return NextResponse.json({ ok: false, text: "Invalid action." });

  const { action, businessId, clientName, changes } = proposal;

  if (action === "update_branding") {
    const clean = {};
    if (typeof changes?.app_name === "string" && changes.app_name.trim()) clean.app_name = changes.app_name.trim().slice(0, 40);
    if (typeof changes?.brand_color === "string" && /^#[0-9a-fA-F]{6}$/.test(changes.brand_color)) clean.brand_color = changes.brand_color;
    if (Object.keys(clean).length === 0) return NextResponse.json({ ok: false, text: "No valid branding changes." });
    const { error } = await supabase.from("settings").update(clean).eq("id", 1);
    revalidatePath("/", "layout");
    if (error) return NextResponse.json({ ok: false, text: "Could not update branding: " + error.message });
    return NextResponse.json({ ok: true, text: `Done — updated ${Object.keys(clean).join(", ")}. Refresh to see it everywhere.` });
  }

  if (action === "suspend" || action === "activate") {
    const status = action === "suspend" ? "suspended" : "active";
    const { error } = await supabase.from("businesses").update({ status }).eq("id", businessId);
    if (error) return NextResponse.json({ ok: false, text: "Could not update: " + error.message });
    return NextResponse.json({ ok: true, text: `Done — ${clientName} is now ${status}.` });
  }

  if (action === "set_subscription") {
    const STATUSES = ["trialing", "active", "past_due", "cancelled"];
    const clean = {};
    if (typeof changes?.plan === "string" && changes.plan) clean.plan = changes.plan;
    if (STATUSES.includes(changes?.sub_status)) clean.sub_status = changes.sub_status;
    if (Object.keys(clean).length === 0) return NextResponse.json({ ok: false, text: "No valid subscription changes." });
    const { error } = await supabase.from("businesses").update(clean).eq("id", businessId);
    if (error) return NextResponse.json({ ok: false, text: "Could not update: " + error.message });
    return NextResponse.json({ ok: true, text: `Done — updated subscription for ${clientName}.` });
  }

  if (action === "update_info") {
    const clean = {};
    Object.entries(changes || {}).forEach(([k, v]) => { if (ALLOWED.includes(k)) clean[k] = v; });
    if (Object.keys(clean).length === 0) return NextResponse.json({ ok: false, text: "No valid fields to update." });
    const { error } = await supabase.from("businesses").update(clean).eq("id", businessId);
    if (error) return NextResponse.json({ ok: false, text: "Could not update: " + error.message });
    return NextResponse.json({ ok: true, text: `Done — updated ${Object.keys(clean).join(", ")} for ${clientName}.` });
  }

  return NextResponse.json({ ok: false, text: "Unknown action." });
}
