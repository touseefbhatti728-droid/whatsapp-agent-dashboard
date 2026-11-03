"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function MobileNav({ appName, brandBlock, navContent, userBox }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer whenever the route changes (user tapped a link)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock background scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Top bar (mobile only) */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <div className="logo-mark h-8 w-8 text-xs">{appName.charAt(0)}</div>
          <span className="truncate text-sm font-semibold text-text">{appName}</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text hover:bg-canvas"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
      </header>

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Slide-out drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85%] flex-col bg-surface shadow-pop transition-transform duration-300 md:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          {brandBlock}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-text"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">{navContent}</div>
        <div className="border-t border-line p-3">{userBox}</div>
      </aside>
    </>
  );
}
