-- Run once in Supabase → SQL Editor (after protect-billing-columns.sql).

-- 1) Human takeover pauses: when the owner replies (dashboard or WhatsApp Business app)
--    or the AI hands a chat over, the AI stays quiet for that customer until `until`.
create table if not exists public.ai_pauses (
  business_id    uuid   not null references public.businesses (id) on delete cascade,
  customer_phone text  not null,
  until          timestamptz not null,
  reason         text,
  created_at     timestamptz not null default now(),
  primary key (business_id, customer_phone)
);
alter table public.ai_pauses enable row level security;
-- Only the backend / dashboard server (service role) read and write it; owners can see their own.
drop policy if exists "ai_pauses_select_own" on public.ai_pauses;
create policy "ai_pauses_select_own" on public.ai_pauses for select
  using (exists (select 1 from public.businesses b where b.id = business_id and (b.owner_id = auth.uid() or public.is_admin())));

-- 2) Live notifications: let Supabase Realtime stream new notification rows (RLS still applies).
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
