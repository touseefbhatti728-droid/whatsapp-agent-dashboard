import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/admin-db";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

// Fields the assistant may change on a client (never plan/status/owner/tokens here).
const ALLOWED = ["name", "location", "hours", "services", "booking", "faq", "calendar_id", "whatsapp_number", "timezone", "assistant_name", "tone", "primary_language", "after_hours_message", "handover_rules"];
const SUB_STATUSES = ["trialing", "active", "past_due", "cancelled", "inactive"];
const PLANS = ["Starter", "Pro", "Business"];
const GV = process.env.FB_GRAPH_VERSION || "v22.0";
const digits = (v) => String(v || "").replace(/\D/g, "").replace(/^00/, "");

function validTimezone(tz) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

// Runs an action the admin confirmed in the assistant chat.
export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, text: "Not signed in." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (profile?.is_admin !== true) return NextResponse.json({ ok: false, text: "Admins only." }, { status: 403 });

  const { proposal } = await req.json();
  if (!proposal || !proposal.businessId || !proposal.action) return NextResponse.json({ ok: false, text: "Invalid action." });
  const { action, businessId, clientName, changes } = proposal;
  const done = (text) => { revalidatePath("/", "layout"); return NextResponse.json({ ok: true, text }); };
  const fail = (text) => NextResponse.json({ ok: false, text });

  if (action === "update_branding") {
    const clean = {};
    if (typeof changes?.app_name === "string" && changes.app_name.trim()) clean.app_name = changes.app_name.trim().slice(0, 40);
    if (typeof changes?.brand_color === "string" && /^#[0-9a-fA-F]{6}$/.test(changes.brand_color)) clean.brand_color = changes.brand_color;
    if (!Object.keys(clean).length) return fail("No valid branding changes.");
    const { error } = await supabase.from("settings").update(clean).eq("id", 1);
    if (error) return fail("Could not update branding: " + error.message);
    return done(`Done — updated ${Object.keys(clean).join(", ")}. Refresh to see it everywhere.`);
  }

  if (action === "suspend" || action === "activate") {
    const status = action === "suspend" ? "suspended" : "active";
    const { error } = await supabase.from("businesses").update({ status }).eq("id", businessId);
    if (error) return fail("Could not update: " + error.message);
    return done(`Done — ${clientName} is now ${status}.`);
  }

  if (action === "set_subscription") {
    const clean = {};
    const plan = PLANS.find((p) => p.toLowerCase() === String(changes?.plan || "").toLowerCase());
    if (plan) clean.plan = plan;
    if (SUB_STATUSES.includes(changes?.sub_status)) clean.sub_status = changes.sub_status;
    if (!Object.keys(clean).length) return fail("No valid plan or status.");
    const { error } = await supabase.from("businesses").update(clean).eq("id", businessId);
    if (error) return fail("Could not update: " + error.message);
    return done(`Done — ${clientName}: ${Object.entries(clean).map(([k, v]) => `${k} = ${v}`).join(", ")}.`);
  }

  if (action === "update_info") {
    const clean = {};
    for (const [k, v] of Object.entries(changes || {})) {
      if (!ALLOWED.includes(k)) continue;
      if (k === "whatsapp_number") { const d = digits(v); if (d && (d.length < 7 || d.length > 15)) return fail("That WhatsApp number doesn't look valid."); clean[k] = d || null; continue; }
      if (k === "timezone") { if (!validTimezone(v)) return fail(`"${v}" isn't a valid timezone.`); clean[k] = v; continue; }
      clean[k] = typeof v === "string" ? v.trim() : v;
    }
    if (!Object.keys(clean).length) return fail("No valid fields to update.");
    const { data, error } = await supabase.from("businesses").update(clean).eq("id", businessId).select("id");
    if (error) return fail("Could not update: " + error.message);
    if (!data?.length) return fail("Nothing was updated — client not found.");
    return done(`Done — updated ${Object.keys(clean).join(", ")} for ${clientName}.`);
  }

  const db = adminDb();
  if (!db) return fail("Server not configured (SUPABASE_SERVICE_ROLE_KEY missing).");

  if (action === "cancel_booking") {
    const ref = String(changes?.ref || "").replace(/^BK-/i, "");
    if (!/^\d+$/.test(ref)) return fail("Give a booking reference like BK-1043.");
    const { data, error } = await db.from("bookings").delete().eq("business_id", businessId).eq("ref_no", Number(ref)).select("id");
    if (error) return fail("Could not cancel: " + error.message);
    if (!data?.length) return fail(`No booking BK-${ref} found for ${clientName}.`);
    return done(`Done — booking BK-${ref} for ${clientName} is cancelled.`);
  }

  if (action === "send_whatsapp") {
    const to = digits(changes?.phone);
    const text = String(changes?.text || "").trim();
    if (!to || !text) return fail("Need a customer phone and a message.");
    const { data: biz } = await db.from("businesses").select("meta_phone_number_id, meta_access_token").eq("id", businessId).single();
    if (!biz?.meta_phone_number_id || !biz?.meta_access_token) return fail(`${clientName} has no WhatsApp connected.`);
    const { data: last } = await db.from("messages").select("created_at").eq("business_id", businessId).eq("customer_phone", to).eq("role", "user").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!last || Date.now() - new Date(last.created_at).getTime() > 864e5) return fail("WhatsApp only allows a free message within 24 hours of the customer's last message.");
    const res = await fetch(`https://graph.facebook.com/${GV}/${biz.meta_phone_number_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${biz.meta_access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return fail("WhatsApp refused it: " + (j?.error?.message || res.status));
    await db.from("messages").insert({ business_id: businessId, customer_phone: to, role: "staff", content: text });
    return done(`Sent to +${to} from ${clientName}'s WhatsApp.`);
  }

  return fail("Unknown action.");
}
