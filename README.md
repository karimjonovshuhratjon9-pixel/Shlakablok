# Shlakablok — boshqaruv paneli

Ishlab chiqarish, xarajat va savdo hisobi (React + Vite + Tailwind + **Supabase**).

- Ma'lumotlar Supabase (PostgreSQL) bazasida saqlanadi.
- **Kunlik hisobot**: ilovada (Bosh sahifa va Hisobotlar) ko'rinadi va har kuni
  **21:00 (Toshkent)** da Telegram botga avtomatik yuboriladi (Supabase pg_cron).

To'liq o'rnatish yo'riqnomasi: **[SETUP.md](./SETUP.md)**

## Ishga tushirish

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build (tsc + vite)
```
