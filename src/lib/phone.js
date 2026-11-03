// WhatsApp numbers are stored as digits with the country code ("31687224652").
// Old rows may have "+31…", "0031…" or spaces — normalise before showing or saving.
export function phoneDigits(v) {
  return String(v || "").replace(/\D/g, "").replace(/^00/, "");
}

export function formatPhone(v) {
  const d = phoneDigits(v);
  return d ? `+${d}` : "";
}
