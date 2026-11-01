-- =====================================================================
-- Telegram hisobot: har kuni Toshkent vaqti bilan 21:00 da avtomatik.
-- Hammasi Supabase bazasi ichida ishlaydi (Edge Function, CLI kerak emas).
--
-- QILISH KERAK:
--   1) Pastdagi  BOT_TOKEN_SHU_YERGA  va  CHAT_ID_SHU_YERGA  ni o'zingiznikiga almashtiring
--      (ikkalasi ham qo'shtirnoq '...' ichida qolsin).
--   2) Supabase -> SQL Editor ga tashlab Run bosing.
-- Bir nechta chat bo'lsa: '111111,222222'
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Maxfiy sozlamalar. RLS yoqilgan va hech qanday policy yo'q => ilova (anon) buni O'QIY OLMAYDI.
create table if not exists public.app_settings (
  key   text primary key,
  value text not null
);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

insert into public.app_settings (key, value) values
  ('telegram_bot_token', '9204432727:AAFkVNq5CswXXMPLKKiLKs9xAzR1utsW-U0'),
  ('telegram_chat_id',   '2052353078')
on conflict (key) do update set value = excluded.value;

-- Raqamni "1 234 567" ko'rinishida chiqarish
create or replace function public.fmt_uzs(n numeric)
returns text language sql immutable as $$
  select case when n < 0 then '−' else '' end ||
         regexp_replace(abs(round(n))::bigint::text, '(\d)(?=(\d{3})+$)', '\1 ', 'g');
$$;

-- Telegram xabar matni
create or replace function public.daily_report_text(p_date date)
returns text language plpgsql stable set search_path = public as $$
declare
  r jsonb := public.daily_report(p_date);
  t text;
  c jsonb;
  profit numeric := (r->>'net_profit')::numeric;
begin
  t := '📊 <b>Kunlik hisobot — ' || to_char(p_date, 'DD.MM.YYYY') || E'</b>\n\n';

  t := t || '🧱 Sotilgan bloklar: <b>' || fmt_uzs((r->>'sold_blocks')::numeric) || ' dona</b>';
  if (r->>'sales_count')::int > 0 then
    t := t || ' (' || (r->>'sales_count') || ' ta sotuv)';
  end if;
  t := t || E'\n';

  t := t || '💰 Tushum: <b>' || fmt_uzs((r->>'revenue')::numeric) || E' so''m</b>\n';
  if (r->>'revenue')::numeric > 0 then
    t := t || E'     ✅ To''langan: ' || fmt_uzs((r->>'paid')::numeric) || E' so''m\n';
    if (r->>'debt')::numeric > 0 then
      t := t || E'     ⏳ Nasiya (qarz): ' || fmt_uzs((r->>'debt')::numeric) || E' so''m\n';
    end if;
  end if;

  t := t || '💸 Xarajat: <b>' || fmt_uzs((r->>'expenses')::numeric) || E' so''m</b>\n';
  for c in select * from jsonb_array_elements(r->'expense_by_category') loop
    t := t || '     • '
           || replace(replace(replace(c->>'name', '&', '&amp;'), '<', '&lt;'), '>', '&gt;')
           || ': ' || fmt_uzs((c->>'amount')::numeric) || E' so''m\n';
  end loop;

  t := t || E'\n';
  if profit >= 0 then
    t := t || '📈 Sof foyda: <b>' || fmt_uzs(profit) || E' so''m</b>\n\n';
  else
    t := t || '📉 Zarar: <b>' || fmt_uzs(profit) || E' so''m</b>\n\n';
  end if;

  t := t || '🏭 Bugun ishlab chiqarilgan: ' || fmt_uzs((r->>'produced_blocks')::numeric) || E' dona\n';
  t := t || E'📦 Ombor qoldig''i: ' || fmt_uzs((r->>'stock')::numeric) || ' dona';

  if (r->>'sales_count')::int = 0 and (r->>'expenses_count')::int = 0
     and (r->>'produced_blocks')::numeric = 0 then
    t := t || E'\n\nℹ️ Bugun hech qanday amal kiritilmagan.';
  end if;
  return t;
end $$;

-- Hisobotni Telegramga yuboradi. p_date bo'sh bo'lsa - bugun (Toshkent).
create or replace function public.send_daily_report(p_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d     date := coalesce(p_date, (now() at time zone 'Asia/Tashkent')::date);
  token text;
  chats text;
  chat  text;
  txt   text;
  rid   bigint;
  ids   bigint[] := '{}';
begin
  select value into token from public.app_settings where key = 'telegram_bot_token';
  select value into chats from public.app_settings where key = 'telegram_chat_id';

  if token is null or token like '%SHU_YERGA%' or chats is null or chats like '%SHU_YERGA%' then
    raise exception 'Telegram bot token yoki chat ID sozlanmagan (003_telegram_cron.sql ni to''ldirib Run qiling).';
  end if;

  txt := public.daily_report_text(d);

  foreach chat in array string_to_array(replace(chats, ' ', ''), ',') loop
    if chat <> '' then
      select net.http_post(
        url     := 'https://api.telegram.org/bot' || token || '/sendMessage',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body    := jsonb_build_object(
                     'chat_id', chat,
                     'text', txt,
                     'parse_mode', 'HTML',
                     'disable_web_page_preview', true),
        timeout_milliseconds := 15000
      ) into rid;
      ids := ids || rid;
    end if;
  end loop;

  return jsonb_build_object('date', d, 'request_ids', to_jsonb(ids));
end $$;

-- Yuborish natijasini tekshirish (ilovadagi tugma uchun)
create or replace function public.telegram_status(p_ids bigint[])
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'status_code', status_code,
           'error', error_msg, 'content', left(content, 300))), '[]'::jsonb)
  from net._http_response
  where id = any(p_ids);
$$;

revoke all on function public.send_daily_report(date)  from public;
revoke all on function public.telegram_status(bigint[]) from public;
grant execute on function public.send_daily_report(date)   to anon, authenticated;
grant execute on function public.telegram_status(bigint[]) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Avtomatik yuborish. pg_cron UTC bilan ishlaydi: Toshkent 21:00 = 16:00 UTC.
-- ---------------------------------------------------------------------
do $$
begin
  perform cron.unschedule('shlakablok-daily-report');
exception when others then
  null;
end $$;

select cron.schedule(
  'shlakablok-daily-report',
  '0 16 * * *',
  $job$ select public.send_daily_report(); $job$
);

-- Tekshirish:
--   select * from cron.job;                                           -- jadval bormi
--   select * from cron.job_run_details order by start_time desc limit 5;  -- ishlaganmi
--   select public.send_daily_report();                                -- hozir sinab ko'rish
--   select id, status_code, content from net._http_response order by created desc limit 5;
