"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CopyBox from "@/components/CopyBox";
import { linkWebsite } from "@/lib/setup-actions";
import { toast } from "@/lib/toast";

const PLATFORMS = {
  wordpress: {
    label: "WordPress",
    steps: [
      <>Download the plugin: <a href="/downloads/nextreply-wordpress.zip" className="font-semibold text-brand underline" download>nextreply-wordpress.zip</a></>,
      <>WordPress admin → <b>Plugins → Add New → Upload Plugin</b> → choose the file → <b>Install</b> → <b>Activate</b>.</>,
      <>Click <b>NextReply</b> in the WordPress menu → <b>Connect to NextReply</b>. Done — no code. For a booking page, add <code className="rounded bg-canvas px-1">[nextreply_booking]</code> to any page.</>,
    ],
    code: false,
  },
  wix: {
    label: "Wix",
    steps: [
      <>Copy the code below.</>,
      <>Wix dashboard → <b>Settings → Custom Code</b> (under Advanced) → <b>+ Add Custom Code</b> → paste it.</>,
      <>Choose <b>All pages</b>, <b>Load code once</b>, place it in <b>Body – end</b> → <b>Apply</b>. Publish your site.</>,
    ],
    code: true,
  },
  shopify: {
    label: "Shopify",
    steps: [
      <>Copy the code below.</>,
      <>Shopify admin → <b>Online Store → Themes</b> → <b>⋯ → Edit code</b> → open <b>layout/theme.liquid</b>.</>,
      <>Paste it just above <code className="rounded bg-canvas px-1">&lt;/body&gt;</code> → <b>Save</b>. For order tracking in chat, connect Shopify on the <a href="/channels" className="font-semibold text-brand underline">Instagram, Messenger &amp; store</a> page.</>,
    ],
    code: true,
  },
  other: {
    label: "Other site",
    steps: [
      <>Copy the code below.</>,
      <>Paste it before <code className="rounded bg-canvas px-1">&lt;/body&gt;</code> on every page (Squarespace: Settings → Advanced → Code Injection → Footer; Webflow: Project settings → Custom code → Footer).</>,
      <>Save and publish. Open your site once — this page turns green.</>,
    ],
    code: true,
  },
};

function Step({ n, title, done, children }) {
  return (
    <section className="card p-6">
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-brand text-white" : "bg-canvas text-text"}`}>{done ? "✓" : n}</span>
        <h2 className="text-base font-semibold text-text">{title}</h2>
      </div>
      <div className="mt-4 space-y-4 pl-11">{children}</div>
    </section>
  );
}

const ago = (iso) => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 60 ? `${Math.max(1, m)} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; };

export default function SetupWizard({ state, snippet, bookingUrl }) {
  const router = useRouter();
  const [site, setSite] = useState(state.website);
  const [busy, setBusy] = useState(false);
  const [platform, setPlatform] = useState("wordpress");
  const p = PLATFORMS[platform];

  async function learn() {
    if (!site.trim()) return toast.error("Add your website address");
    setBusy(true);
    const r = await linkWebsite(site);
    setBusy(false);
    if (!r.ok) return toast.error("Couldn't save", r.error);
    if (r.learned) toast.success("Your AI read your website", "Check the facts on the Knowledge page.");
    else if (r.note) toast.error("Saved, but we couldn't read the site", r.note);
    else toast.success("Saved");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Step n={1} title="Teach your AI from your website" done={state.learned}>
        <p className="text-sm text-muted">We read your site (services, prices, FAQ, contact pages) and save the facts for your AI. No website? Skip this and use an industry template on the Knowledge page.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://yourbusiness.com" className="field flex-1" />
          <button onClick={learn} disabled={busy} className="btn-brand px-4 py-2 text-sm disabled:opacity-60">{busy ? "Reading… (up to 30s)" : state.learned ? "Read again" : "Read my website"}</button>
        </div>
        {state.learned && <p className="text-sm text-brand-dark">✓ Your AI knows your website. <a href="/knowledge" className="underline">Review the facts</a></p>}
      </Step>

      <Step n={2} title="Put the AI chat on your website" done={!!state.installedAt}>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PLATFORMS).map(([k, v]) => (
            <button key={k} onClick={() => setPlatform(k)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${platform === k ? "bg-ink text-white" : "bg-canvas text-text hover:bg-line"}`}>{v.label}</button>
          ))}
        </div>
        <ol className="space-y-2">
          {p.steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-text"><span className="font-bold text-muted">{i + 1}.</span><span>{s}</span></li>
          ))}
        </ol>
        {p.code && <CopyBox value={snippet} multiline />}
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-canvas px-4 py-3 text-sm">
          {state.installedAt
            ? <span className="font-medium text-brand-dark">✓ Live on {state.installedOn || "your site"} (seen {ago(state.installedAt)})</span>
            : <span className="text-muted">Waiting for your site… open it once after installing, then check again.</span>}
          <button onClick={() => router.refresh()} className="btn-ghost ml-auto px-3 py-1 text-xs">Check again</button>
        </div>
        <p className="text-xs text-muted">Booking page link (Instagram bio, Google profile, ads): <a href={bookingUrl} target="_blank" rel="noreferrer" className="text-brand underline">{bookingUrl}</a></p>
      </Step>

      <Step n={3} title="Connect your channels" done={state.whatsapp && !!state.page}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Channel label="WhatsApp" status={state.whatsapp ? "Connected" : null} href="/connect-whatsapp" />
          <Channel label="Facebook & Instagram" status={state.page ? [state.page, state.instagram && `@${state.instagram}`].filter(Boolean).join(" + ") : null} href="/channels" />
          <Channel label="Phone calls" status={state.phone ? `+${String(state.phone).replace(/\D/g, "")}` : null} href="/phone" optional />
        </div>
      </Step>
    </div>
  );
}

function Channel({ label, status, href, optional }) {
  return (
    <a href={href} className={`block rounded-xl border p-4 transition hover:bg-canvas ${status ? "border-brand/40 bg-brand-tint/40" : "border-line"}`}>
      <p className="text-sm font-semibold text-text">{label}{optional && <span className="ml-1 text-xs font-normal text-muted">(optional)</span>}</p>
      <p className={`mt-1 text-xs ${status ? "text-brand-dark" : "text-muted"}`}>{status ? `✓ ${status}` : "Connect →"}</p>
    </a>
  );
}
