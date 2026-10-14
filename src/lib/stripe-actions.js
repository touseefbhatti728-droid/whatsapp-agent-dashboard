"use server";

import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  business: process.env.STRIPE_PRICE_BUSINESS,
};

// Called by the Upgrade button. Creates a Stripe Checkout Session for the
// logged-in user's business and returns the hosted checkout URL to redirect to.
export async function createCheckoutSession(planName) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return { ok: false, error: "Payments not configured yet." };

  const plan = String(planName || "").toLowerCase();
  const price = PRICE_IDS[plan];
  if (!price) return { ok: false, error: "This plan is not available for checkout." };

  const { data: biz } = await supabase
    .from("businesses")
    .select("id, stripe_customer_id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!biz) return { ok: false, error: "No business found for this account." };

  const base = process.env.NEXT_PUBLIC_APP_URL || "https://app.nextreply.io";
  const stripe = new Stripe(secret);

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
      subscription_data: { metadata: { business_id: biz.id, plan } },
      metadata: { business_id: biz.id, plan },
      allow_promotion_codes: true,
    });
    return { ok: true, url: session.url };
  } catch (e) {
    return { ok: false, error: e.message || "Could not start checkout." };
  }
}
