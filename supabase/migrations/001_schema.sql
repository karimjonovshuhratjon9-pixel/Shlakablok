-- =====================================================================
-- Shlakablok: jadvallar + xavfsizlik (RLS) + kunlik hisobot funksiyasi
-- Supabase Dashboard -> SQL Editor ga to'liq tashlab "Run" bosing.
-- =====================================================================

create table if not exists public.expenses (
  id            text primary key,
  category      text        not null,
  category_name text        not null,
  amount        bigint      not null check (amount > 0),
  note          text        not null default '',
  is_per_batch  boolean     not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.production_batches (
  id             text primary key,
  date           date        not null,
  quantity       integer     not null check (quantity > 0),
  cost_per_block bigint      not null check (cost_per_block >= 0),
  total_cost     bigint      not null check (total_cost >= 0),
  note           text        not null default '',
  created_at     timestamptz not null default now()
);

create table if not exists public.sales (
  id         text primary key,
  customer   text        not null default '',
  quantity   integer     not null check (quantity > 0),
  unit_price bigint      not null check (unit_price > 0),
  total      bigint      not null check (total >= 0),
  paid       bigint      not null default 0 check (paid >= 0),
  date       date        not null,
  created_at timestamptz not null default now(),
  check (paid <= total)
);

create index if not exists expenses_created_at_idx on public.expenses (created_at);
create index if not exists batches_date_idx        on public.production_batches (date);
create index if not exists sales_date_idx          on public.sales (date);

-- ---------------------------------------------------------------------
-- Ruxsat: ilova login'siz, anon kalit bilan ishlaydi
-- ---------------------------------------------------------------------
alter table public.expenses           enable row level security;
alter table public.production_batches enable row level security;
alter table public.sales              enable row level security;

drop policy if exists "open access" on public.expenses;
drop policy if exists "open access" on public.production_batches;
drop policy if exists "open access" on public.sales;

create policy "open access" on public.expenses
  for all to anon, authenticated using (true) with check (true);
create policy "open access" on public.production_batches
  for all to anon, authenticated using (true) with check (true);
create policy "open access" on public.sales
  for all to anon, authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- Kunlik hisobot (Toshkent vaqti bo'yicha). Ilova ham, Telegram bot ham
-- aynan shu funksiyadan foydalanadi - raqamlar doim bir xil chiqadi.
--   Tushum     = shu kuni qilingan sotuvlar summasi
--   Xarajat    = shu kuni kiritilgan xarajatlar
--   Sof foyda  = Tushum - Xarajat
-- ---------------------------------------------------------------------
create or replace function public.daily_report(p_date date)
returns jsonb
language sql
stable
set search_path = public
as $$
  with
  s as (
    select coalesce(sum(quantity), 0)::bigint as blocks,
           coalesce(sum(total), 0)::bigint    as revenue,
           coalesce(sum(paid), 0)::bigint     as paid,
           count(*)::int                      as cnt
    from sales where date = p_date
  ),
  e as (
    select coalesce(sum(amount), 0)::bigint as total,
           count(*)::int                    as cnt
    from expenses
    where (created_at at time zone 'Asia/Tashkent')::date = p_date
  ),
  c as (
    select coalesce(
             jsonb_agg(jsonb_build_object('name', category_name, 'amount', amt) order by amt desc),
             '[]'::jsonb) as cats
    from (
      select category_name, sum(amount)::bigint as amt
      from expenses
      where (created_at at time zone 'Asia/Tashkent')::date = p_date
      group by category_name
    ) x
  ),
  p as (
    select coalesce(sum(quantity), 0)::bigint as produced
    from production_batches where date = p_date
  ),
  st as (
    select (select coalesce(sum(quantity), 0) from production_batches)
         - (select coalesce(sum(quantity), 0) from sales) as stock
  )
  select jsonb_build_object(
    'date',            p_date,
    'sold_blocks',     s.blocks,
    'sales_count',     s.cnt,
    'revenue',         s.revenue,
    'paid',            s.paid,
    'debt',            s.revenue - s.paid,
    'expenses',        e.total,
    'expenses_count',  e.cnt,
    'expense_by_category', c.cats,
    'net_profit',      s.revenue - e.total,
    'produced_blocks', p.produced,
    'stock',           st.stock
  )
  from s, e, c, p, st;
$$;

grant execute on function public.daily_report(date) to anon, authenticated, service_role;
