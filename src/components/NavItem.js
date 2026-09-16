"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavItem({ href, label, icon, exact }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`group navlink relative ${
        active
          ? "bg-white/[0.08] text-white font-semibold ring-1 ring-inset ring-white/[0.07]"
          : "text-white/70 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand"
          style={{ boxShadow: "0 0 10px rgb(var(--brand-rgb) / 0.75)" }}
        />
      )}
      {icon && (
        <span className={`shrink-0 transition-colors ${active ? "text-brand" : "text-white/50 group-hover:text-white/85"}`}>
          {icon}
        </span>
      )}
      <span>{label}</span>
    </Link>
  );
}
