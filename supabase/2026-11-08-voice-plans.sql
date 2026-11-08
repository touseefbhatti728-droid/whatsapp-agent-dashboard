-- Run once in Supabase -> SQL Editor.
-- Voice plans (AI phone receptionist minutes).
alter table public.businesses add column if not exists voice_plan text;                              -- voice_plan_120 / _250 / _600
alter table public.businesses add column if not exists voice_minutes_included integer not null default 0; -- minutes per month in the plan
alter table public.businesses add column if not exists voice_minutes_used numeric not null default 0;     -- used this billing month
alter table public.businesses add column if not exists voice_addon_minutes numeric not null default 0;    -- extra minutes bought (no monthly expiry)
alter table public.businesses add column if not exists voice_period_start timestamptz;                    -- start of the current voice month

-- Owners must not be able to give themselves minutes from the browser:
-- same protection as plan / subscription fields.
create or replace function public.protect_business_billing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.voice_plan is distinct from old.voice_plan
     or new.voice_minutes_included is distinct from old.voice_minutes_included
     or new.voice_minutes_used is distinct from old.voice_minutes_used
     or new.voice_addon_minutes is distinct from old.voice_addon_minutes
     or new.voice_period_start is distinct from old.voice_period_start then
    raise exception 'Only an admin can change plan, subscription, voice minutes or account status';
  end if;

  return new;
end;
$$;
