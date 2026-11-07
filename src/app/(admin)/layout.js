import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import NavItem from "@/components/NavItem";
import MobileNav from "@/components/MobileNav";
import Toaster from "@/components/Toaster";
import { getBranding } from "@/lib/branding";
import { getSessionUser, getIsAdmin } from "@/lib/session";
import { manageBusiness } from "@/lib/manage-actions";

// The admin command center has its own layout and its own dark look,
// so it never feels like a customer's dashboard.
const S = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
const Ic = {
  radar: (<svg {...S}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="M12 12l6-6" /></svg>),
  users: (<svg {...S}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
  list: (<svg {...S}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>),
  cal: (<svg {...S}><rect x="3" y="4" width="18" height="18" rx="2.5" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>),
  money: (<svg {...S}><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>),
  paint: (<svg {...S}><path d="M12 2a9 9 0 0 0 0 18 2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h1a4 4 0 0 0 4-4 9 9 0 0 0-9-9z" /><circle cx="7.5" cy="10.5" r="1" /><circle cx="12" cy="7.5" r="1" /><circle cx="16.5" cy="10.5" r="1" /></svg>),
  spark: (<svg {...S}><path d="M12 3l1.9 4.8L18.5 9l-4.6 1.2L12 15l-1.9-4.8L5.5 9l4.6-1.2z" /><path d="M18 15l.7 1.8 1.8.7-1.8.7L18 20l-.7-1.8-1.8-.7 1.8-.7z" /></svg>),
  store: (<svg {...S}><path d="M3 9l1.5-5h15L21 9M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 21v-6h6v6" /></svg>),
  pulse: (<svg {...S}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>),
  chat: (<svg {...S}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>),
  search: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>),
};

export default async function AdminLayout({ children }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getIsAdmin(user.id))) redirect("/dashboard");

  const supabase = await createClient();
  const [branding, { data: mine }, { count: pastDue }] = await Promise.all([
    getBranding(),
    supabase.from("businesses").select("id, name").eq("owner_id", user.id).order("created_at", { ascending: true }),
    supabase.from("businesses").select("id", { count: "exact", head: true }).eq("sub_status", "past_due"),
  ]);
  const appName = branding.app_name || "NextReply";

  const brandBlock = (
    <div className="flex items-center gap-3 px-1">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[15px] font-black text-[#5b21b6] shadow-lg">{appName.charAt(0)}</div>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-bold tracking-tight text-text">{appName}</p>
        <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">Control room</p>
      </div>
    </div>
  );

  const Section = ({ title, children: items }) => (
    <div className="mt-6 first:mt-4">
      <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted/70">{title}</p>
      <nav className="space-y-0.5">{items}</nav>
    </div>
  );

  const navContent = (
    <>
      <Section title="Platform">
        <NavItem href="/admin" label="Mission control" icon={Ic.radar} exact />
        <NavItem href="/admin/clients" label="Customers" icon={Ic.users} />
        <NavItem href="/admin/plans" label="Plans & revenue" icon={Ic.money} />
        <NavItem href="/admin/health" label="System health" icon={Ic.pulse} />
      </Section>
      <Section title="Activity">
        <NavItem href="/admin/conversations" label="All conversations" icon={Ic.chat} />
        <NavItem href="/admin/bookings" label="All bookings" icon={Ic.list} />
        <NavItem href="/admin/calendar" label="All calendars" icon={Ic.cal} />
      </Section>
      <Section title="Tools">
        <NavItem href="/admin/assistant" label="AI assistant" icon={Ic.spark} />
        <NavItem href="/admin/branding" label="Branding" icon={Ic.paint} />
      </Section>
      {(mine || []).length > 0 && (
        <Section title="My businesses">
          {mine.map((b) => (
            <form key={b.id} action={manageBusiness}>
              <input type="hidden" name="id" value={b.id} />
              <button className="navlink w-full text-body hover:bg-canvas hover:text-text">
                <span className="shrink-0 text-muted">{Ic.store}</span>
                <span className="truncate">{b.name || "My business"}</span>
                <span className="ml-auto text-[10px] font-semibold text-muted">Open ↗</span>
              </button>
            </form>
          ))}
        </Section>
      )}
    </>
  );

  const userBox = (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-canvas/70 p-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-[#5b21b6]">{(user.email || "?").charAt(0).toUpperCase()}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-text">{user.email}</p>
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">Administrator</p>
      </div>
      <SignOutButton />
    </div>
  );

  return (
    <div className="theme-admin flex min-h-screen">
      <aside className="admin-sidebar sticky top-0 hidden h-screen w-[256px] shrink-0 flex-col md:flex">
        <div className="border-b border-line px-4 py-4">{brandBlock}</div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">{navContent}</div>
        <div className="border-t border-line p-3">{userBox}</div>
      </aside>

      <MobileNav appName={appName} brandBlock={brandBlock} navContent={navContent} userBox={userBox} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 hidden h-16 items-center gap-4 admin-header border-b border-line px-8 backdrop-blur md:flex">
          <form action="/admin/clients" className="relative w-full max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">{Ic.search}</span>
            <input name="q" placeholder="Search customers by name, email or number…" className="field h-10 pl-9 text-[13px]" />
          </form>
          <div className="ml-auto flex items-center gap-2.5">
            {pastDue > 0 && <a href="/admin/clients?f=past_due" className="pill bg-red-50 text-red-600">● {pastDue} payment{pastDue === 1 ? "" : "s"} failed</a>}
            <a href="/admin/assistant" className="btn-ghost h-9 px-3 py-0 text-[13px]">{Ic.spark} Ask AI</a>
            <span className="pill admin-glow bg-brand-tint text-brand-dark">ADMIN</span>
          </div>
        </header>
        <main className="flex-1 px-4 pb-16 pt-20 sm:px-6 md:px-8 md:pt-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
