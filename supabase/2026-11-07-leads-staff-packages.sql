-- Run once in Supabase → SQL Editor (after 2026-11-05-waitlist-reviews.sql).

-- 1) Leads CRM: every new contact (WhatsApp, website, ads, Zapier) with qualification.
create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  business_id     uuid not null references public.businesses (id) on delete cascade,
  name            text,
  phone           text,               -- digits with country code (or web:<id> for website visitors)
  email           text,
  source          text not null default 'whatsapp',   -- whatsapp | website | facebook | webhook | manual
  campaign        text,               -- ad / form / campaign name
  interest        text,               -- service or treatment they asked about
  budget          text,
  timeline        text,
  notes           text,
  score           int  not null default 0 check (score between 0 and 100),
  stage           text not null default 'new' check (stage in ('new', 'contacted', 'qualified', 'booked', 'won', 'lost')),
  last_contact_at timestamptz
);
create unique index if not exists leads_business_phone_idx on public.leads (business_id, phone);  -- nulls stay distinct
create index if not exists leads_business_stage_idx on public.leads (business_id, stage, created_at desc);

alter table public.leads enable row level security;
drop policy if exists "leads_own" on public.leads;
create policy "leads_own" on public.leads for all
  using (exists (select 1 from public.businesses b where b.id = business_id and (b.owner_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.businesses b where b.id = business_id and (b.owner_id = auth.uid() or public.is_admin())));

-- Lead settings on the business: what the AI should find out, the intake webhook key,
-- and the approved WhatsApp template used for the first message to a new ad lead.
alter table public.businesses add column if not exists lead_questions text;
alter table public.businesses add column if not exists lead_webhook_key text;
alter table public.businesses add column if not exists lead_template text;
alter table public.businesses add column if not exists lead_template_lang text default 'en';

-- 2) Staff: working hours per person and which services they do (empty = all).
alter table public.team_members add column if not exists availability jsonb;   -- same shape as businesses.ai_hours
alter table public.team_members add column if not exists services text[] not null default '{}';
alter table public.bookings add column if not exists staff_id uuid references public.team_members (id) on delete set null;

-- 3) Packages: bundles / multi-session offers the AI and booking page can sell.
create table if not exists public.packages (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  business_id   uuid not null references public.businesses (id) on delete cascade,
  name          text not null,
  description   text,
  services      text[] not null default '{}',  -- services included
  price         text,
  sessions      int not null default 1 check (sessions between 1 and 100),
  validity_days int,                            -- null = no expiry
  active        boolean not null default true
);
create index if not exists packages_business_idx on public.packages (business_id);

alter table public.packages enable row level security;
drop policy if exists "packages_own" on public.packages;
create policy "packages_own" on public.packages for all
  using (exists (select 1 from public.businesses b where b.id = business_id and (b.owner_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.businesses b where b.id = business_id and (b.owner_id = auth.uid() or public.is_admin())));
