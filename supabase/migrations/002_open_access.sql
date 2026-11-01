-- Login olib tashlandi: ilova anon kalit bilan ishlaydi.
-- Agar 001_schema.sql ni avval ishga tushirgan bo'lsangiz, buni ham Run qiling.
drop policy if exists "auth full access" on public.expenses;
drop policy if exists "auth full access" on public.production_batches;
drop policy if exists "auth full access" on public.sales;
drop policy if exists "open access" on public.expenses;
drop policy if exists "open access" on public.production_batches;
drop policy if exists "open access" on public.sales;

create policy "open access" on public.expenses
  for all to anon, authenticated using (true) with check (true);
create policy "open access" on public.production_batches
  for all to anon, authenticated using (true) with check (true);
create policy "open access" on public.sales
  for all to anon, authenticated using (true) with check (true);

grant execute on function public.daily_report(date) to anon, authenticated, service_role;
