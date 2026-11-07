"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";
import { savePackage, setPackageActive, deletePackage } from "@/lib/package-actions";
import { toast } from "@/lib/toast";

const blank = { name: "", price: "", sessions: 1, validity_days: "", services: [], description: "" };

// Bundles and multi-session offers ("Bridal package", "6 laser sessions") the AI can sell.
export default function PackagesManager({ packages, serviceNames }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null); // package object or blank

  if (packages === null) {
    return (
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-text">Packages</h2>
        <p className="mt-1 text-sm text-muted">Packages turn on after a quick database update by your provider.</p>
      </div>
    );
  }

  return (
    <div className="card space-y-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text">Packages & bundles</h2>
          <p className="mt-0.5 text-xs text-muted">Bundles and multi-session offers. Your AI suggests them when they fit what the customer wants.</p>
        </div>
        {!editing && <button onClick={() => setEditing(blank)} className="btn-brand shrink-0 px-3 py-1.5 text-sm">+ Add package</button>}
      </div>

      {editing && <Editor pkg={editing} serviceNames={serviceNames} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />}

      {packages.length === 0 && !editing ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No packages yet — e.g. "Bridal glow: hair + makeup + nails" or "6 laser sessions".</p>
      ) : (
        <div className="divide-y divide-line rounded-xl border border-line">
          {packages.map((p) => (
            <div key={p.id} className={`flex flex-wrap items-center gap-3 p-4 ${p.active ? "" : "opacity-60"}`}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">{p.name}{p.price ? <span className="ml-2 font-normal text-muted">{p.price}</span> : null}</p>
                <p className="truncate text-xs text-muted">
                  {[p.sessions > 1 && `${p.sessions} sessions`, p.validity_days && `valid ${p.validity_days} days`, p.services?.length && p.services.join(", "), p.description].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button onClick={() => setEditing(p)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-text hover:bg-canvas">Edit</button>
              <button onClick={async () => { await setPackageActive(p.id, !p.active); router.refresh(); }}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${p.active ? "bg-brand-tint text-brand-dark" : "bg-canvas text-muted"}`}>{p.active ? "Active" : "Hidden"}</button>
              <ConfirmButton onConfirm={async () => { await deletePackage(p.id); router.refresh(); }} label="Delete" confirmLabel="Yes, delete"
                className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-muted hover:text-red-500" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Editor({ pkg, serviceNames, onClose, onSaved }) {
  const [f, setF] = useState({ ...blank, ...pkg, validity_days: pkg.validity_days ?? "", services: pkg.services || [] });
  const [busy, setBusy] = useState(false);
  const toggle = (n) => setF((s) => ({ ...s, services: s.services.includes(n) ? s.services.filter((x) => x !== n) : [...s.services, n] }));

  async function save() {
    setBusy(true);
    const r = await savePackage(f);
    setBusy(false);
    if (!r.ok) return toast.error("Couldn't save", r.error);
    toast.success("Package saved", "Your AI can offer it now.");
    onSaved();
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand/30 bg-brand-tint/30 p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Package name, e.g. Bridal glow" className="field" />
        <input value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="Price, e.g. AED 1,200" className="field" />
        <label className="text-xs font-medium text-muted">Sessions
          <input type="number" min={1} max={100} value={f.sessions} onChange={(e) => setF({ ...f, sessions: e.target.value })} className="field mt-1" />
        </label>
        <label className="text-xs font-medium text-muted">Valid for (days, empty = no expiry)
          <input type="number" min={1} value={f.validity_days} onChange={(e) => setF({ ...f, validity_days: e.target.value })} className="field mt-1" />
        </label>
      </div>
      {serviceNames.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted">Includes</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {serviceNames.map((n) => (
              <button key={n} type="button" onClick={() => toggle(n)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${f.services.includes(n) ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-surface text-text"}`}>{n}</button>
            ))}
          </div>
        </div>
      )}
      <textarea value={f.description || ""} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} placeholder="Short description (optional)" className="field resize-y text-sm" />
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="btn-brand px-4 py-1.5 text-sm">{busy ? "Saving…" : "Save package"}</button>
        <button onClick={onClose} className="btn-ghost px-4 py-1.5 text-sm">Cancel</button>
      </div>
    </div>
  );
}
