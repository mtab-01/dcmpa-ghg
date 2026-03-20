-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor → New query)

create table if not exists members (
  position int primary key,
  name text not null
);

-- Seed default names
insert into members (position, name)
select i, 'Member ' || (i + 1)
from generate_series(0, 11) as i
on conflict (position) do nothing;

alter table members enable row level security;
create policy "public access" on members for all using (true) with check (true);

create table if not exists attendance (
  event_id uuid not null,
  position int not null,
  response text check (response in ('yes', 'no')),
  primary key (event_id, position)
);

alter table attendance enable row level security;
create policy "public access" on attendance for all using (true) with check (true);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  time time,
  end_time time,
  location text,
  notes text,
  created_at timestamptz default now()
);

-- Migration: add end_time to existing events table
alter table events add column if not exists end_time time;

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  folder text not null,
  notes text,
  added_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount numeric not null,
  date date not null,
  paid_by text not null,
  category text not null,
  split_type text not null default 'even',
  splits jsonb,
  receipt_url text,
  created_at timestamptz default now()
);

-- Allow public read/write (no auth required)
alter table events enable row level security;
alter table videos enable row level security;
alter table expenses enable row level security;

create policy "public access" on events for all using (true) with check (true);
create policy "public access" on videos for all using (true) with check (true);
create policy "public access" on expenses for all using (true) with check (true);
