"use server";

import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

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
export async function createCheckoutSession(planName) {
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

  // One free trial per business: anyone who has been a Stripe customer before pays from day one.
  const trialEligible = !biz.stripe_customer_id;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
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
