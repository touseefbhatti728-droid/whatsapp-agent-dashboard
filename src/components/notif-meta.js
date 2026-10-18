// Shared look for each alert type (bell list, Notifications page, live pop-ups).
const P = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

export const NOTIF_META = {
  booking: { bg: "#efeafe", fg: "#5b4de0", icon: (<svg {...P}><rect x="3" y="4" width="18" height="18" rx="2.5" /><path d="M16 2v4M8 2v4M3 10h18M9 15l2 2 4-4" /></svg>) },
  handover: { bg: "#fff4e0", fg: "#c26a00", icon: (<svg {...P}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M12 7v4M12 14h.01" /></svg>) },
  limit: { bg: "#fde8e8", fg: "#c0262d", icon: (<svg {...P}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>) },
  billing: { bg: "#e7f8ee", fg: "#16884a", icon: (<svg {...P}><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /></svg>) },
  whatsapp: { bg: "#e7f8ee", fg: "#16884a", icon: (<svg {...P}><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l1.9-5.7A8.4 8.4 0 1 1 21 11.5z" /></svg>) },
  test: { bg: "#efeafe", fg: "#5b4de0", icon: (<svg {...P}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>) },
};

export function metaFor(type) {
  return NOTIF_META[type] || NOTIF_META.test;
}

export function NotifIcon({ type, size = 36 }) {
  const m = metaFor(type);
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, background: m.bg, color: m.fg }}>
      {m.icon}
    </span>
  );
}

export function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
