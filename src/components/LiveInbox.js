"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { formatPhone } from "@/lib/phone";

// Keeps the dashboard live: checks for new messages every few seconds. When one arrives it
// reloads the inbox / overview data in place, and shows a small notice on other pages.
const LIVE_PAGES = ["/conversations", "/dashboard"];

export default function LiveInbox() {
  const router = useRouter();
  const pathname = usePathname();
  const lastId = useRef(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    let stop = false;
    async function tick() {
      if (stop || document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/inbox-pulse", { cache: "no-store" });
        if (!r.ok) return;
        const { last } = await r.json();
        if (!last) return;
        if (lastId.current === null) { lastId.current = last.id; return; } // first look: just remember
        if (last.id === lastId.current) return;
        lastId.current = last.id;
        const onLivePage = LIVE_PAGES.some((p) => pathRef.current?.startsWith(p));
        if (onLivePage) router.refresh();
        if (last.role === "user" && !pathRef.current?.startsWith("/conversations")) {
          toast.success(`New message · ${formatPhone(last.phone) || "customer"}`, last.text);
        }
      } catch (_) {}
    }
    tick();
    const t = setInterval(tick, 4000);
    const onVis = () => tick();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop = true; clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [router]);

  return null;
}
