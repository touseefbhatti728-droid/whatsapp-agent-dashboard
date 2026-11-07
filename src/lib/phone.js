// WhatsApp numbers are stored as digits with the country code ("31687224652").
// Old rows may have "+31…", "0031…" or spaces — normalise before showing or saving.
export function phoneDigits(v) {
  return String(v || "").replace(/\D/g, "").replace(/^00/, "");
}

export function formatPhone(v) {
  if (String(v || "").startsWith("web:")) return "Website visitor";
  if (String(v || "").startsWith("fb:")) return "Messenger user";
  if (String(v || "").startsWith("ig:")) return "Instagram user";
  const d = phoneDigits(v);
  return d ? `+${d}` : "";
}

// Where a booking came from, for labels in the calendar and client lists.
export function sourceLabel(source) {
  return { dashboard: "Added by you", website: "Website chat AI", booking_page: "Online booking page", messenger: "Messenger AI", instagram: "Instagram AI", phone: "Phone AI" }[source] || "WhatsApp AI";
}

// Which channel a chat is on, from its customer key (web:… fb:… ig:… or phone digits).
export function channelOf(key) {
  const k = String(key || "");
  if (k.startsWith("web:")) return "web";
  if (k.startsWith("fb:")) return "messenger";
  if (k.startsWith("ig:")) return "instagram";
  return "whatsapp";
}
export const CHANNELS = {
  whatsapp: { label: "WhatsApp", short: "WA", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  web: { label: "Website", short: "Web", cls: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  messenger: { label: "Messenger", short: "FB", cls: "bg-blue-50 text-blue-700", dot: "bg-blue-600" },
  instagram: { label: "Instagram", short: "IG", cls: "bg-pink-50 text-pink-700", dot: "bg-pink-500" },
  phone: { label: "Phone call", short: "Call", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
};
// Who wrote a saved message: the customer, the AI, or a person from the business.
export function senderOf(m) {
  if (m.role === "user") return "customer";
  if (m.role === "staff") return "staff";
  return "ai";
}
