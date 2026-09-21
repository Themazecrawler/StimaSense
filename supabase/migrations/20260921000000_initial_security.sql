create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  service_area text,
  notification_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outage_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_area text not null,
  description text not null check (char_length(description) between 10 and 2000),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'corroborated', 'official')),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kplc_planned_outages (
  id text primary key,
  region text not null,
  specific_area text not null,
  start_time timestamptz not null,
  end_time timestamptz not null check (end_time > start_time),
  source_url text not null check (source_url like 'https://%'),
  scraped_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.outage_reports enable row level security;
alter table public.kplc_planned_outages enable row level security;

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "reports_insert_own_unverified" on public.outage_reports;
create policy "reports_insert_own_unverified" on public.outage_reports for insert to authenticated
  with check (
    auth.uid() = user_id
    and verification_status = 'unverified'
    and moderation_status = 'pending'
  );

drop policy if exists "reports_read_own" on public.outage_reports;
create policy "reports_read_own" on public.outage_reports for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "planned_outages_public_read" on public.kplc_planned_outages;
create policy "planned_outages_public_read" on public.kplc_planned_outages for select to anon, authenticated
  using (true);

revoke update, delete on public.outage_reports from authenticated;
grant select, insert on public.outage_reports to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.kplc_planned_outages to anon, authenticated;
