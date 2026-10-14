import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function planByPrice() {
  const m = {};
  if (process.env.STRIPE_PRICE_STARTER) m[process.env.STRIPE_PRICE_STARTER] = "starter";
  if (process.env.STRIPE_PRICE_PRO) m[process.env.STRIPE_PRICE_PRO] = "pro";
  if (process.env.STRIPE_PRICE_BUSINESS) m[process.env.STRIPE_PRICE_BUSINESS] = "business";
  return m;
}

function mapStatus(s) {
  const m = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    unpaid: "past_due",
    incomplete: "past_due",
    incomplete_expired: "cancelled",
    canceled: "cancelled",
    paused: "past_due",
  };
  return m[s] || s || null;
}

export async function POST(req) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whsec) return new Response("not configured", { status: 500 });

  const stripe = new Stripe(secret);
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whsec);
  } catch (e) {
    return new Response("bad signature", { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const businessId = s.client_reference_id || (s.metadata && s.metadata.business_id);
      let plan = s.metadata && s.metadata.plan;
      let status = "active";
      let renews = null;
      let customerId = s.customer || null;

      if (s.subscription) {
        const sub = await stripe.subscriptions.retrieve(s.subscription);
        status = mapStatus(sub.status);
        renews = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
        customerId = sub.customer || customerId;
        const priceId = sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].price && sub.items.data[0].price.id;
        if (!plan && priceId) plan = planByPrice()[priceId];
      }

      if (businessId) {
        const fields = { sub_status: status };
        if (plan) fields.plan = plan;
        if (renews) fields.renews_at = renews;
        if (customerId) fields.stripe_customer_id = customerId;
        const { error } = await admin.from("businesses").update(fields).eq("id", businessId);
        console.log("STRIPE WEBHOOK checkout ->", businessId, JSON.stringify(fields), error ? error.message : "OK");
      } else {
        console.log("STRIPE WEBHOOK: no business_id on checkout session");
      }
    } else if (event.type.indexOf("customer.subscription.") === 0) {
      const sub = event.data.object;
      const businessId = sub.metadata && sub.metadata.business_id;
      const priceId = sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].price && sub.items.data[0].price.id;
      const plan = planByPrice()[priceId];
      const status = mapStatus(sub.status);
      const renews = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

      if (businessId) {
        const fields = { sub_status: status };
        if (plan && status !== "cancelled") fields.plan = plan;
        if (renews) fields.renews_at = renews;
        const { error } = await admin.from("businesses").update(fields).eq("id", businessId);
        console.log("STRIPE WEBHOOK sub ->", businessId, JSON.stringify(fields), error ? error.message : "OK");
      } else {
        console.log("STRIPE WEBHOOK: no business_id on subscription");
      }
    }
  } catch (e) {
    console.log("STRIPE WEBHOOK error:", e.message);
  }

  return new Response("ok", { status: 200 });
}
