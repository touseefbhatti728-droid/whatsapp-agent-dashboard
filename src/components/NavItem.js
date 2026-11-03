"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavItem({ href, label, icon, exact, badge }) {
  const pathname = usePathname();
  // A locked item (badge) points at Billing — never highlight it as the current page.
  const active = !badge && (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group navlink ${
        active
          ? "bg-brand-tint font-semibold text-brand-dark"
          : "text-body hover:bg-canvas hover:text-text"
      }`}
    >
      {icon && (
        <span className={`shrink-0 transition-colors ${active ? "text-brand" : "text-muted group-hover:text-text"}`}>
          {icon}
        </span>
      )}
      <span className="truncate">{label}</span>
      {/* Locked by plan: shows which plan unlocks it and links to Billing */}
      {badge && (
        <span className="ml-auto flex items-center gap-1 rounded-md border border-line bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-muted">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          {badge}
        </span>
      )}
    </Link>
  );
}
