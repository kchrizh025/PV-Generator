-- Run once in Supabase SQL Editor (safe to repeat). Adds expense categories for Reports.
alter table public.vouchers add column if not exists category text not null default 'Uncategorized';
create index if not exists vouchers_category_idx on public.vouchers (category);
