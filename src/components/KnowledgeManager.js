"use client";

import ConfirmButton from "@/components/ConfirmButton";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addKnowledge, updateKnowledge, deleteKnowledge } from "@/lib/knowledge-actions";
import { importFromWebsite, importFromPdf } from "@/lib/knowledge-import-actions";
import { toast } from "@/lib/toast";

const SECTIONS = [
  { type: "document", title: "From your website & documents", desc: "Facts your AI learned from your website or PDFs. Check them and edit anything that's wrong.", titlePh: "Source, e.g. Price list 2026", contentPh: "Or paste any text — price list, menu, brochure…", titled: true },
  { type: "promotion", title: "Promotions", desc: "Current offers the AI can mention to customers.", titlePh: "e.g. Ramadan offer", contentPh: "20% off all services this week", titled: true },
  { type: "policy_faq", title: "Policies & FAQ", desc: "Common questions and rules the AI answers with.", titlePh: "Question / topic", contentPh: "e.g. Do you take walk-ins? — Yes, when we have a free slot.", titled: true },
  { type: "stop", title: "Never do / never offer", desc: "Hard limits — the AI will never do or promise these.", titlePh: "", contentPh: "e.g. Never give medical advice. Never promise same-day appointments.", titled: false },
];

export default function KnowledgeManager({ businesses, items }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(businesses[0]?.id || "");
  const list = items.filter((i) => i.business_id === selectedId);

  return (
    <div className="space-y-6">
      {businesses.length > 1 && (
        <div className="card p-5">
          <label className="mb-1.5 block text-sm font-medium text-text">Editing business</label>
          <select value={selectedId} onChange={(e) => setSelectedId(businesses.find((x) => String(x.id) === e.target.value)?.id ?? e.target.value)} className="field max-w-sm">
            {businesses.map((b) => (<option key={b.id} value={b.id}>{b.name || "Unnamed business"}</option>))}
          </select>
        </div>
      )}

      <ImportCard onDone={() => router.refresh()} />

      {SECTIONS.map((s) => (
        <Section
          key={s.type}
          config={s}
          businessId={selectedId}
          rows={list.filter((i) => i.type === s.type)}
          onChanged={() => router.refresh()}
        />
      ))}
    </div>
  );
}

function Section({ config, businessId, rows, onChanged }) {
  const [draft, setDraft] = useState({ title: "", content: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    if (!draft.content.trim()) { setError("Please enter some text."); return; }
    setBusy(true); setError("");
    const res = await addKnowledge({ business_id: businessId, type: config.type, title: draft.title, content: draft.content });
    setBusy(false);
    if (res && res.ok === false) { setError(res.error || "Could not add."); toast.error("Could not add", res.error); return; }
    toast.success("Added to knowledge", "The AI will use this from the next message.");
    setDraft({ title: "", content: "" });
    onChanged();
  }

  return (
    <div className="card space-y-4 p-6">
      <div>
        <h2 className="text-sm font-semibold text-text">{config.title}</h2>
        <p className="mt-0.5 text-xs text-muted">{config.desc}</p>
      </div>

      {/* Existing rows */}
      {rows.length > 0 && (
        <div className="divide-y divide-line rounded-xl border border-line">
          {rows.map((r) => (<Row key={r.id} row={r} titled={config.titled} onChanged={onChanged} />))}
        </div>
      )}

      {/* Add new */}
      <div className="space-y-2 rounded-xl border border-dashed border-line p-4">
        {config.titled && (
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={config.titlePh} className="field" />
        )}
        <textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} placeholder={config.contentPh} rows={2} className="field resize-y" />
        <div className="flex items-center gap-3">
          <button onClick={add} disabled={busy} className="btn-brand px-3 py-1.5 text-sm">{busy ? "Adding…" : "Add"}</button>
          {error && <span className="text-sm font-medium text-red-500">{error}</span>}
        </div>
      </div>
    </div>
  );
}

function Row({ row, titled, onChanged }) {
  const [edit, setEdit] = useState({ title: row.title || "", content: row.content || "" });
  const [busy, setBusy] = useState(false);
  const dirty = edit.title !== (row.title || "") || edit.content !== (row.content || "");

  async function save() { setBusy(true); await updateKnowledge({ id: row.id, ...edit }); setBusy(false); onChanged(); }
  async function toggle() { setBusy(true); await updateKnowledge({ id: row.id, active: !row.active }); setBusy(false); onChanged(); }
  async function remove() { setBusy(true); await deleteKnowledge(row.id); setBusy(false); onChanged(); }

  return (
    <div className={`space-y-2 p-3.5 ${row.active ? "" : "opacity-60"}`}>
      {titled && (
        <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Title" className="field py-1.5 text-sm font-medium" />
      )}
      <textarea value={edit.content} onChange={(e) => setEdit({ ...edit, content: e.target.value })} rows={2} className="field resize-y py-1.5 text-sm" />
      <div className="flex items-center gap-2">
        {dirty && <button onClick={save} disabled={busy} className="btn-brand px-3 py-1 text-xs">Save</button>}
        <button onClick={toggle} disabled={busy} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${row.active ? "bg-brand-tint text-brand-dark" : "bg-canvas text-muted"}`}>
          {row.active ? "Active" : "Hidden"}
        </button>
        <ConfirmButton onConfirm={remove} disabled={busy} label="Delete" confirmLabel="Yes, delete" className="ml-auto rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-muted hover:text-red-500" />
      </div>
    </div>
  );
}

// Teach the AI from a website or a PDF (price list, menu, brochure).
function ImportCard({ onDone }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function fromSite() {
    if (!url.trim()) { setError("Paste your website address."); return; }
    setBusy("site"); setError("");
    const r = await importFromWebsite(url);
    setBusy("");
    if (!r?.ok) { setError(r?.error || "Couldn't read that website."); return; }
    toast.success("Website imported", `Read ${r.pages} page${r.pages === 1 ? "" : "s"} — check the facts below.`);
    setUrl(""); onDone();
  }
  async function fromPdf(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("pdf"); setError("");
    const fd = new FormData();
    fd.append("file", file);
    const r = await importFromPdf(fd);
    setBusy("");
    if (!r?.ok) { setError(r?.error || "Couldn't read that PDF."); return; }
    toast.success("PDF imported", "Check the facts below.");
    onDone();
  }

  return (
    <div className="card space-y-4 p-6">
      <div>
        <h2 className="text-sm font-semibold text-text">Teach your AI in one click</h2>
        <p className="mt-0.5 text-xs text-muted">We read your website (and its services, prices, FAQ and contact pages) or a PDF, and save the key facts for your AI. Takes about 20–40 seconds.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} placeholder="https://yourbusiness.com" className="field flex-1" disabled={!!busy} />
        <button onClick={fromSite} disabled={!!busy} className="btn-brand px-4 py-2 text-sm disabled:opacity-60">{busy === "site" ? "Reading website…" : "Import website"}</button>
      </div>
      <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line p-4 text-sm font-medium text-text hover:bg-canvas ${busy ? "pointer-events-none opacity-60" : ""}`}>
        <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={fromPdf} />
        {busy === "pdf" ? "Reading PDF…" : "📄 Upload a PDF (price list, menu, brochure — up to 4 MB)"}
      </label>
      {error && <p className="text-sm font-medium text-red-500">{error}</p>}
    </div>
  );
}
