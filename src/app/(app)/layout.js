import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import NavItem from "@/components/NavItem";
import { getBranding } from "@/lib/branding";

const S = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" };
const IcCalendar = (<svg {...S}><rect x="3" y="4" width="18" height="18" rx="2.5"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
const IcChat = (<svg {...S}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>);
const IcCog = (<svg {...S}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>);
const IcGrid = (<svg {...S}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>);
const IcUsers = (<svg {...S}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const IcList = (<svg {...S}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>);
const IcSpark = (<svg {...S}><path d="M12 3l1.9 4.8L18.5 9l-4.6 1.2L12 15l-1.9-4.8L5.5 9l4.6-1.2z"/><path d="M18 15l.7 1.8 1.8.7-1.8.7L18 20l-.7-1.8-1.8-.7 1.8-.7z"/></svg>);
const IcPlug = (<svg {...S}><path d="M9 2v6M15 2v6M7 8h10v3a5 5 0 0 1-10 0zM12 16v6"/></svg>);
const IcCard = (<svg {...S}><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/></svg>);
const IcPaint = (<svg {...S}><path d="M12 2a9 9 0 0 0 0 18 2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h1a4 4 0 0 0 4-4 9 9 0 0 0-9-9z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16.5" cy="10.5" r="1"/></svg>);

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  const isAdmin = profile?.is_admin === true;
  const branding = await getBranding();
  const appName = branding.app_name;
  let showChat = true;
  if (!isAdmin) {
    const { data: myBiz } = await supabase.from("businesses").select("plan").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (myBiz) {
      const { data: pl } = await supabase.from("plans").select("chat_history").eq("name", myBiz.plan).maybeSingle();
      showChat = pl?.chat_history !== false;
    }
  }
  const initial = (user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside className="hidden w-[248px] shrink-0 flex-col justify-between border-r border-black/5 bg-ink p-4 md:flex">
        <div>
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="logo-mark h-9 w-9 text-[15px]">{appName.charAt(0)}</div>
            <span className="truncate font-bold tracking-tight text-white">{appName}</span>
          </div>

          <nav className="mt-7 space-y-1">
            <NavItem href="/dashboard" label="My bookings" icon={IcCalendar} />
            <NavItem href="/calendar" label="Calendar" icon={IcCalendar} />
            {showChat && <NavItem href="/conversations" label="Conversations" icon={IcChat} />}
            <NavItem href="/settings" label="Settings" icon={IcCog} />
            <NavItem href="/integrations" label="Integrations" icon={IcPlug} />
            <NavItem href="/billing" label="Billing" icon={IcCard} />
          </nav>

          {isAdmin && (
            <div className="mt-7">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Admin</p>
              <nav className="space-y-1">
                <NavItem href="/admin" label="Overview" icon={IcGrid} exact />
                <NavItem href="/admin/clients" label="Clients" icon={IcUsers} />
                <NavItem href="/admin/bookings" label="All bookings" icon={IcList} />
                <NavItem href="/admin/calendar" label="Calendar" icon={IcCalendar} />
                <NavItem href="/admin/plans" label="Plans" icon={IcCard} />
                <NavItem href="/admin/assistant" label="Assistant" icon={IcSpark} />
                <NavItem href="/admin/branding" label="Branding" icon={IcPaint} />
              </nav>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.06] px-2.5 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">{initial}</div>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-medium text-white">{user.email}</p>
              <p className="text-[11px] text-white/45">{isAdmin ? "Admin" : "Owner"}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-10 flex items-center justify-between border-b border-black/5 bg-ink px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="logo-mark h-7 w-7 text-xs">{appName.charAt(0)}</div>
          <span className="truncate text-sm font-bold text-white">{appName}</span>
        </div>
        <nav className="flex items-center gap-1 text-sm">
          <NavItem href="/dashboard" label="Bookings" />
          {isAdmin && <NavItem href="/admin" label="Admin" exact />}
        </nav>
      </header>

      {/* Main */}
      <main className="flex-1 px-5 pb-16 pt-20 md:px-12 md:pt-12">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
