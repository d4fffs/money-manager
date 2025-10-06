# Money Manager (Next.js + Supabase)
Dark-mode money manager app (period 25→24), weekly limit + notification.

## Quick start
1. Copy `.env.local.example` → `.env.local` and fill your Supabase URL & ANON KEY.
2. Install:
   ```bash
   npm install
   ```
3. Run dev:
   ```bash
   npm run dev
   ```
4. Create DB tables: run the SQL in `supabase/init.sql` using Supabase SQL editor.

## Features
- Weekly limit and notification when exceeded
- Add expenses and view history per period

## Notes
- This is a minimal starter. You can improve validations, auth, and UI.
