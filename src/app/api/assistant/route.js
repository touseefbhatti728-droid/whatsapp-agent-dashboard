import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300; // research questions with web search can take a while

const MODEL = "claude-opus-5-5";

// Admin rules live in src/lib/assistant/RULES.md so they can be edited without touching code.
let RULES = "";
try { RULES = fs.readFileSync(path.join(process.cwd(), "src/lib/assistant/RULES.md"), "utf8"); } catch { RULES = ""; }

const SYSTEM = `You are the admin assistant ("command center") of NextReply, a WhatsApp AI receptionist SaaS.
You have read access to the whole platform through tools, live web search for anything outside the platform, and you can propose changes that the admin confirms with one click.

${RULES}`;

const CLIENT_FIELDS = ["name", "location", "hours", "services", "booking", "faq", "calendar_id", "whatsapp_number", "timezone", "assistant_name", "tone", "primary_language", "after_hours_message", "handover_rules"];

const tools = [
  { name: "get_overview", description: "Platform totals: clients (active/suspended), WhatsApp-connected clients, subscriptions by status, estimated monthly revenue, bookings (all / last 7 days / today), messages in the last 24h.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "list_clients", description: "Every client business: name, status, plan, subscription status, WhatsApp number, whether WhatsApp is really connected (Meta credentials saved), owner email, booking count, created date.", input_schema: { type: "object", properties: { search: { type: "string", description: "Optional text to filter by name, email or number." } }, additionalProperties: false } },
  { name: "get_client", description: "Full profile of one client: all settings (hours, services text, FAQ, AI persona, timezone, AI hours), services list with prices/durations, team, knowledge items, connection status, plan, last 10 bookings and last 20 messages.", input_schema: { type: "object", properties: { client_name: { type: "string" } }, required: ["client_name"], additionalProperties: false } },
  { name: "list_bookings", description: "Bookings, newest first. Filter by client and/or date range (ISO dates).", input_schema: { type: "object", properties: { client_name: { type: "string" }, from: { type: "string", description: "ISO date, inclusive" }, to: { type: "string", description: "ISO date, exclusive" }, limit: { type: "integer", minimum: 1, maximum: 200 } }, additionalProperties: false } },
  { name: "get_conversations", description: "WhatsApp chat messages of one client (optionally one customer phone), oldest to newest.", input_schema: { type: "object", properties: { client_name: { type: "string" }, phone: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 200 } }, required: ["client_name"], additionalProperties: false } },
  { name: "search_messages", description: "Search all WhatsApp messages on the platform for a word or phrase.", input_schema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100 } }, required: ["query"], additionalProperties: false } },
  { name: "list_notifications", description: "Latest owner/admin alerts (bookings, handovers, billing, signups).", input_schema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 100 } }, additionalProperties: false } },
  {
    name: "propose_action",
    description: "Propose ONE data-changing action. The admin must click Confirm before it runs — never say it is done. Actions: suspend / activate (client), update_info (client fields), set_subscription (plan + sub_status in the dashboard), update_branding (app_name / brand_color), cancel_booking (by BK reference), send_whatsapp (send a text from the client's WhatsApp number to a customer, only within 24h of the customer's last message).",
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["suspend", "activate", "update_info", "set_subscription", "update_branding", "cancel_booking", "send_whatsapp"] },
        client_name: { type: "string", description: "Client business name (all actions except update_branding)." },
        changes: {
          type: "object",
          description: `update_info: any of ${CLIENT_FIELDS.join(", ")}. set_subscription: { plan: Starter|Pro|Business, sub_status: trialing|active|past_due|cancelled|inactive }. update_branding: { app_name, brand_color (#rrggbb) }. cancel_booking: { ref: "BK-1234" }. send_whatsapp: { phone, text }.`,
        },
        summary: { type: "string", description: "One plain sentence: exactly what will change." },
      },
      required: ["action", "summary"],
    },
  },
  // Live internet for "latest" questions (Meta policy, Stripe, news, prices...)
  { type: "web_search_20260209", name: "web_search", max_uses: 5 },
];

const digits = (v) => String(v || "").replace(/\D/g, "").replace(/^00/, "");

async function resolveClient(supabase, name) {
  if (!name) return { error: "not_found" };
  const { data } = await supabase.from("businesses").select("id, name, status").ilike("name", `%${name}%`);
  if (!data || data.length === 0) return { error: "not_found" };
  const exact = data.find((d) => String(d.name || "").toLowerCase() === String(name).toLowerCase());
  if (exact) return { business: exact };
  if (data.length > 1) return { error: "ambiguous", options: data.map((d) => d.name || `#${d.id}`) };
  return { business: data[0] };
}

async function runReadTool(supabase, name, input) {
  if (name === "get_overview") {
    const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
    const since1 = new Date(Date.now() - 864e5).toISOString();
    const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
    const [{ data: bs }, { data: plans }, b1, b7, bt, m24] = await Promise.all([
      supabase.from("businesses").select("status, plan, sub_status, meta_phone_number_id"),
      supabase.from("plans").select("name, price"),
      supabase.from("bookings").select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", since7),
      supabase.from("bookings").select("id", { count: "exact", head: true }).gte("start_time", dayStart.toISOString()).lt("start_time", new Date(dayStart.getTime() + 864e5).toISOString()),
      supabase.from("messages").select("id", { count: "exact", head: true }).gte("created_at", since1),
    ]);
    const price = Object.fromEntries((plans || []).map((p) => [String(p.name).toLowerCase(), Number(p.price) || 0]));
    const subs = {};
    (bs || []).forEach((b) => { subs[b.sub_status || "none"] = (subs[b.sub_status || "none"] || 0) + 1; });
    const mrr = (bs || []).filter((b) => b.sub_status === "active").reduce((s, b) => s + (price[String(b.plan || "").toLowerCase()] || 0), 0);
    return {
      clients_total: bs?.length || 0,
      clients_suspended: (bs || []).filter((b) => b.status === "suspended").length,
      whatsapp_connected: (bs || []).filter((b) => b.meta_phone_number_id).length,
      subscriptions_by_status: subs,
      estimated_mrr_usd: mrr,
      bookings_total: b1.count || 0, bookings_last_7_days: b7.count || 0, bookings_today_utc: bt.count || 0,
      messages_last_24h: m24.count || 0,
    };
  }
  if (name === "list_clients") {
    const [{ data: bs }, { data: bk }] = await Promise.all([
      supabase.from("businesses").select("id, name, status, plan, sub_status, whatsapp_number, meta_phone_number_id, owner_email, created_at").order("created_at", { ascending: false }),
      supabase.from("bookings").select("business_id").limit(20000),
    ]);
    const counts = {};
    (bk || []).forEach((b) => { counts[b.business_id] = (counts[b.business_id] || 0) + 1; });
    const s = String(input.search || "").toLowerCase();
    return (bs || [])
      .filter((b) => !s || `${b.name} ${b.owner_email} ${b.whatsapp_number}`.toLowerCase().includes(s))
      .map((b) => ({ name: b.name || `(unnamed #${b.id})`, status: b.status, plan: b.plan, subscription: b.sub_status, whatsapp_saved_as: b.whatsapp_number || null, whatsapp_clean: b.whatsapp_number ? digits(b.whatsapp_number) : null, whatsapp_connected: !!b.meta_phone_number_id, owner: b.owner_email, bookings: counts[b.id] || 0, joined: b.created_at }));
  }
  if (name === "get_client") {
    const r = await resolveClient(supabase, input.client_name);
    if (r.error) return r;
    const id = r.business.id;
    const [{ data: b }, { data: svc }, { data: team }, { data: kn }, { data: bk }, { data: msgs }] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", id).single(),
      supabase.from("services").select("name, category, price, duration_min, active").eq("business_id", id),
      supabase.from("team_members").select("name, role, active").eq("business_id", id),
      supabase.from("knowledge_items").select("type, title, content, active").eq("business_id", id),
      supabase.from("bookings").select("ref_no, customer_name, customer_phone, service, start_time, source").eq("business_id", id).order("start_time", { ascending: false }).limit(10),
      supabase.from("messages").select("customer_phone, role, content, created_at").eq("business_id", id).order("created_at", { ascending: false }).limit(20),
    ]);
    if (!b) return { error: "not_found" };
    // Never hand secrets to the model
    const { meta_access_token, stripe_customer_id, ...safe } = b;
    return {
      ...safe,
      whatsapp_saved_as: b.whatsapp_number || null,
      whatsapp_clean: b.whatsapp_number ? digits(b.whatsapp_number) : null,
      whatsapp_connected: !!(b.meta_phone_number_id && meta_access_token),
      has_stripe_customer: !!stripe_customer_id,
      services: svc || [], team: team || [], knowledge: kn || [],
      recent_bookings: (bk || []).map((x) => ({ ...x, ref: x.ref_no ? `BK-${x.ref_no}` : null })),
      recent_messages: (msgs || []).reverse(),
    };
  }
  if (name === "list_bookings") {
    let q = supabase.from("bookings").select("ref_no, customer_name, customer_phone, service, start_time, source, business_id, businesses:business_id(name)").order("start_time", { ascending: false }).limit(input.limit || 50);
    if (input.client_name) { const r = await resolveClient(supabase, input.client_name); if (r.error) return r; q = q.eq("business_id", r.business.id); }
    if (input.from) q = q.gte("start_time", input.from);
    if (input.to) q = q.lt("start_time", input.to);
    const { data, error } = await q;
    if (error) return { error: error.message };
    return (data || []).map((x) => ({ ref: x.ref_no ? `BK-${x.ref_no}` : null, client: x.businesses?.name, customer: x.customer_name, phone: x.customer_phone, service: x.service, when: x.start_time, source: x.source }));
  }
  if (name === "get_conversations") {
    const r = await resolveClient(supabase, input.client_name);
    if (r.error) return r;
    let q = supabase.from("messages").select("customer_phone, role, content, created_at").eq("business_id", r.business.id).order("created_at", { ascending: false }).limit(input.limit || 60);
    if (input.phone) q = q.eq("customer_phone", digits(input.phone));
    const { data } = await q;
    return { client: r.business.name, messages: (data || []).reverse().map((m) => ({ phone: m.customer_phone, from: m.role === "user" ? "customer" : "business/AI", text: m.content, at: m.created_at })) };
  }
  if (name === "search_messages") {
    const { data } = await supabase.from("messages").select("customer_phone, role, content, created_at, businesses:business_id(name)").ilike("content", `%${input.query}%`).order("created_at", { ascending: false }).limit(input.limit || 30);
    return (data || []).map((m) => ({ client: m.businesses?.name, phone: m.customer_phone, from: m.role === "user" ? "customer" : "business/AI", text: m.content, at: m.created_at }));
  }
  if (name === "list_notifications") {
    const { data } = await supabase.from("notifications").select("type, title, body, created_at, businesses:business_id(name)").order("created_at", { ascending: false }).limit(input.limit || 20);
    return (data || []).map((n) => ({ client: n.businesses?.name, type: n.type, title: n.title, body: n.body, at: n.created_at }));
  }
  return { error: "unknown_tool" };
}

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ type: "text", text: "Not signed in." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (profile?.is_admin !== true) return NextResponse.json({ type: "text", text: "Admins only." }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ type: "text", text: "The assistant isn't configured yet (ANTHROPIC_API_KEY missing)." });

  const { history } = await req.json();
  const messages = (history || [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && String(m.content || "").trim())
    .map((m) => ({ role: m.role, content: String(m.content) }));
  if (!messages.length || messages[0].role !== "user") return NextResponse.json({ type: "text", text: "Ask me something to start." });

  const client = new Anthropic();
  // Today's date goes in a mid-conversation system message so the cached system prompt stays stable.
  const today = new Date().toISOString().slice(0, 10);
  messages.push({ role: "system", content: `Today is ${today} (UTC). The admin is ${user.email}.` });

  for (let i = 0; i < 12; i++) {
    let res;
    try {
      res = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        tools,
        messages,
      });
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ type: "text", text: "The AI is busy right now (rate limit). Try again in a minute." });
      if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ type: "text", text: "The Anthropic API key is invalid. Update ANTHROPIC_API_KEY in Vercel." });
      if (e instanceof Anthropic.APIError) return NextResponse.json({ type: "text", text: `The AI service returned an error (${e.status}). Please try again.` });
      return NextResponse.json({ type: "text", text: "Couldn't reach the AI service. Please try again." });
    }

    const content = res.content || [];
    const textOf = () => content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();

    if (res.stop_reason === "refusal") {
      return NextResponse.json({ type: "text", text: "I can't help with that request." });
    }
    // Server tools (web search) can pause a long turn — send it back to continue.
    if (res.stop_reason === "pause_turn") { messages.push({ role: "assistant", content }); continue; }

    const toolUses = content.filter((b) => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || toolUses.length === 0) {
      return NextResponse.json({ type: "text", text: textOf() || (res.stop_reason === "max_tokens" ? "That answer got too long — ask for a shorter summary." : "(no answer)") });
    }

    const propose = toolUses.find((t) => t.name === "propose_action");
    if (propose) {
      const inp = propose.input || {};
      if (inp.action === "update_branding") {
        return NextResponse.json({ type: "proposal", text: textOf(), proposal: { action: "update_branding", businessId: "GLOBAL", clientName: null, changes: inp.changes || null, summary: inp.summary } });
      }
      const resolved = await resolveClient(supabase, inp.client_name);
      if (resolved.error) {
        // Tell the model and let it ask the admin
        messages.push({ role: "assistant", content });
        messages.push({ role: "user", content: toolUses.map((t) => ({ type: "tool_result", tool_use_id: t.id, is_error: t.id === propose.id, content: t.id === propose.id ? (resolved.error === "ambiguous" ? `Several clients match: ${resolved.options.join(", ")}. Ask which one.` : `No client matches "${inp.client_name}".`) : "Skipped." })) });
        continue;
      }
      return NextResponse.json({ type: "proposal", text: textOf(), proposal: { action: inp.action, businessId: resolved.business.id, clientName: resolved.business.name, changes: inp.changes || null, summary: inp.summary } });
    }

    // Run all read tools in parallel and return every result in one user message
    const results = await Promise.all(toolUses.map(async (t) => {
      try {
        const out = await runReadTool(supabase, t.name, t.input || {});
        return { type: "tool_result", tool_use_id: t.id, content: JSON.stringify(out).slice(0, 60000) };
      } catch (e) {
        return { type: "tool_result", tool_use_id: t.id, is_error: true, content: "Tool failed: " + (e?.message || "unknown error") };
      }
    }));
    messages.push({ role: "assistant", content });
    messages.push({ role: "user", content: results });
  }
  return NextResponse.json({ type: "text", text: "That needed too many steps — try splitting it into smaller questions." });
}
