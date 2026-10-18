"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NotifIcon } from "@/components/notif-meta";

// Renders every toast fired with toast() from "@/lib/toast" — action feedback
// (Saved / errors) and live alert pop-ups (new booking, handover…).
export default function Toaster() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  useEffect(() => {
    function onToast(e) {
      const t = e.detail || {};
      const id = ++idRef.current;
      const kind = t.kind || (t.type ? "alert" : "success");
      const ms = t.duration || (kind === "alert" ? 8000 : kind === "error" ? 6000 : 3500);
      setItems((list) => [...list.slice(-3), { id, kind, ...t }]);
      setTimeout(() => dismiss(id), ms);
    }
    window.addEventListener("nr-toast", onToast);
    return () => window.removeEventListener("nr-toast", onToast);
  }, []);

  function dismiss(id) {
    setItems((list) => list.filter((x) => x.id !== id));
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[360px] max-w-[calc(100vw-40px)] flex-col gap-2.5">
      <style>{`@keyframes nrToastIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}`}</style>
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          onClick={() => { if (t.url) { router.push(t.url); dismiss(t.id); } }}
          className={`pointer-events-auto flex items-start gap-3 rounded-2xl bg-ink px-4 py-3.5 text-white shadow-[0_20px_40px_-12px_rgba(20,16,43,0.55)] ring-1 ring-white/10 ${t.url ? "cursor-pointer" : ""}`}
          style={{ animation: "nrToastIn .28s cubic-bezier(.2,.9,.3,1.2)" }}
        >
          {t.kind === "alert" ? (
            <NotifIcon type={t.type} size={34} />
          ) : (
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${t.kind === "error" ? "bg-red-500" : t.kind === "info" ? "bg-brand" : "bg-green-500"}`}>
              {t.kind === "error" ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              ) : t.kind === "info" ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M12 8h.01M12 12v4" /></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              )}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-snug">{t.title}</p>
            {t.body && <p className="mt-0.5 text-[13px] leading-snug text-white/70">{t.body}</p>}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
            aria-label="Dismiss"
            className="-mr-1 mt-0.5 rounded-md p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
}
