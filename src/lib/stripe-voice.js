import { VOICE_PLANS, VOICE_ADDONS } from "@/lib/voice-plans";

// Finds the Stripe price for a voice plan / add-on by its lookup key, creating the
// product and price the first time. So the whole voice setup lives in Stripe without
// anyone copying price IDs around.
export async function voicePrice(stripe, key) {
  const plan = VOICE_PLANS.find((p) => p.key === key);
  const addon = VOICE_ADDONS.find((p) => p.key === key);
  const def = plan || addon;
  if (!def) throw new Error("Unknown voice plan.");
  const found = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  if (found.data[0]) return found.data[0];
  const product = await stripe.products.create({
    name: plan ? `Phone receptionist — ${def.minutes} minutes / month` : `Phone receptionist — ${def.minutes} extra minutes`,
    description: plan ? `AI phone receptionist, ${def.minutes} call minutes every month.` : `One-time pack of ${def.minutes} extra call minutes (no expiry at month end).`,
    metadata: { kind: plan ? "voice_plan" : "voice_addon", minutes: String(def.minutes), key },
  });
  return stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: Math.round(def.usd * 100),
    lookup_key: key,
    ...(plan ? { recurring: { interval: "month" } } : {}),
    metadata: { kind: plan ? "voice_plan" : "voice_addon", minutes: String(def.minutes), key },
  });
}

export async function ensureAllVoicePrices(stripe) {
  const out = [];
  for (const d of [...VOICE_PLANS, ...VOICE_ADDONS]) {
    const p = await voicePrice(stripe, d.key);
    out.push({ key: d.key, name: d.name, usd: d.usd, minutes: d.minutes, priceId: p.id, recurring: !!p.recurring });
  }
  return out;
}

// The voice item on a subscription, if any.
export function voiceItem(sub) {
  return (sub?.items?.data || []).find((i) => String(i.price?.lookup_key || "").startsWith("voice_plan_")) || null;
}
