"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveBranding } from "@/lib/branding-actions";

const PRESETS = ["#0f9d6a", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#0891b2", "#111827"];

export default function BrandingForm({ initial }) {
  const router = useRouter();
  const [appName, setAppName] = useState(initial.app_name || "");
  const [color, setColor] = useState(initial.brand_color || "#0f9d6a");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await saveBranding({ app_name: appName, brand_color: color });
    setSaving(false); setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-6" style={{ "--brand-rgb": hexToRgb(color) }}>
      <div className="card space-y-5 p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">App name</label>
          <input value={appName} onChange={(e) => { setAppName(e.target.value); setSaved(false); }} className="field max-w-sm" placeholder="Booking Agent" />
          <p className="mt-1 text-xs text-muted">Shown in the sidebar and on the login screen.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Brand colour</label>
          <div className="flex items-center gap-3">
            <input type="color" value={color} onChange={(e) => { setColor(e.target.value); setSaved(false); }} className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-surface p-1" />
            <input value={color} onChange={(e) => { setColor(e.target.value); setSaved(false); }} className="field w-32 font-mono" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p} onClick={() => { setColor(p); setSaved(false); }} className="h-7 w-7 rounded-full border border-line" style={{ background: p }} aria-label={p} />
            ))}
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="card p-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Preview</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-white">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-bold">{(appName || "B").charAt(0)}</div>
            <span className="text-sm font-semibold">{appName || "Booking Agent"}</span>
          </div>
          <button className="btn-brand">Primary button</button>
          <span className="pill bg-brand-tint text-brand-dark"><span className="h-1.5 w-1.5 rounded-full bg-brand" /> Active</span>
          <span className="rounded-md bg-brand-tint px-2 py-1 text-xs font-semibold text-brand-dark">BK-1043</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-brand">{saving ? "Saving…" : "Save branding"}</button>
        {saved && <span className="text-sm font-medium text-brand">✓ Saved — refresh to see it everywhere</span>}
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return "15 157 106";
  return `${parseInt(h.slice(0, 2), 16)} ${parseInt(h.slice(2, 4), 16)} ${parseInt(h.slice(4, 6), 16)}`;
}
