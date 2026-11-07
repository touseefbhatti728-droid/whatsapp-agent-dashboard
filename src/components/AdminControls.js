"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminUpdateBusiness, adminDisconnect, adminPauseAllChats } from "@/app/(admin)/admin/actions";
import { toast } from "@/lib/toast";

// Control room for one customer: every setting, editable by the admin, grouped in tabs.
const TABS = [
  {
    key: "profile", label: "Business", fields: [
      ["name", "Business name"], ["owner_email", "Owner email"], ["whatsapp_number", "WhatsApp number"],
      ["location", "Location"], ["timezone", "Timezone (e.g. Asia/Karachi)"], ["industry", "Industry"],
      ["website_url", "Website (https://…)"], ["hours", "Opening hours", "area"], ["services", "Services (text)", "area"],
    ],
  },
  {
    key: "ai", label: "AI receptionist", fields: [
      ["assistant_name", "Assistant name"], ["primary_language", "Language"], ["tone", "Tone"], ["reply_length", "Reply length"],
      ["use_emoji", "Use emoji", "bool"], ["use_formal", "Formal language", "bool"],
      ["first_greeting", "First greeting", "area"], ["final_message", "Closing message", "area"],
      ["ai_hours_enabled", "Only reply in AI working hours", "bool"], ["after_hours_message", "After-hours message", "area"],
      ["handover_pause_minutes", "Pause after a person replies (minutes)", "num"], ["handover_rules", "Hand-over rules", "area"],
      ["booking", "Booking rules", "area"], ["faq", "FAQ", "area"], ["knowledge", "Knowledge", "area"],
    ],
  },
  {
    key: "features", label: "Features", fields: [
      ["feedback_enabled", "Ask for feedback after visits", "bool"], ["feedback_delay_hours", "Feedback delay (hours)", "num"],
      ["google_review_url", "Google review link"],
      ["loyalty_enabled", "Loyalty rewards", "bool"], ["loyalty_visits", "Visits per reward", "num"], ["loyalty_reward", "Reward"],
      ["deposit_required", "Ask for a deposit", "bool"], ["deposit_amount", "Deposit amount"], ["currency", "Currency"],
      ["payment_link", "Payment link"], ["payment_instructions", "Other ways to pay", "area"],
      ["notify_template", "WhatsApp notify template name"], ["notify_template_lang", "Template language"],
    ],
  },
  {
    key: "integrations", label: "Integrations", fields: [
      ["calendar_id", "Google Calendar ID"], ["webhook_url", "CRM / Zapier webhook"],
    ],
  },
];

const CONNECTIONS = [
  ["whatsapp", "WhatsApp", (b) => !!b.meta_phone_number_id, (b) => b.whatsapp_number && `+${b.whatsapp_number}`],
  ["facebook", "Facebook Page + Instagram", (b) => !!b.fb_page_id, (b) => [b.fb_page_name, b.ig_username && `@${b.ig_username}`].filter(Boolean).join(" · ")],
  ["widget", "Website chat", (b) => !!b.widget_seen_at, (b) => b.widget_origin || b.website_url],
  ["shopify", "Shopify", (b) => !!b.shopify_domain, (b) => b.shopify_domain],
  ["calendar", "Google Calendar", (b) => !!b.calendar_id, (b) => b.calendar_id],
  ["crm", "CRM webhook", (b) => !!b.webhook_url, () => "set"],
  ["phone", "Phone line", (b) => !!b.vapi_assistant_id, (b) => b.voice_number],
];

export default function AdminControls({ biz }) {
  const router = useRouter();
  const [tab, setTab] = useState("profile");
  const [vals, setVals] = useState(biz);
  const [dirty, setDirty] = useState({});
  const [busy, setBusy] = useState("");
  const cur = TABS.find((t) => t.key === tab);

  function set(k, v) { setVals((x) => ({ ...x, [k]: v })); setDirty((d) => ({ ...d, [k]: true })); }
  async function save() {
    const patch = Object.fromEntries(Object.keys(dirty).map((k) => [k, vals[k]]));
    setBusy("save");
    const r = await adminUpdateBusiness({ id: biz.id, patch });
    setBusy("");
    if (!r?.ok) return toast.error("Not saved", r?.error);
    setDirty({}); toast.success("Saved", `${Object.keys(patch).length} setting${Object.keys(patch).length === 1 ? "" : "s"} updated for ${biz.name}.`);
    router.refresh();
  }
  async function cut(what, label) {
    if (!confirm(`Disconnect ${label} for ${biz.name}? They can connect it again from their dashboard.`)) return;
    setBusy(what);
    const r = await adminDisconnect({ id: biz.id, what });
    setBusy("");
    if (!r?.ok) return toast.error("Couldn't disconnect", r?.error);
    toast.success(`${label} disconnected`); router.refresh();
  }
  async function pauseAll(minutes) {
    setBusy("pause");
    const r = await adminPauseAllChats({ id: biz.id, minutes });
    setBusy("");
    if (!r?.ok) return toast.error("Couldn't change", r?.error);
    toast.success(minutes ? "AI paused on all recent chats" : "AI resumed on every chat"); router.refresh();
  }
  const nDirty = Object.keys(dirty).length;

  return (
    <section className="card overflow-hidden">
      <div className="admin-hero flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-base font-bold">Control room</h2>
          <p className="text-xs text-white/75">Change anything for {biz.name || "this customer"} — saved straight to their account.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={!!busy} onClick={() => pauseAll(240)} className="rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/25 disabled:opacity-50">Pause AI on all chats (4h)</button>
          <button disabled={!!busy} onClick={() => pauseAll(0)} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#5b21b6] hover:bg-white/90 disabled:opacity-50">Resume AI everywhere</button>
        </div>
      </div>

      {/* Connections */}
      <div className="grid gap-2 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-4">
        {CONNECTIONS.map(([key, label, isOn, detail]) => {
          const on = isOn(biz);
          return (
            <div key={key} className={`rounded-xl border p-3 ${on ? "border-emerald-200 bg-emerald-50/50" : "border-line bg-canvas/50"}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-text">{label}</p>
                <span className={`h-2 w-2 shrink-0 rounded-full ${on ? "bg-emerald-500" : "bg-line"}`} />
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted">{on ? detail(biz) || "Connected" : "Not connected"}</p>
              {on && <button disabled={busy === key} onClick={() => cut(key, label)} className="mt-2 text-[11px] font-semibold text-red-600 hover:underline">{busy === key ? "…" : "Disconnect"}</button>}
            </div>
          );
        })}
      </div>

      {/* Settings tabs */}
      <div className="flex flex-wrap gap-1 border-b border-line px-4 pt-3">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-t-lg px-3.5 py-2 text-sm font-semibold transition ${tab === t.key ? "bg-brand-tint text-brand-dark" : "text-muted hover:text-text"}`}>{t.label}</button>
        ))}
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        {cur.fields.map(([k, label, type]) => (
          <label key={k} className={`block ${type === "area" ? "md:col-span-2" : ""}`}>
            {type === "bool" ? (
              <span className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-3">
                <span className="text-sm font-medium text-text">{label}</span>
                <button type="button" onClick={() => set(k, !vals[k])} className={`relative h-6 w-11 shrink-0 rounded-full transition ${vals[k] ? "bg-brand" : "bg-line"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${vals[k] ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </span>
            ) : (
              <>
                <span className="text-xs font-medium text-muted">{label}{dirty[k] && <span className="ml-1 text-brand">•</span>}</span>
                {type === "area"
                  ? <textarea rows={3} value={vals[k] ?? ""} onChange={(e) => set(k, e.target.value)} className="field mt-1 resize-y" />
                  : <input type={type === "num" ? "number" : "text"} value={vals[k] ?? ""} onChange={(e) => set(k, e.target.value)} className="field mt-1" />}
              </>
            )}
          </label>
        ))}
      </div>
      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur">
        <p className="text-xs text-muted">{nDirty ? `${nDirty} unsaved change${nDirty === 1 ? "" : "s"}` : "All changes saved"}</p>
        <div className="flex gap-2">
          {nDirty > 0 && <button onClick={() => { setVals(biz); setDirty({}); }} className="btn-ghost text-sm">Discard</button>}
          <button disabled={!nDirty || busy === "save"} onClick={save} className="btn-brand text-sm">{busy === "save" ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </section>
  );
}
