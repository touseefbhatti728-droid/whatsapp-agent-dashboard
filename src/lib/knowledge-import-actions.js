"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import { checkWebhookUrl } from "@/lib/safe-url";

const MODEL = "claude-haiku-4-5";
const MAX_PAGE_BYTES = 2_000_000;
const MAX_PDF_BYTES = 4_000_000;
// Pages that usually hold what a receptionist needs to know.
const USEFUL = /(about|service|treatment|price|pricing|menu|rate|faq|question|contact|team|staff|hour|location|package|offer|policy|book)/i;

const PROMPT = `You prepare the knowledge base of an AI receptionist for this business.
From the material below, write the facts a receptionist needs, as short bullet points under headings:
Services & prices, Opening hours, Location & contact, Policies (booking, cancellation, payment, deposits), FAQs, Team, Offers.
Rules: only facts that are in the material — never invent; keep prices, durations and phone numbers exactly; skip marketing fluff, menus, cookie notices and legal boilerplate; plain text, no markdown tables; at most 3,500 characters. If the material has nothing useful, reply exactly: NOTHING_USEFUL`;

async function activeBusinessId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "Not signed in" };
  const biz = await getActiveBusiness(user.id);
  if (!biz) return { supabase, error: "No business found for this account." };
  return { supabase, bizId: biz.id };
}

function htmlToText(html) {
  return String(html)
    .replace(/<(script|style|noscript|svg|iframe|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

async function fetchPage(url) {
  const safe = await checkWebhookUrl(url);
  if (!safe.ok) throw new Error(safe.error);
  const res = await fetch(safe.url, { redirect: "follow", signal: AbortSignal.timeout(10000), headers: { "User-Agent": "NextReplyBot/1.0 (+https://app.nextreply.io)" } });
  if (!res.ok) throw new Error(`The website answered ${res.status}.`);
  if (!/text\/html|text\/plain/i.test(res.headers.get("content-type") || "")) throw new Error("That link isn't a web page.");
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_PAGE_BYTES) throw new Error("That page is too large.");
  return { html: new TextDecoder().decode(buf), finalUrl: res.url || safe.url };
}

async function condense(content) {
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{ role: "user", content: [...content, { type: "text", text: PROMPT }] }],
  });
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  if (!text || text === "NOTHING_USEFUL") throw new Error("We couldn't find business information there. Try your services or prices page.");
  return text.slice(0, 4000);
}

async function save(supabase, bizId, title, content) {
  const { error } = await supabase.from("knowledge_items").insert([{ business_id: bizId, type: "document", title, content }]);
  if (error) throw new Error(error.message);
  revalidatePath("/knowledge");
}

// Reads the page plus a few useful pages it links to on the same site.
export async function importFromWebsite(rawUrl) {
  const { supabase, bizId, error } = await activeBusinessId();
  if (error) return { ok: false, error };
  let url = String(rawUrl || "").trim();
  if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
  url = url.replace(/^http:\/\//i, "https://");
  try {
    const first = await fetchPage(url);
    const base = new URL(first.finalUrl);
    const pages = [`PAGE ${base.href}\n${htmlToText(first.html).slice(0, 15000)}`];
    const links = [...first.html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)]
      .map((m) => { try { return new URL(m[1], base); } catch { return null; } })
      .filter((u) => u && u.hostname === base.hostname && USEFUL.test(u.pathname) && u.href !== base.href);
    const unique = [...new Map(links.map((u) => [u.origin + u.pathname, u])).values()].slice(0, 5);
    for (const u of unique) {
      try { const p = await fetchPage(u.href); pages.push(`PAGE ${u.href}\n${htmlToText(p.html).slice(0, 10000)}`); } catch (_) {}
    }
    const summary = await condense([{ type: "text", text: pages.join("\n\n").slice(0, 60000) }]);
    await save(supabase, bizId, `Website: ${base.hostname}`, summary);
    return { ok: true, pages: pages.length };
  } catch (e) {
    return { ok: false, error: e?.message || "Couldn't read that website." };
  }
}

// PDF price list, menu, brochure… read by Claude directly.
export async function importFromPdf(formData) {
  const { supabase, bizId, error } = await activeBusinessId();
  if (error) return { ok: false, error };
  const file = formData.get("file");
  if (!file || typeof file.arrayBuffer !== "function") return { ok: false, error: "Choose a PDF file." };
  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name || "")) return { ok: false, error: "Only PDF files are supported." };
  if (file.size > MAX_PDF_BYTES) return { ok: false, error: "That PDF is over 4 MB — please upload a smaller one." };
  try {
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const summary = await condense([{ type: "document", source: { type: "base64", media_type: "application/pdf", data } }]);
    await save(supabase, bizId, `PDF: ${String(file.name || "document").slice(0, 80)}`, summary);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Couldn't read that PDF." };
  }
}
