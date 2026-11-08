import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { notifyBusiness } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DB plan names are "Starter" / "Pro" / "Business" — always store that exact spelling.
const PLAN_NAME = { starter: "Starter", pro: "Pro", business: "Business" };
const canonical = (p) => (p ? PLAN_NAME[String(p).toLowerCase()] || p : p);

// Stripe moved current_period_end onto subscription items in newer API versions.
function periodEnd(sub) {
  const t = sub.current_period_end
    || (sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].current_period_end)
    || sub.trial_end;
  return t ? new Date(t * 1000).toISOString() : null;
}

function planByPrice() {
  const m = {};
  if (process.env.STRIPE_PRICE_STARTER) m[process.env.STRIPE_PRICE_STARTER] = "starter";
  if (process.env.STRIPE_PRICE_PRO) m[process.env.STRIPE_PRICE_PRO] = "pro";
  if (process.env.STRIPE_PRICE_BUSINESS) m[process.env.STRIPE_PRICE_BUSINESS] = "business";
  return m;
}

// The main plan item (a subscription can also carry a voice item).
function mainPriceId(sub) {
  const map = planByPrice();
  const items = (sub.items && sub.items.data) || [];
  const it = items.find((i) => i.price && map[i.price.id]) || items.find((i) => !String((i.price && i.price.lookup_key) || "").startsWith("voice_")) || items[0];
  return it && it.price && it.price.id;
}
const VOICE_MINUTES = { voice_plan_120: 120, voice_plan_250: 250, voice_plan_600: 600 };

// Keep the voice plan in step with the subscription, and start a fresh minute count each billing month.
async function syncVoice(admin, businessId, sub, status) {
  const items = (sub.items && sub.items.data) || [];
  const item = items.find((i) => String((i.price && i.price.lookup_key) || "").startsWith("voice_plan_"));
  const key = item && status !== "cancelled" ? item.price.lookup_key : null;
  const { data: cur, error: e0 } = await admin.from("businesses").select("voice_plan, voice_period_start").eq("id", businessId).maybeSingle();
  if (e0) return; // voice columns not added yet
  const fields = { voice_plan: key, voice_minutes_included: key ? (VOICE_MINUTES[key] || 0) : 0 };
  const startTs = (item && item.current_period_start) || sub.current_period_start;
  if (key && startTs) {
    const start = new Date(startTs * 1000);
    const prev = cur && cur.voice_period_start ? new Date(cur.voice_period_start) : null;
    if (!prev || start - prev > 3600000) { fields.voice_period_start = start.toISOString(); fields.voice_minutes_used = 0; }
  }
  const { error } = await admin.from("businesses").update(fields).eq("id", businessId);
  console.log("STRIPE WEBHOOK voice ->", businessId, JSON.stringify(fields), error ? error.message : "OK");
}

const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "");
const fmtDay = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null);

async function alertOwner(businessId, n) {
  try { await notifyBusiness(businessId, { type: "billing", url: "/billing", ...n }); }
  catch (e) { console.log("STRIPE WEBHOOK alert failed:", e.message); }
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
    if (event.type === "checkout.session.completed" && event.data.object.metadata && event.data.object.metadata.kind === "voice_addon") {
      const s = event.data.object;
      const businessId = s.client_reference_id || s.metadata.business_id;
      const minutes = Number(s.metadata.minutes) || 0;
      if (businessId && minutes > 0 && s.payment_status === "paid") {
        const { data: cur } = await admin.from("businesses").select("voice_addon_minutes, stripe_customer_id").eq("id", businessId).maybeSingle();
        const fields = { voice_addon_minutes: (Number(cur && cur.voice_addon_minutes) || 0) + minutes };
        if (!(cur && cur.stripe_customer_id) && s.customer) fields.stripe_customer_id = s.customer;
        const { error } = await admin.from("businesses").update(fields).eq("id", businessId);
        console.log("STRIPE WEBHOOK voice add-on ->", businessId, minutes, error ? error.message : "OK");
        if (!error) await alertOwner(businessId, { title: `${minutes} extra call minutes added`, body: "Your phone receptionist can keep answering.", tag: "billing-voice" });
      }
    } else if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const businessId = s.client_reference_id || (s.metadata && s.metadata.business_id);
      let plan = s.metadata && s.metadata.plan;
      let status = "active";
      let renews = null;
      let customerId = s.customer || null;

      if (s.subscription) {
        const sub = await stripe.subscriptions.retrieve(s.subscription);
        status = mapStatus(sub.status);
        renews = periodEnd(sub);
        customerId = sub.customer || customerId;
        const priceId = mainPriceId(sub);
        if (!plan && priceId) plan = planByPrice()[priceId];
        if (businessId) await syncVoice(admin, businessId, sub, status);
      }

      if (businessId) {
        const fields = { sub_status: status };
        if (plan) fields.plan = canonical(plan);
        if (renews) fields.renews_at = renews;
        if (customerId) fields.stripe_customer_id = customerId;
        const { error } = await admin.from("businesses").update(fields).eq("id", businessId);
        console.log("STRIPE WEBHOOK checkout ->", businessId, JSON.stringify(fields), error ? error.message : "OK");
        if (!error) {
          await alertOwner(businessId, status === "trialing"
            ? { title: `${(canonical(plan)) || "Your"} plan — free trial started`, body: renews ? `Your first payment is on ${fmtDay(renews)}.` : "Enjoy your free trial.", tag: "billing-checkout" }
            : { title: `${(canonical(plan)) || "Your"} plan is active`, body: "Payment received. Your AI front desk keeps working.", tag: "billing-checkout" });
        }
      } else {
        console.log("STRIPE WEBHOOK: no business_id on checkout session");
      }
    } else if (event.type.indexOf("customer.subscription.") === 0) {
      const sub = event.data.object;
      const businessId = sub.metadata && sub.metadata.business_id;
      const priceId = mainPriceId(sub);
      const plan = canonical(planByPrice()[priceId] || (sub.metadata && sub.metadata.plan));
      const status = mapStatus(sub.status);
      const renews = periodEnd(sub);

      if (businessId) {
        const fields = { sub_status: status };
        if (plan && status !== "cancelled") fields.plan = plan;
        if (renews) fields.renews_at = renews;
        const { error } = await admin.from("businesses").update(fields).eq("id", businessId);
        console.log("STRIPE WEBHOOK sub ->", businessId, JSON.stringify(fields), error ? error.message : "OK");
        await syncVoice(admin, businessId, sub, status);

        // Alert only on real changes (Stripe sends many small updates).
        const prev = (event.data.previous_attributes || {});
        const prevStatus = prev.status ? mapStatus(prev.status) : null;
        if (!error && event.type === "customer.subscription.deleted") {
          await alertOwner(businessId, { title: "Subscription cancelled", body: "Choose a plan to keep your AI front desk running.", tag: "billing-status" });
        } else if (!error && prevStatus && prevStatus !== status) {
          if (status === "past_due") {
            await alertOwner(businessId, { title: "Payment failed — please update your card", body: "We couldn't charge your card. Please check it with your bank — Stripe will retry automatically.", tag: "billing-status" });
          } else if (status === "active" && prevStatus === "trialing") {
            await alertOwner(businessId, { title: `Trial ended — ${(canonical(plan)) || "your"} plan is now active`, body: renews ? `Next renewal: ${fmtDay(renews)}.` : "Payment received.", tag: "billing-status" });
          } else if (status === "active" && prevStatus === "past_due") {
            await alertOwner(businessId, { title: "Payment received — you're all set", body: "Thanks! Your subscription is active again.", tag: "billing-status" });
          } else if (status === "cancelled") {
            await alertOwner(businessId, { title: "Subscription cancelled", body: "Choose a plan to keep your AI front desk running.", tag: "billing-status" });
          }
        } else if (!error && prev.items && plan && status !== "cancelled") {
          await alertOwner(businessId, { title: `Plan changed to ${cap(plan)}`, body: "Your new plan limits apply right away.", tag: "billing-plan" });
        } else if (!error && prev.cancel_at_period_end === false && sub.cancel_at_period_end) {
          await alertOwner(businessId, { title: "Subscription will end", body: renews ? `Your plan stays active until ${fmtDay(renews)}.` : "Your plan will not renew.", tag: "billing-status" });
        }
      } else {
        console.log("STRIPE WEBHOOK: no business_id on subscription");
      }
    }
  } catch (e) {
    console.log("STRIPE WEBHOOK error:", e.message);
  }

  return new Response("ok", { status: 200 });
}
