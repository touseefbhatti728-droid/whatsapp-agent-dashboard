-- Run once in Supabase → SQL Editor (after 2026-11-07-leads-staff-packages.sql).
-- Deposits & payment links, quotes & invoices, intake forms, feedback, loyalty, memberships.

-- Helper used by every policy below: the signed-in user owns the business, or is an admin.
create or replace function public.owns_business(bid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses b where b.id = bid and (b.owner_id = auth.uid() or public.is_admin()));
$$;

-- 1) Payments & deposits ----------------------------------------------------------
alter table public.businesses add column if not exists payment_link text;          -- Stripe / Tabby / JazzCash / any pay link
alter table public.businesses add column if not exists payment_instructions text;  -- e.g. "Easypaisa 0300-1234567 (Ali Khan)"
alter table public.businesses add column if not exists deposit_required boolean not null default false;
alter table public.businesses add column if not exists deposit_amount text;        -- e.g. "AED 100" or "20%"
alter table public.businesses add column if not exists currency text default 'AED';
-- Approved WhatsApp template for messages we send first (feedback, renewals, invoices):
-- body like "Hi {{1}}, {{2}}" — {{1}} = name, {{2}} = the message.
alter table public.businesses add column if not exists notify_template text;
alter table public.businesses add column if not exists notify_template_lang text default 'en';
alter table public.bookings add column if not exists deposit_status text not null default 'none'
  check (deposit_status in ('none', 'pending', 'paid'));

-- 2) Quotes & invoices -------------------------------------------------------------
create table if not exists public.quotes (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  kind           text not null default 'quote' check (kind in ('quote', 'invoice')),
  number         serial,
  token          text not null unique default replace(gen_random_uuid()::text, '-', ''),
  customer_name  text,
  customer_phone text,
  items          jsonb not null default '[]',   -- [{ "name": "...", "qty": 1, "price": 100 }]
  total          numeric(12, 2) not null default 0,
  deposit        numeric(12, 2),
  currency       text not null default 'AED',
  notes          text,
  valid_until    date,                           -- quotes
  due_date       date,                           -- invoices
  payment_link   text,
  status         text not null default 'sent' check (status in ('draft', 'sent', 'accepted', 'paid', 'cancelled')),
  accepted_at    timestamptz,
  paid_at        timestamptz,
  last_reminded_at timestamptz
);
create index if not exists quotes_business_idx on public.quotes (business_id, created_at desc);
alter table public.quotes enable row level security;
drop policy if exists "quotes_own" on public.quotes;
create policy "quotes_own" on public.quotes for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));

-- 3) Intake forms ------------------------------------------------------------------
alter table public.businesses add column if not exists intake_form jsonb;   -- [{ "label": "...", "type": "text|yesno|choice", "options": [], "required": true }]
create table if not exists public.intake_responses (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  booking_id     uuid references public.bookings (id) on delete cascade,
  token          text not null unique default replace(gen_random_uuid()::text, '-', ''),
  customer_name  text,
  customer_phone text,
  answers        jsonb,                        -- null until the customer fills it in
  submitted_at   timestamptz
);
create index if not exists intake_business_idx on public.intake_responses (business_id, created_at desc);
create index if not exists intake_booking_idx on public.intake_responses (booking_id);
alter table public.intake_responses enable row level security;
drop policy if exists "intake_own" on public.intake_responses;
create policy "intake_own" on public.intake_responses for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));

-- 4) Feedback after a visit ---------------------------------------------------------
alter table public.businesses add column if not exists feedback_enabled boolean not null default false;
alter table public.businesses add column if not exists feedback_delay_hours int not null default 3;
create table if not exists public.feedback (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  booking_id     uuid references public.bookings (id) on delete set null,
  token          text not null unique default replace(gen_random_uuid()::text, '-', ''),
  customer_name  text,
  customer_phone text,
  service        text,
  staff_name     text,
  rating         int check (rating between 1 and 5),
  comment        text,
  requested_at   timestamptz,
  answered_at    timestamptz
);
create unique index if not exists feedback_booking_idx on public.feedback (booking_id);
create index if not exists feedback_business_idx on public.feedback (business_id, created_at desc);
alter table public.feedback enable row level security;
drop policy if exists "feedback_own" on public.feedback;
create policy "feedback_own" on public.feedback for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));

-- 5) Loyalty: every N visits earns a reward --------------------------------------------
alter table public.businesses add column if not exists loyalty_enabled boolean not null default false;
alter table public.businesses add column if not exists loyalty_visits int not null default 5 check (loyalty_visits between 2 and 50);
alter table public.businesses add column if not exists loyalty_reward text;   -- e.g. "a free blow-dry"
create table if not exists public.loyalty_redemptions (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  customer_phone text not null,
  reward         text
);
create index if not exists loyalty_business_phone_idx on public.loyalty_redemptions (business_id, customer_phone);
alter table public.loyalty_redemptions enable row level security;
drop policy if exists "loyalty_own" on public.loyalty_redemptions;
create policy "loyalty_own" on public.loyalty_redemptions for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));

-- 6) Memberships (gyms, spas, clinics with plans) --------------------------------------
create table if not exists public.memberships (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  business_id      uuid not null references public.businesses (id) on delete cascade,
  customer_name    text,
  customer_phone   text,
  plan_name        text not null,
  price            text,
  start_date       date not null default current_date,
  end_date         date not null,
  status           text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  notes            text,
  last_reminded_at timestamptz,
  reminders_sent   int not null default 0
);
create index if not exists memberships_business_idx on public.memberships (business_id, end_date);
alter table public.memberships enable row level security;
drop policy if exists "memberships_own" on public.memberships;
create policy "memberships_own" on public.memberships for all using (public.owns_business(business_id)) with check (public.owns_business(business_id));

-- 7) Industry template the business picked (salon, clinic, gym, real_estate, …) -------------
alter table public.businesses add column if not exists industry text;
