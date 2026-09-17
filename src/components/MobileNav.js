"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function MobileNav({ appName, navContent, userBox }) {
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
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-black/5 bg-ink px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="logo-mark h-7 w-7 text-xs">{appName.charAt(0)}</div>
          <span className="truncate text-sm font-bold text-white">{appName}</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/10"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
      </header>

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Slide-out drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] max-w-[82%] flex-col justify-between overflow-y-auto bg-ink p-4 transition-transform duration-300 md:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div>
          <div className="flex items-center justify-between px-2 py-2">
            <div className="flex items-center gap-2.5">
              <div className="logo-mark h-9 w-9 text-[15px]">{appName.charAt(0)}</div>
              <span className="truncate font-bold tracking-tight text-white">{appName}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white hover:bg-white/10"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          {navContent}
        </div>
        <div className="pt-4">{userBox}</div>
      </aside>
    </>
  );
}