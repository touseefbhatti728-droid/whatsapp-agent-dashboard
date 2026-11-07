"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";

async function ctx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const biz = await getActiveBusiness(user.id);
  if (!biz) return { error: "No business found for this account." };
  return { supabase, biz };
}
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));

// Create or edit a quote / invoice. Items: [{ name, qty, price }]
export async function saveQuote(input) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const items = (Array.isArray(input?.items) ? input.items : []).slice(0, 50).map((i) => ({
    name: String(i.name || "").trim().slice(0, 200),
    qty: Math.max(1, Math.round(Number(i.qty) || 1)),
    price: Math.max(0, Math.round((Number(i.price) || 0) * 100) / 100),
  })).filter((i) => i.name);
  if (!items.length) return { ok: false, error: "Add at least one item." };
  const phone = String(input.customer_phone || "").replace(/\D/g, "").replace(/^00/, "");
  if (!String(input.customer_name || "").trim() && !phone) return { ok: false, error: "Add the customer's name or phone." };
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  const deposit = input.deposit === "" || input.deposit == null ? null : Math.max(0, Number(input.deposit) || 0);
  const link = String(input.payment_link || "").trim();
  if (link && !/^https:\/\/\S+$/i.test(link)) return { ok: false, error: "The payment link must start with https://" };
  const row = {
    kind: input.kind === "invoice" ? "invoice" : "quote",
    customer_name: String(input.customer_name || "").trim().slice(0, 120) || null,
    customer_phone: phone || null,
    items, total, deposit,
    currency: (String(input.currency || biz.currency || "AED").trim().slice(0, 6) || "AED").toUpperCase(),
    notes: String(input.notes || "").trim().slice(0, 2000) || null,
    valid_until: isDate(input.valid_until) ? input.valid_until : null,
    due_date: isDate(input.due_date) ? input.due_date : null,
    payment_link: link || biz.payment_link || null,
  };
  const q = input.id
    ? supabase.from("quotes").update(row).eq("id", input.id).eq("business_id", biz.id).select("id, token").single()
    : supabase.from("quotes").insert([{ ...row, business_id: biz.id, status: "sent" }]).select("id, token").single();
  const { data, error: e } = await q;
  if (e) return { ok: false, error: /does not exist|schema cache/.test(e.message) ? "Quotes turn on after a quick database update by your provider." : e.message };
  revalidatePath("/quotes");
  return { ok: true, id: data.id, token: data.token };
}

export async function setQuoteStatus(id, status) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  if (!["sent", "accepted", "paid", "cancelled"].includes(status)) return { ok: false, error: "Unknown status." };
  const patch = { status };
  if (status === "paid") patch.paid_at = new Date().toISOString();
  if (status === "accepted") patch.accepted_at = new Date().toISOString();
  const { error: e } = await supabase.from("quotes").update(patch).eq("id", id).eq("business_id", biz.id);
  if (e) return { ok: false, error: e.message };
  revalidatePath("/quotes");
  return { ok: true };
}

// Turn an accepted quote into an invoice (same items), due in 7 days.
export async function quoteToInvoice(id) {
  const { supabase, biz, error } = await ctx();
  if (error) return { ok: false, error };
  const { data: q } = await supabase.from("quotes").select("*").eq("id", id).eq("business_id", biz.id).maybeSingle();
  if (!q) return { ok: false, error: "Quote not found." };
  const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const { error: e } = await supabase.from("quotes").insert([{
    business_id: biz.id, kind: "invoice", status: "sent", customer_name: q.customer_name, customer_phone: q.customer_phone,
    items: q.items, total: q.total, deposit: null, currency: q.currency, notes: q.notes, due_date: due, payment_link: q.payment_link,
  }]);
  if (e) return { ok: false, error: e.message };
  revalidatePath("/quotes");
  return { ok: true };
}
