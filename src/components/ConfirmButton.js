"use client";

import { useEffect, useState } from "react";

// Two-step delete: the first click asks "Sure?", the second does it. Replaces the
// browser's confirm() popup, which looks dated and freezes the page.
export default function ConfirmButton({ onConfirm, label = "Delete", confirmLabel = "Yes, delete", disabled, className = "" }) {
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!asking) return;
    const t = setTimeout(() => setAsking(false), 5000); // quietly cancel if ignored
    return () => clearTimeout(t);
  }, [asking]);

  if (!asking) {
    return <button type="button" onClick={() => setAsking(true)} disabled={disabled} className={className}>{label}</button>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" onClick={() => { setAsking(false); onConfirm(); }} disabled={disabled}
        className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700">{confirmLabel}</button>
      <button type="button" onClick={() => setAsking(false)}
        className="rounded-lg px-2 py-1.5 text-xs font-semibold text-muted hover:text-text">Keep</button>
    </span>
  );
}
