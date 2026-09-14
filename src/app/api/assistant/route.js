import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const MODEL = "claude-haiku-4-5-20251001";

const tools = [
  { name: "get_overview", description: "Platform stats: total clients, active, suspended, total bookings, bookings in the last 7 days.", input_schema: { type: "object", properties: {} } },
  { name: "list_clients", description: "List all client businesses with status, whatsapp number, and booking counts.", input_schema: { type: "object", properties: {} } },
  { name: "list_bookings", description: "List bookings. Optionally filter by client name and by time.", input_schema: { type: "object", properties: { client_name: { type: "string" }, when: { type: "string", enum: ["all", "upcoming", "past"] } } } },
  { name: "get_conversations", description: "Get recent WhatsApp chat messages for one client (by business name).", input_schema: { type: "object", properties: { client_name: { type: "string" } }, required: ["client_name"] } },
  { name: "propose_action", description: "Propose a data-changing action for the human to confirm. NEVER assume the action is done — the human must confirm it. Use for suspending a client, activating a client, or updating a client's business info.", input_schema: { type: "object", properties: { action: { type: "string", enum: ["suspend", "activate", "update_info", "update_branding", "set_subscription"] }, client_name: { type: "string", description: "Business name for suspend/activate/update_info. Omit for update_branding." }, changes: { type: "object", description: "For update_info: client fields (hours, services, faq, location, name, booking, calendar_id). For update_branding: { app_name, brand_color }. For set_subscription: { plan, sub_status } where sub_status is trialing/active/past_due/cancelled." }, summary: { type: "string", description: "One-line plain description of what will happen." } }, required: ["action", "summary"] } },
];

const SYSTEM = `You are the admin assistant inside a WhatsApp booking SaaS dashboard. You help the platform owner (an admin) understand their data and make changes.

Rules:
- To answer questions about clients, bookings, or conversations, call the read tools and then answer clearly and concisely.
- For anything that CHANGES data (suspend/activate a client, edit a client's info, or change the app branding/colour/name), you MUST call propose_action. Never claim an action is done — the human confirms it separately.
- For branding colour changes, provide brand_color as a 6-digit hex (e.g. blue = #2563eb, purple = #7c3aed, orange = #ea580c).\n- To change a plan or billing status, use action set_subscription with client_name and changes { plan, sub_status }.
- Keep answers short, clear and friendly. Write PLAIN TEXT ONLY — never use markdown, asterisks (**), hash symbols, or bullet characters. For lists, use short simple lines. When you cannot do something, say so briefly without markdown.
- If a client name is unclear or matches several, ask which one.`;

async function anthropic(messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system: SYSTEM, tools, messages }),
  });
  return res.json();
}

async function resolveClient(supabase, name) {
  if (!name) return { error: "not_found" };
  const { data } = await supabase.from("businesses").select("id, name, status").ilike("name", `%${name}%`);
  if (!data || data.length === 0) return { error: "not_found" };
  if (data.length > 1) return { error: "ambiguous", options: data.map((d) => d.name) };
  return { business: data[0] };
}

async function runReadTool(supabase, name, input) {
  if (name === "get_overview") {
    const { data: bs } = await supabase.from("businesses").select("status");
    const total = bs?.length || 0;
    const suspended = (bs || []).filter((b) => b.status === "suspended").length;
    const { count: bookings } = await supabase.from("bookings").select("*", { count: "exact", head: true });
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const { count: week } = await supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", weekAgo);
    const { data: subRows } = await supabase.from("businesses").select("plan, sub_status");
    const { data: planRows } = await supabase.from("plans").select("name, price");
    const priceOf = {}; (planRows || []).forEach((p) => { priceOf[p.name] = Number(p.price) || 0; });
    const active_subscriptions = (subRows || []).filter((b) => b.sub_status === "active").length;
    const estimated_mrr = (subRows || []).filter((b) => b.sub_status === "active").reduce((s2, b) => s2 + (priceOf[b.plan] || 0), 0);
    return { total_clients: total, active: total - suspended, suspended, total_bookings: bookings || 0, bookings_last_7_days: week || 0, active_subscriptions, estimated_mrr };
  }
  if (name === "list_clients") {
    const { data: bs } = await supabase.from("businesses").select("id, name, status, plan, sub_status, whatsapp_number, owner_email");
    const { data: bk } = await supabase.from("bookings").select("business_id");
    const counts = {};
    (bk || []).forEach((b) => { counts[b.business_id] = (counts[b.business_id] || 0) + 1; });
    return (bs || []).map((b) => ({ name: b.name, status: b.status, plan: b.plan, subscription: b.sub_status, whatsapp: b.whatsapp_number, owner: b.owner_email, bookings: counts[b.id] || 0 }));
  }
  if (name === "list_bookings") {
    let bizId = null;
    if (input.client_name) { const r = await resolveClient(supabase, input.client_name); if (r.business) bizId = r.business.id; }
    let q = supabase.from("bookings").select("ref_no, customer_name, service, start_time, business_id").order("start_time", { ascending: false }).limit(40);
    if (bizId) q = q.eq("business_id", bizId);
    const { data } = await q;
    let rows = data || [];
    const now = Date.now();
    if (input.when === "upcoming") rows = rows.filter((r) => new Date(r.start_time).getTime() >= now);
    if (input.when === "past") rows = rows.filter((r) => new Date(r.start_time).getTime() < now);
    return rows.map((r) => ({ ref: r.ref_no ? `BK-${r.ref_no}` : null, customer: r.customer_name, service: r.service, when: r.start_time }));
  }
  if (name === "get_conversations") {
    const r = await resolveClient(supabase, input.client_name);
    if (r.error) return { error: r.error, options: r.options };
    const { data } = await supabase.from("messages").select("customer_phone, role, content, created_at").eq("business_id", r.business.id).order("created_at", { ascending: false }).limit(30);
    return { client: r.business.name, recent_messages: (data || []).reverse().map((m) => ({ from: m.role === "user" ? "customer" : "agent", text: m.content })) };
  }
  return { error: "unknown_tool" };
}

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ type: "text", text: "Not signed in." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (profile?.is_admin !== true) return NextResponse.json({ type: "text", text: "Admins only." }, { status: 403 });

  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ type: "text", text: "The assistant isn't configured yet (missing API key)." });

  const { history } = await req.json();
  const messages = (history || []).map((m) => ({ role: m.role, content: m.content }));

  for (let i = 0; i < 6; i++) {
    const data = await anthropic(messages);
    if (data.error) return NextResponse.json({ type: "text", text: "The AI service returned an error. Please check the API key." });
    const content = data.content || [];
    const toolUses = content.filter((b) => b.type === "tool_use");

    if (data.stop_reason !== "tool_use" || toolUses.length === 0) {
      const text = content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      return NextResponse.json({ type: "text", text: text || "(no answer)" });
    }

    const propose = toolUses.find((t) => t.name === "propose_action");
    if (propose) {
      const inp = propose.input || {};
      if (inp.action === "update_branding") {
        const preText = content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
        return NextResponse.json({ type: "proposal", text: preText, proposal: { action: "update_branding", businessId: "GLOBAL", clientName: null, changes: inp.changes || null, summary: inp.summary } });
      }
      const resolved = await resolveClient(supabase, inp.client_name);
      if (resolved.error === "not_found") {
        messages.push({ role: "assistant", content });
        messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: propose.id, content: `No client found matching "${inp.client_name}".` }] });
        continue;
      }
      if (resolved.error === "ambiguous") {
        messages.push({ role: "assistant", content });
        messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: propose.id, content: `Multiple clients match: ${resolved.options.join(", ")}. Ask the user which one.` }] });
        continue;
      }
      const preText = content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      return NextResponse.json({ type: "proposal", text: preText, proposal: { action: inp.action, businessId: resolved.business.id, clientName: resolved.business.name, changes: inp.changes || null, summary: inp.summary } });
    }

    const results = [];
    for (const t of toolUses) {
      const out = await runReadTool(supabase, t.name, t.input || {});
      results.push({ type: "tool_result", tool_use_id: t.id, content: JSON.stringify(out).slice(0, 6000) });
    }
    messages.push({ role: "assistant", content });
    messages.push({ role: "user", content: results });
  }
  return NextResponse.json({ type: "text", text: "That took too many steps — try asking more simply." });
}
