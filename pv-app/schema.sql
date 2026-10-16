-- Run once in Supabase: SQL Editor > New query > paste the SQL below (not the file name) > Run.
-- Safe to run more than once.

create table if not exists public.vouchers (
  id            uuid primary key default gen_random_uuid(),
  pv_no         text not null unique,
  voucher_date  date not null,
  amount_cents  bigint not null check (amount_cents > 0),
  amount_words  text,
  purpose       text not null,
  requester     text not null,
  created_at    timestamptz not null default now(),
  created_by    uuid default auth.uid()
);

create table if not exists public.settings (
  id            int primary key check (id = 1),
  seed          text default '',
  reset_monthly boolean default true
);

-- Numbering continues after this PV No. until the first voucher is logged
insert into public.settings (id, seed) values (1, '10-2026-020') on conflict (id) do nothing;

-- Only the backend (service-role key) may touch these tables.
-- RLS on + no policies = the public/anon key can read and write nothing.
alter table public.vouchers enable row level security;
alter table public.settings enable row level security;
drop policy if exists "signed-in users manage vouchers" on public.vouchers;
drop policy if exists "signed-in users manage settings" on public.settings;
