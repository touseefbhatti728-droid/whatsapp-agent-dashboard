import { createClient } from "@/lib/supabase/server";

function hexToRgb(hex) {
  const h = (hex || "").replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return [r, g, b];
}
function triplet(r, g, b) { return `${r} ${g} ${b}`; }

export function deriveVars(hex) {
  let [r, g, b] = hexToRgb(hex);
  if ([r, g, b].some((v) => Number.isNaN(v))) { r = 15; g = 157; b = 106; }
  const dark = [r, g, b].map((v) => Math.round(v * 0.82));
  const tint = [r, g, b].map((v) => Math.round(v + (255 - v) * 0.88));
  return { brandRgb: triplet(r, g, b), brandDarkRgb: triplet(dark[0], dark[1], dark[2]), brandTintRgb: triplet(tint[0], tint[1], tint[2]) };
}

export async function getBranding() {
  const fallback = { app_name: "Booking Agent", brand_color: "#0f9d6a" };
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("settings").select("app_name, brand_color").eq("id", 1).single();
    const app_name = data?.app_name || fallback.app_name;
    const brand_color = data?.brand_color || fallback.brand_color;
    return { app_name, brand_color, ...deriveVars(brand_color) };
  } catch {
    return { ...fallback, ...deriveVars(fallback.brand_color) };
  }
}
