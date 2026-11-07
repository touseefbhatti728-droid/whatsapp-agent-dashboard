-- Run once in Supabase → SQL Editor. Setup wizard: the business's website and where the widget is installed.
alter table public.businesses add column if not exists website_url text;
alter table public.businesses add column if not exists widget_seen_at timestamptz;
alter table public.businesses add column if not exists widget_origin text;
