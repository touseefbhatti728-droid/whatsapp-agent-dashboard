"use server";

import { adminDb } from "@/lib/admin-db";
import { notifyBusiness } from "@/lib/notify";

// Actions behind the customer links (feedback, intake form, quote). No login: the
// random token in the link is the only key, so every action re-checks it.
const TOKEN = /^[0-9a-f]{32}$/;

export async function submitFeedback(token, rating, comment) {
  if (!TOKEN.test(String(token))) return { ok: false, error: "This link isn't valid." };
  const r = Math.round(Number(rating));
  if (!(r >= 1 && r <= 5)) return { ok: false, error: "Pick 1 to 5 stars." };
  const db = adminDb();
  const { data: fb } = await db.from("feedback").select("id, business_id, customer_name, service, staff_name, answered_at").eq("token", token).maybeSingle();
  if (!fb) return { ok: false, error: "This link isn't valid." };
  if (fb.answered_at) return { ok: false, error: "Thanks — we already have your feedback." };
  const text = String(comment || "").trim().slice(0, 1000) || null;
  await db.from("feedback").update({ rating: r, comment: text, answered_at: new Date().toISOString() }).eq("id", fb.id);
  const { data: biz } = await db.from("businesses").select("google_review_url").eq("id", fb.business_id).maybeSingle();
  await notifyBusiness(fb.business_id, {
    type: r <= 3 ? "handover" : "booking",
    title: r <= 3 ? `⚠️ ${r}★ feedback from ${fb.customer_name || "a customer"}` : `${"★".repeat(r)} from ${fb.customer_name || "a customer"}`,
    body: [fb.service, fb.staff_name && `with ${fb.staff_name}`, text && `"${text.slice(0, 120)}"`].filter(Boolean).join(" · ") || "New feedback",
    url: "/followups",
    tag: `feedback-${fb.id}`,
  }).catch(() => {});
  return { ok: true, reviewUrl: r >= 4 ? biz?.google_review_url || null : null };
}

export async function submitIntake(token, answers) {
  if (!TOKEN.test(String(token))) return { ok: false, error: "This link isn't valid." };
  const db = adminDb();
  const { data: row } = await db.from("intake_responses").select("id, business_id, customer_name, submitted_at").eq("token", token).maybeSingle();
  if (!row) return { ok: false, error: "This link isn't valid." };
  const { data: biz } = await db.from("businesses").select("intake_form").eq("id", row.business_id).maybeSingle();
  const form = Array.isArray(biz?.intake_form) ? biz.intake_form : [];
  const clean = {};
  for (const f of form) {
    const v = String(answers?.[f.label] ?? "").trim().slice(0, 2000);
    if (f.required && !v) return { ok: false, error: `Please answer: ${f.label}` };
    clean[f.label] = v;
  }
  await db.from("intake_responses").update({ answers: clean, submitted_at: new Date().toISOString() }).eq("id", row.id);
  if (!row.submitted_at) {
    await notifyBusiness(row.business_id, {
      type: "booking", title: `Intake form filled: ${row.customer_name || "a customer"}`, body: "See the answers on the appointment in your calendar.", url: "/calendar", tag: `intake-${row.id}`,
    }).catch(() => {});
  }
  return { ok: true };
}

export async function acceptQuote(token) {
  if (!TOKEN.test(String(token))) return { ok: false, error: "This link isn't valid." };
  const db = adminDb();
  const { data: q } = await db.from("quotes").select("id, business_id, kind, number, customer_name, total, currency, status").eq("token", token).maybeSingle();
  if (!q || q.kind !== "quote") return { ok: false, error: "This link isn't valid." };
  if (q.status !== "sent") return { ok: true, already: true };
  await db.from("quotes").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", q.id);
  await notifyBusiness(q.business_id, {
    type: "booking", title: `✅ Quote #${q.number} accepted: ${q.customer_name || "customer"}`,
    body: `${q.currency} ${Number(q.total).toLocaleString("en-US")} — follow up to book and collect payment.`, url: "/quotes", tag: `quote-${q.id}`,
  }).catch(() => {});
  return { ok: true };
}
