// Phone receptionist (voice) pricing. Monthly plans add minutes every month;
// add-ons are one-time packs of extra minutes that don't expire at month end.
export const VOICE_PLANS = [
  { key: "voice_plan_120", name: "Voice 120", minutes: 120, usd: 35, note: "For quiet lines" },
  { key: "voice_plan_250", name: "Voice 250", minutes: 250, usd: 70, note: "Most businesses", popular: true },
  { key: "voice_plan_500", name: "Voice 500", minutes: 500, usd: 120, note: "Busy front desks" },
];
export const VOICE_ADDONS = [
  { key: "voice_addon_60", name: "+60 minutes", minutes: 60, usd: 20 },
  { key: "voice_addon_150", name: "+150 minutes", minutes: 150, usd: 45 },
  { key: "voice_addon_400", name: "+400 minutes", minutes: 400, usd: 110 },
];
export const voicePlanByKey = (k) => VOICE_PLANS.find((p) => p.key === k) || null;
export const voiceAddonByKey = (k) => VOICE_ADDONS.find((p) => p.key === k) || null;

// Minutes left this month: what's left of the plan + any add-on minutes.
export function voiceRemaining(b) {
  const inc = Number(b?.voice_minutes_included) || 0;
  const used = Number(b?.voice_minutes_used) || 0;
  const addon = Number(b?.voice_addon_minutes) || 0;
  return Math.max(0, inc - used) + Math.max(0, addon);
}
