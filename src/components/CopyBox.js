"use client";

import { useState } from "react";

// Read-only value with a Copy button (links, embed codes).
export default function CopyBox({ value, multiline = false }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (_) {}
  }
  return (
    <div className="mt-3 flex items-start gap-2">
      {multiline
        ? <textarea readOnly value={value} rows={3} className="field flex-1 resize-none font-mono text-xs" onFocus={(e) => e.target.select()} />
        : <input readOnly value={value} className="field flex-1 font-mono text-xs" onFocus={(e) => e.target.select()} />}
      <button type="button" onClick={copy} className="btn-ghost shrink-0 px-3 py-2 text-sm">{copied ? "Copied ✓" : "Copy"}</button>
    </div>
  );
}
