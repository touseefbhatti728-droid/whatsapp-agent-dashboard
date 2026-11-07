import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";

export const maxDuration = 60;

// "Ask AI" for the business's own staff: answers from the business's services,
// knowledge, team, packages and policies (what the WhatsApp AI also knows).
export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const biz = await getActiveBusiness(user.id);
  if (!biz) return NextResponse.json({ error: "No business found." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const history = (Array.isArray(body.messages) ? body.messages : []).slice(-12)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!history.length || history[history.length - 1].role !== "user") return NextResponse.json({ error: "Ask a question." }, { status: 400 });

  const [svc, kn, team, pk] = await Promise.all([
    supabase.from("services").select("name, category, price, duration_min").eq("business_id", biz.id).eq("active", true),
    supabase.from("knowledge_items").select("type, title, content").eq("business_id", biz.id).eq("active", true),
    supabase.from("team_members").select("*").eq("business_id", biz.id).eq("active", true),
    supabase.from("packages").select("name, price, sessions, services, description").eq("business_id", biz.id).eq("active", true),
  ]);
  const lines = (arr, f) => (arr || []).map(f).join("\n") || "—";
  const facts = `BUSINESS: ${biz.name}${biz.location ? ` · ${biz.location}` : ""}
Hours: ${biz.hours || "—"}
Booking info: ${biz.booking || "—"}
FAQ: ${biz.faq || "—"}
About: ${biz.knowledge || "—"}
Payments: ${[biz.payment_link, biz.payment_instructions, biz.deposit_required && `deposit ${biz.deposit_amount || "required"}`].filter(Boolean).join(" · ") || "—"}
Loyalty: ${biz.loyalty_enabled ? `every ${biz.loyalty_visits} visits → ${biz.loyalty_reward}` : "off"}

SERVICES:
${lines(svc.data, (s) => `- ${s.name}${s.price != null ? ` — ${s.price}` : ""}${s.duration_min ? ` · ${s.duration_min} min` : ""}${s.category ? ` (${s.category})` : ""}`)}

PACKAGES:
${lines(pk.data, (p) => `- ${p.name}${p.price ? ` — ${p.price}` : ""}${p.sessions > 1 ? ` · ${p.sessions} sessions` : ""}${p.services?.length ? ` · ${p.services.join(", ")}` : ""}${p.description ? ` · ${p.description}` : ""}`)}

TEAM:
${lines(team.data, (m) => `- ${m.name}${m.role ? ` (${m.role})` : ""}${m.services?.length ? ` · does ${m.services.join(", ")}` : ""}${m.availability ? ` · works ${Object.entries(m.availability).filter(([, d]) => d?.on).map(([k, d]) => `${k} ${d.start}-${d.end}`).join(", ")}` : ""}`)}

KNOWLEDGE BASE:
${lines(kn.data, (k) => `- [${k.type}] ${k.title ? k.title + ": " : ""}${k.content}`).slice(0, 30000)}`;

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 900,
      system: `You are the internal assistant for the staff of "${biz.name}". Answer their questions using ONLY the business facts below — prices, policies, who does what, hours, packages. If something isn't in the facts, say so plainly and suggest adding it on the Knowledge or Services page. Be brief and practical. Reply in the language of the question. You can also draft WhatsApp replies to customers when asked.\n\n${facts}`,
      messages: history,
    });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    return NextResponse.json({ text });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "The AI is busy — try again in a minute." }, { status: 429 });
    return NextResponse.json({ error: "The AI couldn't answer right now. Please try again." }, { status: 502 });
  }
}
