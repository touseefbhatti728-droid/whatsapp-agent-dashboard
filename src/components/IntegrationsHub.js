"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveIntegrationField } from "@/lib/integration-actions";
import IntegrationsForm from "@/components/IntegrationsForm";
import { toast } from "@/lib/toast";
import BrandLogo from "@/components/BrandLogo";

// Our own features (no outside brand) get a simple icon on a brand-coloured tile.
const OWN_ICONS = {
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />,
};
function Logo({ item }) {
  if (item.logo) return <BrandLogo name={item.logo} size={40} />;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand" style={{ boxShadow: "inset 0 0 0 1px rgb(var(--brand-rgb) / 0.15)" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{OWN_ICONS[item.icon]}</svg>
    </span>
  );
}

const CAL_SA = "salon-calendar@gen-lang-client-0673531342.iam.gserviceaccount.com";

// One entry per integration: where it connects, and the steps to set it up.
const ITEMS = [
  {
    id: "whatsapp", logo: "whatsapp", icon: "", group: "channels", name: "WhatsApp Business", mark: "WA", color: "bg-emerald-500",
    what: "Your AI answers, books and follows up on your WhatsApp number.",
    href: "/connect-whatsapp", cta: "Connect WhatsApp",
    steps: ["Open Connect WhatsApp and press Continue with Facebook.", "Log in with the Facebook account that manages your business.", "Pick (or create) your WhatsApp Business account and your number.", "Done — send a test message to your number."],
  },
  {
    id: "widget", logo: "", icon: "chat", group: "website", name: "Website chat widget", mark: "Web", color: "bg-sky-500",
    what: "A chat bubble on your website that answers and books 24/7.",
    href: "/website", cta: "Get the code",
    steps: ["Open Website & booking and copy the one-line code.", "Paste it before </body> on your site (Wix: Settings → Custom code; Squarespace: Code injection).", "Open your site — the bubble appears bottom right. It shows Connected here once a visitor loads it."],
  },
  {
    id: "wordpress", logo: "wordpress", icon: "", group: "website", name: "WordPress plugin", mark: "WP", color: "bg-slate-700",
    what: "Chat bubble + booking page on WordPress without touching code.",
    href: "/downloads/nextreply-wordpress.zip", cta: "Download plugin", external: true,
    steps: ["Download the plugin (.zip).", "WordPress → Plugins → Add New → Upload Plugin → choose the zip → Install → Activate.", "Open the new NextReply menu in WordPress and press Connect to NextReply.", "Optional: put [nextreply_booking] on any page to show your booking calendar."],
  },
  {
    id: "booking", logo: "", icon: "calendar", group: "website", name: "Online booking page", mark: "Book", color: "bg-violet-500",
    what: "A page where customers pick a service and time — share the link anywhere.",
    href: "/website", cta: "Open booking page",
    steps: ["Open Website & booking to copy your booking link.", "Add it to your Instagram bio, Google profile and website button.", "Bookings appear in your calendar straight away."],
  },
  {
    id: "messenger", logo: "messenger", icon: "", group: "channels", name: "Facebook Messenger", mark: "FB", color: "bg-blue-600", valueKey: "fb_page_name",
    what: "The AI answers messages to your Facebook Page.",
    href: "/channels", cta: "Connect Facebook Page",
    steps: ["Open Instagram & Messenger and press Connect with Facebook.", "Choose your Facebook Page and allow the permissions.", "Send your Page a message to test."],
  },
  {
    id: "instagram", logo: "instagram", icon: "", group: "channels", name: "Instagram DMs", mark: "IG", color: "bg-pink-500", valueKey: "ig_username",
    what: "The AI answers Instagram direct messages.",
    href: "/channels", cta: "Connect Instagram",
    steps: ["Your Instagram must be a Business/Creator account linked to your Facebook Page (Instagram app → Settings → Account type).", "Open Instagram & Messenger and connect your Facebook Page — the linked Instagram is picked up.", "In the Instagram app: Settings → Messages → Allow access to messages → On."],
  },
  {
    id: "leadads", logo: "facebook", icon: "", group: "channels", name: "Facebook Lead Ads", mark: "Ads", color: "bg-indigo-500",
    what: "New leads from your Facebook/Instagram ads get a WhatsApp message in seconds.",
    href: "/channels", cta: "Set up",
    steps: ["Connect your Facebook Page first (Messenger above).", "Run a Lead Ad on that Page — new leads land in Leads automatically.", "Set the WhatsApp template for new leads on the Leads page."],
  },
  {
    id: "shopify", logo: "shopify", icon: "", group: "website", name: "Shopify", mark: "Shop", color: "bg-lime-600", valueKey: "shopify_domain",
    what: "The AI tells customers where their order is and answers product questions.",
    href: "/channels", cta: "Connect Shopify",
    steps: ["Open Instagram & Messenger → Shopify card.", "Enter your store address (yourstore.myshopify.com) and an Admin API access token with read orders.", "Add the website chat code to your Shopify theme (Online Store → Themes → Edit code → theme.liquid, before </body>)."],
  },
  {
    id: "calendar", logo: "googlecalendar", icon: "", group: "tools", name: "Google Calendar", mark: "Cal", color: "bg-blue-500", field: "calendar_id",
    what: "Every booking is added to your Google Calendar.",
    placeholder: "you@gmail.com",
    steps: ["Open Google Calendar → Settings → your calendar → Share with specific people.", `Add ${CAL_SA} with “Make changes to events”.`, "Copy the Calendar ID (Integrate calendar section — often your Gmail address) and paste it here."],
  },
  {
    id: "payments", logo: "stripe", icon: "", group: "tools", name: "Payments & deposits", mark: "Pay", color: "bg-amber-500", field: "payment_link",
    what: "The AI sends your payment link for deposits and invoices.",
    placeholder: "https://buy.stripe.com/…",
    steps: ["Create a payment link in Stripe, PayPal or your bank app.", "Paste it here. Set deposit rules in Payments & follow-ups."],
  },
  {
    id: "reviews", logo: "google", icon: "", group: "tools", name: "Google reviews", mark: "★", color: "bg-yellow-500", field: "google_review_url",
    what: "Happy customers are sent your Google review link after their visit.",
    placeholder: "https://g.page/r/…/review",
    steps: ["Search your business on Google → Ask for reviews → copy the link.", "Paste it here. Feedback timing is in Payments & follow-ups."],
  },
  {
    id: "phone", logo: "", icon: "phone", group: "channels", name: "Phone receptionist", mark: "Call", color: "bg-orange-500", paidOnly: true, valueKey: "voice_number",
    what: "An AI answers your phone calls, books appointments and sends you a summary.",
    href: "/phone", cta: "Set up phone line",
    steps: ["Available on paid plans.", "Open Phone receptionist and press Get a number.", "Forward your existing number to it, or share the new number."],
  },
  {
    id: "leadhook", logo: "googlesheets", icon: "", group: "tools", name: "Website forms → Leads", mark: "Form", color: "bg-teal-500",
    what: "Send any form (Elementor, Typeform, Google Forms via Zapier) into your Leads.",
    href: "/leads", cta: "Get the form link",
    steps: ["Open Leads and copy your lead webhook link.", "Point your form's webhook (or a Zapier step) to it.", "Each new form lead gets a WhatsApp message and appears in Leads."],
  },
  {
    id: "crm", logo: "zapier", icon: "", group: "tools", name: "CRM / Zapier / Make", mark: "API", color: "bg-gray-700", businessOnly: true, inlineCrm: true,
    what: "Send every new booking to HubSpot, Zoho, Google Sheets or any tool.",
    steps: ["In Zapier: create a Zap → Webhooks by Zapier → Catch Hook → copy the URL.", "Paste it below and press Save webhook, then Send test booking.", "In Zapier, add the next step (Google Sheets, HubSpot, …)."],
  },
];

const GROUPS = [["all", "All"], ["channels", "Messaging channels"], ["website", "Website & store"], ["tools", "Calendar, payments & tools"]];

function FieldForm({ item, initial, onDone }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function save(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await saveIntegrationField({ field: item.field, value: v });
    setBusy(false);
    if (!r?.ok) { setErr(r?.error || "Couldn't save."); return; }
    toast.success(v.trim() ? `${item.name} connected` : `${item.name} switched off`);
    onDone?.(); router.refresh();
  }
  return (
    <form onSubmit={save} className="mt-3 space-y-2">
      <div className="flex gap-2">
        <input value={v} onChange={(e) => { setV(e.target.value); setErr(""); }} placeholder={item.placeholder} className="field min-w-0 flex-1 text-sm" />
        <button disabled={busy} className="btn-brand shrink-0 px-4 text-sm">{busy ? "Saving…" : "Save"}</button>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      {initial && <p className="text-[11px] text-muted">Clear it and save to switch it off.</p>}
    </form>
  );
}

function Card({ item, on, value, paid, businessPlan, businessId, crmUrl }) {
  const [guide, setGuide] = useState(false);
  const [edit, setEdit] = useState(false);
  const locked = (item.paidOnly && !paid && !on) || (item.businessOnly && !businessPlan);
  return (
    <div className={`card flex flex-col p-5 ${on ? "ring-1 ring-emerald-200" : ""}`}>
      <div className="flex items-start gap-3">
        <Logo item={item} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-text">{item.name}</p>
            {on ? <span className="pill bg-emerald-50 text-emerald-700">● Connected</span>
              : locked ? <span className="pill bg-canvas text-muted">{item.businessOnly ? "Business plan" : "Paid plans"}</span>
              : <span className="pill bg-canvas text-muted">Not connected</span>}
          </div>
          <p className="mt-0.5 text-xs text-muted">{item.what}</p>
          {on && value && <p className="mt-1 truncate text-[11px] font-medium text-text/70">{value}</p>}
        </div>
      </div>

      {guide && (
        <ol className="mt-3 list-decimal space-y-1 rounded-xl bg-canvas px-4 py-3 pl-8 text-xs text-text/80">
          {item.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
      {item.field && (edit || (!on && guide)) && <FieldForm item={item} initial={value || ""} onDone={() => setEdit(false)} />}
      {item.inlineCrm && businessPlan && (edit || guide) && <div className="mt-3"><IntegrationsForm businessId={businessId} initialUrl={crmUrl} /></div>}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        {locked ? (
          <a href="/billing" className="btn-brand px-4 py-2 text-xs">Upgrade</a>
        ) : item.field || item.inlineCrm ? (
          <button type="button" onClick={() => { setEdit((x) => !x); setGuide(true); }} className="btn-brand px-4 py-2 text-xs">{on ? "Change" : "Connect"}</button>
        ) : (
          <a href={item.href} {...(item.external ? { download: true } : {})} className={`${on ? "rounded-xl border border-line px-4 py-2 font-semibold text-text hover:bg-canvas" : "btn-brand px-4 py-2"} text-xs`}>{on ? "Manage" : item.cta}</a>
        )}
        <button type="button" onClick={() => setGuide((x) => !x)} className="rounded-xl px-3 py-2 text-xs font-semibold text-brand hover:bg-brand-tint/50">{guide ? "Hide guide" : "Setup guide"}</button>
      </div>
    </div>
  );
}

export default function IntegrationsHub({ businessId, status, values, paid, businessPlan }) {
  const [group, setGroup] = useState("all");
  const connected = ITEMS.filter((i) => status[i.id]).length;
  const shown = ITEMS.filter((i) => group === "all" || i.group === group)
    .sort((a, b) => Number(!!status[b.id]) - Number(!!status[a.id]));
  const valueOf = (i) => (i.field ? values[i.field] : i.valueKey ? values[i.valueKey] : i.id === "widget" || i.id === "wordpress" ? values.widget_origin : i.id === "crm" ? values.webhook_url : "");

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-text">{connected} of {ITEMS.length} connected</p>
          <p className="text-xs text-muted">The more channels you connect, the more customers your AI can answer.</p>
        </div>
        <div className="h-2 w-56 max-w-full overflow-hidden rounded-full bg-canvas">
          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round((connected / ITEMS.length) * 100)}%` }} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {GROUPS.map(([k, l]) => (
          <button key={k} onClick={() => setGroup(k)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${group === k ? "bg-ink text-white" : "bg-surface text-muted hover:text-text"}`}>{l}</button>
        ))}
      </div>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((i) => (
          <Card key={i.id} item={i} on={!!status[i.id]} value={valueOf(i)} paid={paid} businessPlan={businessPlan} businessId={businessId} crmUrl={values.webhook_url} />
        ))}
      </div>
    </div>
  );
}
