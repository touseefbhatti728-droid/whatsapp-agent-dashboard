"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import { adminDb } from "@/lib/admin-db";

const GV = "v22.0";
const G = `https://graph.facebook.com/${GV}`;

async function ctx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const biz = await getActiveBusiness(user.id);
  if (!biz) return { error: "No business found for this account." };
  return { biz };
}

// Short-lived user token from Facebook Login → long-lived user token → the Pages they manage
// (each Page's long-lived token comes with it, plus a linked Instagram business account).
async function pagesFor(userToken) {
  const appId = process.env.FB_APP_ID, secret = process.env.FB_APP_SECRET;
  if (!appId || !secret) throw new Error("Server not configured (FB_APP_ID / FB_APP_SECRET).");
  const ex = await fetch(`${G}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${encodeURIComponent(secret)}&fb_exchange_token=${encodeURIComponent(userToken)}`);
  const exj = await ex.json();
  if (!ex.ok || !exj.access_token) throw new Error(exj?.error?.message || "Facebook didn't accept the login.");
  const r = await fetch(`${G}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100&access_token=${encodeURIComponent(exj.access_token)}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || "Couldn't list your Facebook Pages.");
  return j.data || [];
}

// Step 1: which Pages can be connected (no tokens go back to the browser).
export async function listFacebookPages(userToken) {
  const { error } = await ctx();
  if (error) return { ok: false, error };
  try {
    const pages = await pagesFor(String(userToken || ""));
    if (!pages.length) return { ok: false, error: "No Facebook Pages found. Make sure you ticked your business Page in the Facebook window." };
    return { ok: true, pages: pages.map((p) => ({ id: p.id, name: p.name, instagram: p.instagram_business_account?.username || null })) };
  } catch (e) { return { ok: false, error: e.message }; }
}

// Step 2: connect the chosen Page (and its Instagram) and subscribe it to our webhook.
export async function connectFacebookPage(userToken, pageId) {
  const { biz, error } = await ctx();
  if (error) return { ok: false, error };
  const db = adminDb();
  if (!db) return { ok: false, error: "Server not configured (SUPABASE_SERVICE_ROLE_KEY missing)." };
  try {
    const page = (await pagesFor(String(userToken || ""))).find((p) => p.id === String(pageId));
    if (!page) return { ok: false, error: "That Page isn't available — log in again and pick it." };

    const { data: taken } = await db.from("businesses").select("id").eq("fb_page_id", page.id).neq("id", biz.id).limit(1).maybeSingle();
    if (taken) return { ok: false, error: "This Facebook Page is already connected to another NextReply account." };

    const sub = await fetch(`${G}/${page.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_echoes&access_token=${encodeURIComponent(page.access_token)}`, { method: "POST" });
    const subj = await sub.json();
    if (!sub.ok || subj.success !== true) return { ok: false, error: "Couldn't link the Page to the AI: " + (subj?.error?.message || "Facebook refused the subscription") };

    const ig = page.instagram_business_account || null;
    const { error: e } = await db.from("businesses").update({
      fb_page_id: page.id, fb_page_name: page.name, fb_page_token: page.access_token,
      ig_account_id: ig?.id || null, ig_username: ig?.username || null,
    }).eq("id", biz.id);
    if (e) return { ok: false, error: /fb_page|ig_account|column/.test(e.message) ? "Instagram & Messenger turn on after a quick database update by your provider." : e.message };
    revalidatePath("/channels");
    return { ok: true, page: page.name, instagram: ig?.username || null };
  } catch (e) { return { ok: false, error: e.message }; }
}

export async function disconnectFacebookPage() {
  const { biz, error } = await ctx();
  if (error) return { ok: false, error };
  const db = adminDb();
  if (biz.fb_page_id && biz.fb_page_token) {
    await fetch(`${G}/${biz.fb_page_id}/subscribed_apps?access_token=${encodeURIComponent(biz.fb_page_token)}`, { method: "DELETE" }).catch(() => {});
  }
  const { error: e } = await db.from("businesses").update({ fb_page_id: null, fb_page_name: null, fb_page_token: null, ig_account_id: null, ig_username: null }).eq("id", biz.id);
  if (e) return { ok: false, error: e.message };
  revalidatePath("/channels");
  return { ok: true };
}
