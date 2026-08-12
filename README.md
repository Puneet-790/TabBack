# TabBack

Track your spending. Split the bill. Get paid back.

A mobile-first expense tracker with split billing, IOUs, settlements and reminders. Next.js (App Router) + TypeScript + Tailwind CSS on the frontend; Supabase (Postgres, Auth, Storage) with Row-Level Security on every user-scoped table.

## Stack

- **Framework:** Next.js 15 (App Router, TypeScript, Tailwind CSS v4)
- **Auth & data:** Supabase (email/password + Google OAuth, cookie sessions via `@supabase/ssr`)
- **Database:** Postgres with RLS `auth.uid()` policies; migrations in `supabase/migrations/`
- **Tests:** Vitest
- **Deploy:** Vercel

## Quickstart

1. **Create a Supabase project** at [supabase.com](https://supabase.com). In Authentication → Providers, enable **Email** and **Google**, and add `http://localhost:3000/auth/callback` to the allowed redirect URLs (Google OAuth needs its own client credentials from Google Cloud Console).
2. **Copy env vars:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API). The app still builds and runs without them — auth pages show a "Supabase not configured" notice and app routes redirect to `/signin`.
3. **Run the schema migration.** Open the Supabase SQL editor and paste the contents of `supabase/migrations/0001_init.sql`, or run `psql -f supabase/migrations/0001_init.sql` against your project.
4. **Run the app:**
   ```bash
   npm install
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000). Sign up or sign in, then land on `/dashboard`.

## Scripts

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `npm run dev`      | Start the dev server                  |
| `npm run build`    | Production build                      |
| `npm start`        | Serve the production build            |
| `npm run lint`     | ESLint                                |
| `npm test`         | Run tests (Vitest, once)              |
| `npm run test:watch` | Run tests in watch mode             |

## Environment variables

| Variable                       | Description                                   |
| ------------------------------ | --------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`    | Supabase project URL (can ship in the client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (can ship in the client)    |

## Auth & guarding

- `src/middleware.ts` redirects unauthenticated visits to app routes to `/signin`, and authenticated visits to `/signin` / `/signup` to `/dashboard`. Session is cookie-based and survives reloads.
- The `(app)` route group (sidebar/bottom-nav shell) also verifies the session server-side with `supabase.auth.getUser()`.
- RLS is verified by contract tests in `tests/` that assert against `supabase/migrations/0001_init.sql` — no live database needed.

## Project layout

```
src/
  middleware.ts            # auth guard
  lib/env.ts              # env helpers (graceful no-config)
  lib/supabase/           # server + browser Supabase clients
  lib/nav.ts              # shared nav config
  components/             # shell, auth forms, icons
  app/(app)/              # protected shell: dashboard, expenses, expenses/new, analytics,
                          # people, money-owed, budgets, settings (placeholders)
  app/(auth)/             # /signin, /signup
  app/auth/callback/      # OAuth + email-confirm code exchange
supabase/migrations/      # SQL migrations (0001_init.sql)
tests/                    # vitest unit tests
```