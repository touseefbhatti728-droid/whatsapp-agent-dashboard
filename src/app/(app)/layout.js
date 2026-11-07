import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import NavItem from "@/components/NavItem";
import MobileNav from "@/components/MobileNav";
import NotificationBell from "@/components/NotificationBell";
import Toaster from "@/components/Toaster";
import LiveInbox from "@/components/LiveInbox";
import { getBranding } from "@/lib/branding";
import { getSessionUser, getIsAdmin, getActiveBusiness } from "@/lib/session";
import { stopManaging } from "@/lib/manage-actions";

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
const IcChart = (<svg {...S}><path d="M3 3v18h18M7 16v-5M12 16V8M17 16v-3"/></svg>);
const IcRobot = (<svg {...S}><rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M9 13h.01M15 13h.01"/></svg>);
const IcTag = (<svg {...S}><path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/></svg>);
const IcBook = (<svg {...S}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>);
const IcUser = (<svg {...S}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const IcBell = (<svg {...S}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>);
const IcGlobe = (<svg {...S}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>);
const IcMega = (<svg {...S}><path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M14 8a4 4 0 0 1 0 8M18 5a8 8 0 0 1 0 14"/></svg>);

// Start/end of "today" in the business's own timezone (the server runs in UTC).
function todayRange(tz) {
  const zone = tz || "Asia/Dubai";
  const now = new Date();
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const asUtc = new Date(`${ymd}T00:00:00Z`);
  const offsetMs = new Date(asUtc.toLocaleString("en-US", { timeZone: zone })).getTime() - new Date(asUtc.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  const start = new Date(asUtc.getTime() - offsetMs);
  return { start, end: new Date(start.getTime() + 86400000) };
}

export default async function AppLayout({ children }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  // Independent lookups run together instead of one after another.
  const [isAdmin, branding, myBiz] = await Promise.all([
    getIsAdmin(user.id),
    getBranding(),
    getActiveBusiness(user.id), // admins: the customer they're managing, else their own
  ]);
  const managing = !!myBiz?._managed;
  const appName = branding.app_name;
  let showChat = true;
  let aiPaused = null; // null = AI running; otherwise a reason string for the banner

  const { start, end } = todayRange(myBiz?.timezone);
  // Owners / managed customer: that business. Admins (not managing): the whole platform.
  let todayQuery = supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .gte("start_time", start.toISOString())
    .lt("start_time", end.toISOString());
  if ((!isAdmin || managing) && myBiz) todayQuery = todayQuery.eq("business_id", myBiz.id);

  const [todayRes, planRes] = await Promise.all([
    todayQuery,
    myBiz?.plan
      ? supabase.from("plans").select("chat_history").eq("name", myBiz.plan).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const apptsToday = todayRes.count || 0;

  // Plan features. Admins always get everything; customers get what their plan includes.
  const planName = String(myBiz?.plan || "");
  const hasChat = isAdmin || planRes.data?.chat_history === true;
  const hasWebhooks = isAdmin || /^business$/i.test(planName);

  if ((!isAdmin || managing) && myBiz) {
    if (!["active", "trialing"].includes(myBiz.sub_status)) {
      aiPaused = myBiz.sub_status === "past_due" ? "Your last payment failed, so your AI receptionist is paused. Update your card to switch it back on."
        : myBiz.sub_status === "cancelled" ? "Your subscription has ended, so your AI receptionist is paused. Pick a plan to switch it back on."
        : "Your AI receptionist is off. Start your 7-day free trial to switch it on.";
    }
    if (myBiz.status === "suspended") {
      aiPaused = "Your account is suspended, so your AI receptionist is paused. Please contact support.";
    }
  }
  const initial = (user.email || "?").charAt(0).toUpperCase();

  const Group = ({ title, children: items }) => (
    <div className="mt-5 first:mt-4">
      <p className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted/80">{title}</p>
      <nav className="space-y-0.5">{items}</nav>
    </div>
  );

  // Admin command center — its own menu, with the AI assistant at the very top.
  const adminNav = isAdmin && (
    <div className="mt-4">
      <NavItem href="/admin/assistant" label="AI Assistant" icon={IcSpark} />
      <Group title="Command center">
        <NavItem href="/admin" label="Platform overview" icon={IcGrid} exact />
        <NavItem href="/admin/clients" label="Customers" icon={IcUsers} />
        <NavItem href="/admin/bookings" label="All bookings" icon={IcList} />
        <NavItem href="/admin/calendar" label="All calendars" icon={IcCalendar} />
        <NavItem href="/admin/plans" label="Plans & revenue" icon={IcCard} />
        <NavItem href="/admin/branding" label="Branding" icon={IcPaint} />
      </Group>
    </div>
  );

  // Customer menu — ordered the way a business sets up and then works day to day.
  const customerNav = (
    <>
      <Group title={isAdmin && !managing ? "My business · Set up" : "Set up"}>
        <NavItem href="/dashboard" label="Overview" icon={IcGrid} exact />
        <NavItem href="/setup" label="Get set up" icon={IcSpark} />
        <NavItem href="/connect-whatsapp" label="Connect WhatsApp" icon={(<svg {...S}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>)} />
        <NavItem href="/ai-front-desk" label="AI front desk" icon={IcRobot} />
        <NavItem href="/services" label="Services" icon={IcTag} />
        <NavItem href="/knowledge" label="Knowledge" icon={IcBook} />
        <NavItem href="/team" label="Team" icon={IcUser} />
      </Group>
      <Group title="Daily work">
        <NavItem href="/calendar" label="Calendar" icon={IcCalendar} />
        <NavItem href="/waitlist" label="Waitlist" icon={IcList} />
        <NavItem href="/leads" label="Leads" icon={IcUsers} />
        <NavItem href="/quotes" label="Quotes & invoices" icon={IcCard} />
        <NavItem href="/memberships" label="Memberships" icon={IcUser} />
        <NavItem href="/ask" label="Ask AI" icon={IcSpark} />
        <NavItem href="/clients" label="Clients" icon={IcUsers} />
        {hasChat
          ? <NavItem href="/conversations" label="Conversations" icon={IcChat} />
          : <NavItem href="/billing" label="Conversations" icon={IcChat} badge="Pro" />}
      </Group>
      <Group title="Grow">
        <NavItem href="/channels" label="Instagram & Messenger" icon={IcChat} />
        <NavItem href="/phone" label="Phone receptionist" icon={IcBell} />
        <NavItem href="/website" label="Website & booking" icon={IcGlobe} />
        <NavItem href="/followups" label="Payments & follow-ups" icon={IcBell} />
        <NavItem href="/marketing" label="Marketing" icon={IcMega} />
        <NavItem href="/insights" label="Insights" icon={IcChart} />
        <NavItem href="/integrations" label="Integrations" icon={IcPlug} />
      </Group>
      <Group title="Account">
        <NavItem href="/settings" label="Settings" icon={IcCog} />
        <NavItem href="/notifications" label="Notifications" icon={IcBell} />
        <NavItem href="/billing" label="Billing" icon={IcCard} />
      </Group>

    </>
  );

  // Admins (not managing a customer): command center first, own business below.
  // Managing a customer: their menu first, command center below to get back.
  const navContent = isAdmin && !managing ? (
    <>
      {adminNav}
      <div className="mt-5 border-t border-line pt-1">{customerNav}</div>
    </>
  ) : (
    <>
      {customerNav}
      {isAdmin && <div className="mt-5 border-t border-line pt-1">{adminNav}</div>}
    </>
  );

  const userBox = (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-canvas/60 p-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{initial}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium text-text">{user.email}</p>
        <p className="text-[11px] text-muted">{isAdmin ? "Admin" : "Owner"}</p>
      </div>
      <SignOutButton />
    </div>
  );

  // Business switcher-style header: logo + the business you're working on + its plan
  const brandBlock = (
    <div className="flex items-center gap-2.5 px-1">
      <div className="logo-mark h-9 w-9 text-[15px]">{appName.charAt(0)}</div>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold tracking-tight text-text">{appName}</p>
        <p className="truncate text-[11.5px] text-muted">{/^nextreply$/i.test(appName) ? "AI receptionist" : "by NextReply"}</p>
      </div>
    </div>
  );
  // The business you are working on — shown under the brand, not as the app name.
  const workspace = (myBiz?.name || isAdmin) && (
    <div className="mt-3 flex items-center gap-2 rounded-xl bg-canvas px-2.5 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted/80">Business</span>
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-text">{myBiz?.name || "Admin workspace"}</span>
      {myBiz?.plan && <span className="shrink-0 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted">{myBiz.plan}</span>}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Desktop sidebar — light, quiet, grouped */}
      <aside className="sticky top-0 hidden h-screen w-[244px] shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="border-b border-line px-4 py-4">{brandBlock}{workspace}</div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">{navContent}</div>
        <div className="border-t border-line p-3">{userBox}</div>
      </aside>

      {/* Mobile top bar + slide-out drawer */}
      <MobileNav appName={appName} brandBlock={brandBlock} navContent={navContent} userBox={userBox} />

      {/* Right side: top bar + main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop top bar */}
        <div className="sticky top-0 z-20 hidden h-14 items-center justify-between border-b border-line bg-surface/85 px-8 backdrop-blur md:flex">
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-tint text-brand">{IcCalendar}</span>
            <span>Today: <b className="font-semibold text-text">{apptsToday}</b> appointment{apptsToday === 1 ? "" : "s"}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <a href="/calendar?new=1" className="btn-ghost h-9 px-3 py-0 text-[13px]">+ New appointment</a>
            <span className={`pill ${isAdmin ? "bg-ink text-white" : "bg-brand-tint text-brand-dark"}`}>{isAdmin ? "Admin" : "Owner"}</span>
            <NotificationBell />
          </div>
        </div>

        {/* Main */}
        <LiveInbox />
        <main className="flex-1 px-4 pb-16 pt-20 sm:px-6 md:px-8 md:pt-8">
          <div className="mx-auto max-w-6xl">
            {managing && (
              <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-brand/30 bg-brand-tint px-4 py-3 text-sm text-brand-dark">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">A</span>
                <p className="min-w-0 flex-1">You're managing <b>{myBiz.name || "this customer"}</b> as admin. Every page and every change now applies to their account.</p>
                <form action={stopManaging}><button className="btn-ghost shrink-0 px-4 py-2 text-sm">Exit to admin</button></form>
              </div>
            )}
            {aiPaused && (
              <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/30">!</span>
                <p className="min-w-0 flex-1">{aiPaused}</p>
                {myBiz?.status !== "suspended" && <a href="/billing" className="btn-brand shrink-0 px-4 py-2 text-sm">Go to Billing</a>}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
