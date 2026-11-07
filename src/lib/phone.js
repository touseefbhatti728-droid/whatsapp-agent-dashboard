// WhatsApp numbers are stored as digits with the country code ("31687224652").
// Old rows may have "+31…", "0031…" or spaces — normalise before showing or saving.
export function phoneDigits(v) {
  return String(v || "").replace(/\D/g, "").replace(/^00/, "");
}

export function formatPhone(v) {
  if (String(v || "").startsWith("web:")) return "Website visitor";
  const d = phoneDigits(v);
  return d ? `+${d}` : "";
}

// Where a booking came from, for labels in the calendar and client lists.
export function sourceLabel(source) {
  return { dashboard: "Added by you", website: "Website chat AI", booking_page: "Online booking page" }[source] || "WhatsApp AI";
}
