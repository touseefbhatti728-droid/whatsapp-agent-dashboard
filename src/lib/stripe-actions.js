"use server";

import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/admin-db";
import { voicePrice, voiceItem } from "@/lib/stripe-voice";
import { voicePlanByKey, voiceAddonByKey } from "@/lib/voice-plans";

const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
};

const TRIAL_DAYS = 7;

async function myBusiness(supabase, userId) {
  const { data } = await supabase
    .from("businesses")
    .select("id, stripe_customer_id, sub_status")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

// Called by the Upgrade / Start trial button. Creates a Stripe Checkout Session and
// returns the hosted checkout URL. First-time customers get a 7-day free trial
// (card required; Stripe charges automatically when the trial ends).
export async function createCheckoutSession(planName, voiceKey) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return { ok: false, error: "Payments not configured yet." };

  const plan = String(planName || "").toLowerCase();
  const price = PRICE_IDS[plan];
  if (!price) return { ok: false, error: "This plan is not available for checkout." };

  const biz = await myBusiness(supabase, user.id);
  if (!biz) return { ok: false, error: "No business found for this account." };

  // Already subscribed → change plan in the billing portal instead of a second subscription.
  if (biz.stripe_customer_id && (biz.sub_status === "active" || biz.sub_status === "trialing" || biz.sub_status === "past_due")) {
    return createBillingPortalSession();
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || "https://app.nextreply.io";
  const stripe = new Stripe(secret);
  // Optional voice plan bought together with the main plan (one subscription, one bill).
  const lineItems = [{ price, quantity: 1 }];
  if (voiceKey && voicePlanByKey(voiceKey)) {
    try { lineItems.push({ price: (await voicePrice(stripe, voiceKey)).id, quantity: 1 }); }
    catch (e) { return { ok: false, error: "Voice plan unavailable: " + e.message }; }
  }

  // One free trial per business: anyone who has been a Stripe customer before pays from day one.
  const trialEligible = !biz.stripe_customer_id;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: lineItems,
      success_url: `${base}/billing?success=1`,
      cancel_url: `${base}/billing?canceled=1`,
      client_reference_id: biz.id,
      ...(biz.stripe_customer_id
        ? { customer: biz.stripe_customer_id }
        : { customer_email: user.email }),
      payment_method_collection: "always",
      subscription_data: {
        metadata: { business_id: biz.id, plan },
        ...(trialEligible
          ? { trial_period_days: TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: "cancel" } } }
          : {}),
      },
      metadata: { business_id: biz.id, plan },
      allow_promotion_codes: true,
    });
    return { ok: true, url: session.url };
  } catch (e) {
    return { ok: false, error: e.message || "Could not start checkout." };
  }
}

// "Manage subscription" — Stripe's hosted portal: cancel, change plan, update card, invoices.
export async function createBillingPortalSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return { ok: false, error: "Payments not configured yet." };

  const biz = await myBusiness(supabase, user.id);
  if (!biz?.stripe_customer_id) return { ok: false, error: "No subscription yet — start a plan first." };

  const base = process.env.NEXT_PUBLIC_APP_URL || "https://app.nextreply.io";
  try {
    const stripe = new Stripe(secret);
    const portal = await stripe.billingPortal.sessions.create({
      customer: biz.stripe_customer_id,
      return_url: `${base}/billing`,
    });
    return { ok: true, url: portal.url };
  } catch (e) {
    return { ok: false, error: e.message || "Could not open billing portal." };
  }
}

// ---- Voice plans: added to the same subscription, so it is one bill ----
async function activeSubscription(stripe, customerId) {
  const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
  return subs.data.find((x) => ["active", "trialing", "past_due"].includes(x.status)) || null;
}

// Pick, change or remove (key = null) the voice plan on the current subscription.
export async function setVoicePlan(key) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return { ok: false, error: "Payments not configured yet." };
  const plan = key ? voicePlanByKey(key) : null;
  if (key && !plan) return { ok: false, error: "Unknown voice plan." };
  const biz = await myBusiness(supabase, user.id);
  if (!biz) return { ok: false, error: "No business found for this account." };
  if (!biz.stripe_customer_id) return { ok: false, needsPlan: true, error: "Choose a main plan first — the voice plan is added to it." };
  const db = adminDb();
  if (!db) return { ok: false, error: "Server not configured." };

  const stripe = new Stripe(secret);
  try {
    const sub = await activeSubscription(stripe, biz.stripe_customer_id);
    if (!sub) return { ok: false, needsPlan: true, error: "No active subscription — choose a main plan first." };
    const item = voiceItem(sub);
    // Paying customers pay the prorated difference now; on a trial it starts with the plan.
    const proration_behavior = sub.status === "active" ? "always_invoice" : "create_prorations";
    if (!plan) {
      if (item) await stripe.subscriptionItems.del(item.id, { proration_behavior: "create_prorations" });
    } else {
      const price = await voicePrice(stripe, plan.key);
      if (item) {
        if (item.price.id !== price.id) await stripe.subscriptionItems.update(item.id, { price: price.id, proration_behavior });
      } else {
        await stripe.subscriptionItems.create({ subscription: sub.id, price: price.id, quantity: 1, proration_behavior });
      }
    }
    const { data: cur } = await db.from("businesses").select("voice_plan, voice_period_start").eq("id", biz.id).maybeSingle();
    const fields = plan
      ? { voice_plan: plan.key, voice_minutes_included: plan.minutes, ...(cur?.voice_plan ? {} : { voice_minutes_used: 0, voice_period_start: new Date().toISOString() }) }
      : { voice_plan: null, voice_minutes_included: 0 };
    const { error } = await db.from("businesses").update(fields).eq("id", biz.id);
    if (error) return { ok: false, error: /column/.test(error.message) ? "Voice plans need a quick database update (run the voice SQL)." : error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || "Could not change the voice plan." };
  }
}

// One-time pack of extra minutes (Stripe Checkout).
export async function buyVoiceAddon(key) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return { ok: false, error: "Payments not configured yet." };
  const addon = voiceAddonByKey(key);
  if (!addon) return { ok: false, error: "Unknown add-on." };
  const biz = await myBusiness(supabase, user.id);
  if (!biz) return { ok: false, error: "No business found for this account." };
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://app.nextreply.io";
  try {
    const stripe = new Stripe(secret);
    const price = await voicePrice(stripe, addon.key);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${base}/billing?voice=1`,
      cancel_url: `${base}/billing`,
      client_reference_id: biz.id,
      ...(biz.stripe_customer_id ? { customer: biz.stripe_customer_id } : { customer_email: user.email, customer_creation: "always" }),
      metadata: { business_id: biz.id, kind: "voice_addon", minutes: String(addon.minutes), key: addon.key },
    });
    return { ok: true, url: session.url };
  } catch (e) {
    return { ok: false, error: e.message || "Could not start checkout." };
  }
}
