-- Run once in Supabase → SQL Editor (after 2026-11-04-pauses-realtime.sql).

-- 1) Google review link: the AI shares it when a happy customer thanks the business,
--    and marketing messages can use {review_link}.
alter table public.businesses add column if not exists google_review_url text;

-- 2) Waitlist: customers who wanted a time that was full. When a booking on that day
--    is cancelled or moved, the first person waiting is offered the slot.
create table if not exists public.waitlist (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  customer_name  text,
  customer_phone text not null,
  service        text,
  wanted_date    date not null,          -- business-local date
  wanted_time    text,                   -- "HH:MM" business-local, null = any time that day
  status         text not null default 'waiting' check (status in ('waiting', 'offered', 'booked', 'removed')),
  offered_at     timestamptz
);
create index if not exists waitlist_business_date_idx on public.waitlist (business_id, wanted_date, status);

alter table public.waitlist enable row level security;
-- The backend and dashboard server use the service role; owners (and admins) can see and manage their own.
drop policy if exists "waitlist_select_own" on public.waitlist;
create policy "waitlist_select_own" on public.waitlist for select
  using (exists (select 1 from public.businesses b where b.id = business_id and (b.owner_id = auth.uid() or public.is_admin())));
drop policy if exists "waitlist_update_own" on public.waitlist;
create policy "waitlist_update_own" on public.waitlist for update
  using (exists (select 1 from public.businesses b where b.id = business_id and (b.owner_id = auth.uid() or public.is_admin())));
