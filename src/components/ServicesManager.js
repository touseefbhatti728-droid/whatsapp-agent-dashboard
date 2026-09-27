"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addService, updateService, deleteService } from "@/lib/services-actions";

export default function ServicesManager({ businesses, services }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(businesses[0]?.id || "");
  const [draft, setDraft] = useState({ name: "", category: "", price: "", duration_min: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const list = services.filter((s) => s.business_id === selectedId);

  async function add() {
    if (!draft.name.trim()) { setError("Please enter a service name."); return; }
    setBusy(true); setError("");
    const res = await addService({ business_id: selectedId, ...draft });
    setBusy(false);
    if (res && res.ok === false) { setError(res.error || "Could not add."); return; }
    setDraft({ name: "", category: "", price: "", duration_min: "" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {businesses.length > 1 && (
        <div className="card p-5">
          <label className="mb-1.5 block text-sm font-medium text-text">Editing business</label>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="field max-w-sm">
            {businesses.map((b) => (<option key={b.id} value={b.id}>{b.name || "Unnamed business"}</option>))}
          </select>
        </div>
      )}

      {/* Add new service */}
      <div className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-text">Add a service</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Service name" className="field" />
          <input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Category (optional)" className="field" />
          <input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="Price" type="number" className="field" />
          <input value={draft.duration_min} onChange={(e) => setDraft({ ...draft, duration_min: e.target.value })} placeholder="Duration (min)" type="number" className="field" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={add} disabled={busy} className="btn-brand">{busy ? "Adding…" : "Add service"}</button>
          {error && <span className="text-sm font-medium text-red-500">{error}</span>}
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-text">Your services</h2>
          <p className="text-xs text-muted">{list.length} service{list.length === 1 ? "" : "s"}</p>
        </div>
        {list.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-medium text-text">No services yet</p>
            <p className="mt-1 text-sm text-muted">Add your first service above.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {list.map((s) => (<ServiceRow key={s.id} service={s} onChanged={() => router.refresh()} />))}
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceRow({ service, onChanged }) {
  const [row, setRow] = useState({
    name: service.name || "",
    category: service.category || "",
    price: service.price ?? "",
    duration_min: service.duration_min ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty =
    row.name !== (service.name || "") ||
    row.category !== (service.category || "") ||
    String(row.price) !== String(service.price ?? "") ||
    String(row.duration_min) !== String(service.duration_min ?? "");

  async function save() {
    setBusy(true);
    await updateService({ id: service.id, ...row });
    setBusy(false); setSaved(true); setTimeout(() => setSaved(false), 1500);
    onChanged();
  }
  async function toggleActive() {
    setBusy(true);
    await updateService({ id: service.id, active: !service.active });
    setBusy(false); onChanged();
  }
  async function remove() {
    if (!confirm(`Delete "${service.name}"?`)) return;
    setBusy(true);
    await deleteService(service.id);
    setBusy(false); onChanged();
  }

  return (
    <div className={`grid gap-3 p-4 md:grid-cols-[1fr_1fr_100px_120px_auto] md:items-center ${service.active ? "" : "opacity-60"}`}>
      <input value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })} className="field py-1.5" placeholder="Name" />
      <input value={row.category} onChange={(e) => setRow({ ...row, category: e.target.value })} className="field py-1.5" placeholder="Category" />
      <input value={row.price} onChange={(e) => setRow({ ...row, price: e.target.value })} type="number" className="field py-1.5" placeholder="Price" />
      <input value={row.duration_min} onChange={(e) => setRow({ ...row, duration_min: e.target.value })} type="number" className="field py-1.5" placeholder="Min" />
      <div className="flex items-center gap-2 justify-self-end">
        {dirty && <button onClick={save} disabled={busy} className="btn-brand px-3 py-1.5 text-xs">{saved ? "Saved" : "Save"}</button>}
        <button onClick={toggleActive} disabled={busy} title={service.active ? "Active — click to hide" : "Hidden — click to show"}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${service.active ? "bg-brand-tint text-brand-dark" : "bg-canvas text-muted"}`}>
          {service.active ? "Active" : "Hidden"}
        </button>
        <button onClick={remove} disabled={busy} title="Delete" className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-red-500">Delete</button>
      </div>
    </div>
  );
}
