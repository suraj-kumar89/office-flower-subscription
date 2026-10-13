-- Run in Supabase SQL Editor.
create table if not exists public.flower_quote_requests (
  id bigint generated always as identity primary key,
  name text not null,
  company text not null,
  email text not null,
  phone text not null,
  city text not null,
  frequency text not null check (frequency in ('weekly', 'fortnightly', 'monthly')),
  whole_year boolean not null default false,
  notes text,
  subscription text,
  source text default 'hero',
  page_url text,
  tracking jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- If you already created the table using an earlier version of the SQL, add the new fields safely.
alter table public.flower_quote_requests add column if not exists subscription text;
alter table public.flower_quote_requests add column if not exists page_url text;
alter table public.flower_quote_requests add column if not exists tracking jsonb not null default '{}'::jsonb;

alter table public.flower_quote_requests enable row level security;
-- Do not add public SELECT/INSERT policies. The server-side service_role key bypasses RLS.
