-- Migration 002: chronological PV ordering + fast sorting.
-- Run in Supabase SQL Editor BEFORE deploying PV2. Additive and safe to run twice.
--
-- Step 0 (optional check, should return no rows if there are no clashing numbers):
-- select split_part(pv_no,'-',2) y, split_part(pv_no,'-',1)::int m, split_part(pv_no,'-',3)::bigint s, count(*)
--   from public.vouchers where pv_no ~ '^\d{1,2}-\d{4}-\d{1,9}$'
--   group by 1,2,3 having count(*) > 1;

alter table public.vouchers
  add column if not exists pv_year  int    generated always as (case when pv_no ~ '^\d{1,2}-\d{4}-\d{1,9}$' then split_part(pv_no,'-',2)::int    end) stored,
  add column if not exists pv_month int    generated always as (case when pv_no ~ '^\d{1,2}-\d{4}-\d{1,9}$' then split_part(pv_no,'-',1)::int    end) stored,
  add column if not exists pv_seq   bigint generated always as (case when pv_no ~ '^\d{1,2}-\d{4}-\d{1,9}$' then split_part(pv_no,'-',3)::bigint end) stored,
  add column if not exists requester_norm text generated always as (lower(btrim(requester))) stored;

-- "10-2026-21" and "10-2026-021" are the same number: block both
create unique index if not exists vouchers_pv_numeric_uniq on public.vouchers (pv_year, pv_month, pv_seq) where pv_year is not null;
create index if not exists vouchers_voucher_date_idx on public.vouchers (voucher_date);
create index if not exists vouchers_requester_norm_idx on public.vouchers (requester_norm);
