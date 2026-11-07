"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { applyIndustryTemplate } from "@/lib/industry-actions";
import { INDUSTRIES } from "@/lib/industry-templates";
import { toast } from "@/lib/toast";

// One-click starter content for the business's industry.
export default function IndustryPicker({ current }) {
  const router = useRouter();
  const [key, setKey] = useState(current || "salon");
  const [busy, setBusy] = useState(false);

  async function apply() {
    setBusy(true);
    const r = await applyIndustryTemplate(key);
    setBusy(false);
    if (!r.ok) return toast.error("Couldn't apply", r.error);
    const a = r.added;
    const bits = [a.faqs && `${a.faqs} FAQs`, a.services && `${a.services} example services`, a.questions && "lead questions", a.intake && "an intake form"].filter(Boolean);
    toast.success("Template applied", bits.length ? `Added ${bits.join(", ")}. Edit them to match your business.` : "You already have your own content — nothing was changed.");
    router.refresh();
  }

  return (
    <div className="card space-y-3 p-6">
      <div>
        <h2 className="text-sm font-semibold text-text">Start from your industry</h2>
        <p className="mt-0.5 text-xs text-muted">Adds ready-made FAQs, what the AI should ask new leads, an intake form and example services. It only adds — your own content stays as it is.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select value={key} onChange={(e) => setKey(e.target.value)} className="field flex-1">
          {Object.entries(INDUSTRIES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
        </select>
        <button onClick={apply} disabled={busy} className="btn-brand px-4 py-2 text-sm disabled:opacity-60">{busy ? "Adding…" : "Apply template"}</button>
      </div>
    </div>
  );
}
