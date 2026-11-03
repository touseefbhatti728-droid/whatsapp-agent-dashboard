-- Run once in Supabase → SQL Editor.
-- Owners can edit their own business, but must NOT be able to change billing / account
-- fields from the browser (anon key + RLS). Only admins, the Stripe webhook and the
-- backend (service role) may change them.

create or replace function public.protect_business_billing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service role (Stripe webhook, backend), SQL editor, and admins are allowed
  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('postgres', 'supabase_admin', 'service_role')
     or public.is_admin() then
    return new;
  end if;

  if new.plan is distinct from old.plan
     or new.sub_status is distinct from old.sub_status
     or new.status is distinct from old.status
     or new.renews_at is distinct from old.renews_at
     or new.owner_id is distinct from old.owner_id
     or new.stripe_customer_id is distinct from old.stripe_customer_id then
    raise exception 'Only an admin can change plan, subscription or account status';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_business_billing on public.businesses;
create trigger protect_business_billing
  before update on public.businesses
  for each row execute function public.protect_business_billing();

-- Owners can only keep a row as their own after an update.
drop policy if exists "businesses_update_own" on public.businesses;
create policy "businesses_update_own" on public.businesses
  for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- One WhatsApp number can belong to only one business.
create unique index if not exists businesses_meta_phone_number_id_key
  on public.businesses (meta_phone_number_id)
  where meta_phone_number_id is not null;

-- Branding (app name / colour) can only be changed by admins.
alter table public.settings enable row level security;
drop policy if exists "settings_select_all" on public.settings;
create policy "settings_select_all" on public.settings for select using (true);
drop policy if exists "settings_update_admin" on public.settings;
create policy "settings_update_admin" on public.settings for update using (public.is_admin()) with check (public.is_admin());
