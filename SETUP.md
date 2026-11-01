# O'rnatish (Supabase + Telegram hisobot)

Hammasi Supabase **SQL Editor** orqali. CLI, deploy yoki login kerak emas.

## 1. `.env`
Loyiha ildizidagi `.env` da `VITE_SUPABASE_URL` va `VITE_SUPABASE_ANON_KEY` bor.

## 2. Baza (tartib bilan Run qiling)
1. `supabase/migrations/001_schema.sql` — jadvallar va hisobot funksiyasi.
2. `supabase/migrations/002_open_access.sql` — login'siz ishlash ruxsati
   (001 ni avval ishga tushirgan bo'lsangiz kerak; ikki marta Run qilsa ham zarar yo'q).

## 3. Telegram bot + har kuni 21:00
1. **@BotFather** → `/newbot` → token oling. Botga kirib **Start** bosing.
2. **@userinfobot** ga yozib chat ID ni oling (guruh bo'lsa botni guruhga qo'shing; ID `-100...`).
3. `supabase/migrations/003_telegram_cron.sql` ni oching, `BOT_TOKEN_SHU_YERGA` va
   `CHAT_ID_SHU_YERGA` ni almashtiring → SQL Editor'da **Run**.
4. Sinash: SQL Editor'da `select public.send_daily_report();` — botga xabar kelishi kerak.
   Yoki ilovada Bosh sahifa → Kunlik hisobot → "Telegramga yuborish".

Rejalashtirish tekshiruvi: `select * from cron.job;` va
`select * from cron.job_run_details order by start_time desc limit 5;`
(Toshkent 21:00 = UTC 16:00, shuning uchun cron `0 16 * * *`.)

## 4. Supabase 24/7 ishlashi (muhim)
Bepul (Free) loyiha **1 hafta hech kim ishlatmasa pauza bo'ladi** va shunda 21:00 hisobot ham ketmaydi.
Ikki yo'l:
- **Ishonchli:** Supabase **Pro** rejasi — loyiha hech qachon pauza bo'lmaydi.
- **Bepul:** `.github/workflows/keep-alive.yml` — har 2 kunda bazaga so'rov yuboradi.
  Kodni GitHub'ga yuklab, Secrets'ga `SUPABASE_URL` va `SUPABASE_ANON_KEY` ni qo'shing.
  Ilovani har kuni ochib ishlatsangiz ham u faol hisoblanadi.

## 5. Eski ma'lumotlarni ko'chirish
Eski ma'lumot bor brauzerda ilovani ochsangiz, tepada sariq xabar chiqadi —
"Supabase'ga ko'chirish" ni bosing.

## Hisobot formulasi (Toshkent vaqti, shu kun uchun)
Sotilgan bloklar = shu kungi sotuvlar; Tushum = sotuvlar summasi; Xarajat = shu kuni kiritilgan
xarajatlar; Sof foyda = Tushum − Xarajat. Formula `001_schema.sql` dagi `daily_report`
funksiyasida, matn `003_telegram_cron.sql` dagi `daily_report_text` da.
