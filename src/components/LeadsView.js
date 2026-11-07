"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";
import CopyBox from "@/components/CopyBox";
import { updateLead, addLead, deleteLead, saveLeadSettings, regenerateLeadKey } from "@/lib/lead-actions";
import { formatPhone } from "@/lib/phone";
import { toast } from "@/lib/toast";

const STAGES = [
  ["new", "New", "bg-sky-50 text-sky-700"],
  ["contacted", "Contacted", "bg-canvas text-text"],
  ["qualified", "Qualified", "bg-amber-50 text-amber-700"],
  ["booked", "Booked", "bg-brand-tint text-brand-dark"],
  ["won", "Won", "bg-emerald-50 text-emerald-700"],
  ["lost", "Lost", "bg-red-50 text-red-600"],
];
const stageStyle = Object.fromEntries(STAGES.map(([k, , c]) => [k, c]));
const SOURCES = { whatsapp: "WhatsApp", website: "Website", facebook: "Facebook ad", instagram: "Instagram", messenger: "Messenger", google: "Google", webhook: "Zapier / form", manual: "Added by you" };
const ago = (iso) => {
  if (!iso) return "—";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 60 ? `${Math.max(1, m)} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};
const scoreColor = (s) => (s >= 70 ? "text-red-600" : s >= 50 ? "text-amber-600" : "text-muted");

export default function LeadsView({ leads, settings }) {
  const router = useRouter();
  const [stage, setStage] = useState("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState(null);

  const counts = useMemo(() => Object.fromEntries(STAGES.map(([k]) => [k, leads.filter((l) => l.stage === k).length])), [leads]);
  const shown = leads.filter((l) => (stage === "all" || l.stage === stage)
    && (!q || [l.name, l.phone, l.interest, l.campaign].some((v) => String(v || "").toLowerCase().includes(q.toLowerCase()))));
  const hot = leads.filter((l) => l.score >= 70 && !["booked", "won", "lost"].includes(l.stage)).length;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="All leads" value={leads.length} />
        <Stat label="🔥 Hot, not booked yet" value={hot} accent />
        <Stat label="Qualified" value={counts.qualified} />
        <Stat label="Booked / won" value={counts.booked + counts.won} />
      </section>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          {[["all", "All"], ...STAGES.map(([k, l]) => [k, l])].map(([k, l]) => (
            <button key={k} onClick={() => setStage(k)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${stage === k ? "bg-ink text-white" : "bg-canvas text-text hover:bg-line"}`}>
              {l}{k !== "all" ? ` ${counts[k] || 0}` : ""}
            </button>
          ))}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, interest…" className="field ml-auto w-full py-1.5 text-sm sm:w-64" />
        </div>
        {shown.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-muted">No leads here yet. They appear as soon as someone messages you.</div>
        ) : (
          <div className="divide-y divide-line">
            {shown.map((l) => (
              <LeadRow key={l.id} lead={l} open={openId === l.id} onToggle={() => setOpenId(openId === l.id ? null : l.id)} onChanged={() => router.refresh()} />
            ))}
          </div>
        )}
      </div>

      <AddLead onDone={() => router.refresh()} />
      <LeadSettings settings={settings} onDone={() => router.refresh()} />
    </div>
  );
}

function LeadRow({ lead, open, onToggle, onChanged }) {
  const [f, setF] = useState({ name: lead.name || "", interest: lead.interest || "", budget: lead.budget || "", timeline: lead.timeline || "", notes: lead.notes || "" });
  const [busy, setBusy] = useState(false);
  const digits = String(lead.phone || "").replace(/\D/g, "");
  const isWeb = /^(web|fb|ig):/.test(String(lead.phone || "")); // not a WhatsApp number

  async function setStage(stage) {
    const r = await updateLead(lead.id, { stage });
    if (!r.ok) return toast.error("Couldn't update", r.error);
    onChanged();
  }
  async function save() {
    setBusy(true);
    const r = await updateLead(lead.id, f);
    setBusy(false);
    if (!r.ok) return toast.error("Couldn't save", r.error);
    toast.success("Lead saved");
    onChanged();
  }
  async function remove() {
    const r = await deleteLead(lead.id);
    if (!r.ok) return toast.error("Couldn't delete", r.error);
    onChanged();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-5">
        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-text">{lead.name || formatPhone(lead.phone) || "Unknown"}</p>
          <p className="truncate text-xs text-muted">
            {[lead.interest, SOURCES[lead.source] || lead.source, lead.campaign, `last contact ${ago(lead.last_contact_at || lead.created_at)}`].filter(Boolean).join(" · ")}
          </p>
        </button>
        <span className={`w-10 text-right text-sm font-bold ${scoreColor(lead.score)}`} title="How ready to buy (AI estimate)">{lead.score}</span>
        <select value={lead.stage} onChange={(e) => setStage(e.target.value)} className={`rounded-full border-0 px-3 py-1 text-xs font-semibold ${stageStyle[lead.stage]}`}>
          {STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {digits && !isWeb && <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="btn-ghost h-8 px-3 py-0 text-xs">WhatsApp</a>}
      </div>
      {open && (
        <div className="mx-4 mb-4 space-y-3 rounded-xl border border-line bg-canvas/50 p-4 md:mx-5">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Name" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
            <Field label="Interested in" value={f.interest} onChange={(v) => setF({ ...f, interest: v })} />
            <Field label="Budget" value={f.budget} onChange={(v) => setF({ ...f, budget: v })} />
            <Field label="When" value={f.timeline} onChange={(v) => setF({ ...f, timeline: v })} />
          </div>
          <label className="block text-xs font-medium text-muted">Notes
            <textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={3} className="field mt-1 resize-y text-sm" />
          </label>
          <p className="text-xs text-muted">{formatPhone(lead.phone)}{lead.email ? ` · ${lead.email}` : ""} · added {new Date(lead.created_at).toLocaleDateString()}</p>
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={busy} className="btn-brand px-3 py-1.5 text-xs">{busy ? "Saving…" : "Save"}</button>
            <ConfirmButton onConfirm={remove} label="Delete lead" confirmLabel="Yes, delete" className="ml-auto rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-red-500" />
          </div>
        </div>
      )}
    </div>
  );
}

function AddLead({ onDone }) {
  const [f, setF] = useState({ name: "", phone: "", interest: "" });
  const [busy, setBusy] = useState(false);
  async function add() {
    setBusy(true);
    const r = await addLead(f);
    setBusy(false);
    if (!r.ok) return toast.error("Couldn't add", r.error);
    toast.success("Lead added");
    setF({ name: "", phone: "", interest: "" });
    onDone();
  }
  return (
    <div className="card space-y-3 p-6">
      <h2 className="text-sm font-semibold text-text">Add a lead</h2>
      <p className="text-xs text-muted">Walk-in, phone call or Instagram DM — keep everyone in one list.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Name" className="field" />
        <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="Mobile with country code" className="field" inputMode="tel" />
        <input value={f.interest} onChange={(e) => setF({ ...f, interest: e.target.value })} placeholder="Interested in…" className="field" />
      </div>
      <button onClick={add} disabled={busy} className="btn-brand px-4 py-2 text-sm">{busy ? "Adding…" : "Add lead"}</button>
    </div>
  );
}

function LeadSettings({ settings, onDone }) {
  const [f, setF] = useState({ lead_questions: settings.lead_questions, lead_template: settings.lead_template, lead_template_lang: settings.lead_template_lang });
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    const r = await saveLeadSettings(f);
    setBusy(false);
    if (!r.ok) return toast.error("Couldn't save", r.error);
    toast.success("Lead settings saved");
    onDone();
  }
  async function newKey() {
    const r = await regenerateLeadKey();
    if (!r.ok) return toast.error("Couldn't create key", r.error);
    toast.success("New lead key created", "Update it in Zapier / Make.");
    onDone();
  }
  const url = settings.key ? `${settings.webhookUrl}?key=${settings.key}` : "";

  return (
    <div className="card space-y-6 p-6">
      <div>
        <h2 className="text-sm font-semibold text-text">What should your AI find out?</h2>
        <p className="mt-0.5 text-xs text-muted">For bigger treatments the AI asks these naturally, one at a time, and scores how ready the person is to buy.</p>
        <textarea value={f.lead_questions} onChange={(e) => setF({ ...f, lead_questions: e.target.value })} rows={2} className="field mt-2 resize-y text-sm"
          placeholder="e.g. which treatment, which area, budget, when they want to start, first time or repeat" />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-text">Leads from ads and forms</h2>
        <p className="mt-0.5 text-xs text-muted">
          Send Facebook / Instagram Lead Ads, Google forms or your website form here with Zapier or Make (action: <b>Webhooks → POST</b>, JSON with <code className="rounded bg-canvas px-1">name</code>, <code className="rounded bg-canvas px-1">phone</code>, <code className="rounded bg-canvas px-1">interest</code>, <code className="rounded bg-canvas px-1">campaign</code>). Every lead lands in this list and you get an alert.
        </p>
        {url ? <CopyBox value={url} /> : <p className="mt-2 text-sm text-muted">Create a key to get your private lead address.</p>}
        <button onClick={newKey} className="btn-ghost mt-2 px-3 py-1.5 text-xs">{settings.key ? "Create a new key (old link stops working)" : "Create lead key"}</button>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-text">Message new ad leads on WhatsApp automatically</h2>
        <p className="mt-0.5 text-xs text-muted">
          WhatsApp only lets businesses message someone first with an <b>approved template</b> (create one in WhatsApp Manager → Message templates, category Marketing or Utility, e.g. "Hi {"{{1}}"}, thanks for your interest! Any questions about our treatments? Reply here 😊"). Put its exact name below — when they reply, your AI takes over.
        </p>
        {!settings.whatsappConnected && <p className="mt-2 text-xs text-amber-700">Connect WhatsApp first.</p>}
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_120px]">
          <input value={f.lead_template} onChange={(e) => setF({ ...f, lead_template: e.target.value })} placeholder="template_name" className="field font-mono text-sm" />
          <input value={f.lead_template_lang} onChange={(e) => setF({ ...f, lead_template_lang: e.target.value })} placeholder="en" className="field font-mono text-sm" title="Template language code, e.g. en, en_US, ar, ur" />
        </div>
      </div>
      <button onClick={save} disabled={busy} className="btn-brand px-4 py-2 text-sm">{busy ? "Saving…" : "Save lead settings"}</button>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="block text-xs font-medium text-muted">{label}
      <input value={value} onChange={(e) => onChange(e.target.value)} className="field mt-1 py-1.5 text-sm" />
    </label>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="stat p-4">
      <div className="text-[13px] font-medium text-muted">{label}</div>
      <div className={`mt-2 text-[24px] font-bold leading-none ${accent ? "text-brand" : "text-text"}`}>{value}</div>
    </div>
  );
}
