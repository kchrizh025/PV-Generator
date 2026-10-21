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

-- ---- Migration 002 (sorting / chronological PV numbers) ----
alter table public.vouchers
  add column if not exists pv_year  int    generated always as (case when pv_no ~ '^\d{1,2}-\d{4}-\d{1,9}$' then split_part(pv_no,'-',2)::int    end) stored,
  add column if not exists pv_month int    generated always as (case when pv_no ~ '^\d{1,2}-\d{4}-\d{1,9}$' then split_part(pv_no,'-',1)::int    end) stored,
  add column if not exists pv_seq   bigint generated always as (case when pv_no ~ '^\d{1,2}-\d{4}-\d{1,9}$' then split_part(pv_no,'-',3)::bigint end) stored,
  add column if not exists requester_norm text generated always as (lower(btrim(requester))) stored;

-- "10-2026-21" and "10-2026-021" are the same number: block both
create unique index if not exists vouchers_pv_numeric_uniq on public.vouchers (pv_year, pv_month, pv_seq) where pv_year is not null;
create index if not exists vouchers_voucher_date_idx on public.vouchers (voucher_date);
create index if not exists vouchers_requester_norm_idx on public.vouchers (requester_norm);

-- ---- Migration 003 (expense category for Reports) ----
alter table public.vouchers add column if not exists category text not null default 'Uncategorized';
create index if not exists vouchers_category_idx on public.vouchers (category);
