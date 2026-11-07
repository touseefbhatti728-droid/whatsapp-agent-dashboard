-- Run once in Supabase → SQL Editor (after 2026-11-07-phase3.sql).
-- Facebook Messenger + Instagram DMs: the connected Facebook Page (and its linked Instagram account).
alter table public.businesses add column if not exists fb_page_id text;
alter table public.businesses add column if not exists fb_page_name text;
alter table public.businesses add column if not exists fb_page_token text;   -- long-lived Page token (server use only)
alter table public.businesses add column if not exists ig_account_id text;
alter table public.businesses add column if not exists ig_username text;
create unique index if not exists businesses_fb_page_id_key on public.businesses (fb_page_id) where fb_page_id is not null;
create unique index if not exists businesses_ig_account_id_key on public.businesses (ig_account_id) where ig_account_id is not null;
