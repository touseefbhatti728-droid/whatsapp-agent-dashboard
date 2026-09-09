import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import NavItem from "@/components/NavItem";

const CalendarIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const UsersIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.is_admin === true;
  const initial = (user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-ink p-4 md:flex">
        <div>
          <div className="flex items-center gap-2.5 px-2 py-3 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold">B</div>
            <span className="font-semibold tracking-tight">Booking Agent</span>
          </div>
          <nav className="mt-6 space-y-1">
            <NavItem href="/dashboard" label="My bookings" icon={CalendarIcon} />
            {isAdmin && <NavItem href="/admin" label="All clients" icon={UsersIcon} />}
          </nav>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white">{user.email}</p>
              <p className="text-xs text-white/40">{isAdmin ? "Admin" : "Owner"}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="fixed inset-x-0 top-0 z-10 flex items-center justify-between bg-ink px-4 py-3 md:hidden">
        <div className="flex items-center gap-2 text-white">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-bold">B</div>
          <span className="text-sm font-semibold">Booking Agent</span>
        </div>
        <nav className="flex items-center gap-1 text-sm">
          <NavItem href="/dashboard" label="Bookings" icon={null} />
          {isAdmin && <NavItem href="/admin" label="Clients" icon={null} />}
        </nav>
      </header>

      {/* Main */}
      <main className="flex-1 px-5 pb-12 pt-20 md:px-10 md:pt-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
