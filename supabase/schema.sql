-- ============================================================
--  WhatsApp Booking Agent — Dashboard database setup
--  Run this ONCE in Supabase -> SQL Editor -> New query -> Run.
--  Safe to re-run (uses "if not exists" / "or replace").
-- ============================================================

-- 1) PROFILES ------------------------------------------------
-- One row per logged-in user. is_admin = true means you (the owner).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create a profile whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is the current user an admin? (SECURITY DEFINER avoids RLS recursion.)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- 2) BUSINESSES ----------------------------------------------
-- Your existing table. We just add an owner link so each client
-- sees only their own business(es).
alter table public.businesses
  add column if not exists owner_id uuid references auth.users (id);

-- 3) BOOKINGS ------------------------------------------------
-- New table. The agent (Railway) writes a row here for every booking,
-- and the dashboard reads from it.
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_id bigint references public.businesses (id) on delete cascade,
  customer_name text,
  customer_phone text,
  service text,
  start_time timestamptz,
  notes text,
  source text default 'whatsapp'
);

create index if not exists bookings_business_id_idx on public.bookings (business_id);
create index if not exists bookings_start_time_idx on public.bookings (start_time);

-- 4) ROW LEVEL SECURITY --------------------------------------
alter table public.profiles  enable row level security;
alter table public.businesses enable row level security;
alter table public.bookings  enable row level security;

-- profiles: a user sees their own; admins see all.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- businesses: owner sees own; admin sees all.
drop policy if exists "businesses_select" on public.businesses;
create policy "businesses_select" on public.businesses
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "businesses_update_own" on public.businesses;
create policy "businesses_update_own" on public.businesses
  for update using (owner_id = auth.uid() or public.is_admin());

-- bookings: visible if the booking belongs to one of your businesses; admin sees all.
drop policy if exists "bookings_select" on public.bookings;
create policy "bookings_select" on public.bookings
  for select using (
    public.is_admin()
    or business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );

-- NOTE: The agent on Railway writes bookings using the SERVICE ROLE key,
-- which bypasses RLS — so no INSERT policy is needed for it. Keep the
-- service role key ONLY on the server (Railway), never in the browser.

-- ============================================================
--  AFTER RUNNING THIS:
--  1. Create your login user:  Authentication -> Users -> Add user
--     (give it your email + a password).
--  2. Make yourself admin:
--        update public.profiles set is_admin = true where email = 'YOUR_EMAIL';
--  3. Link a business to a client user (once that client has a user id):
--        update public.businesses set owner_id = 'THE_USER_UUID' where id = <business id>;
-- ============================================================
