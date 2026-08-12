# Issue 01 — Scaffold + Auth shell

## What to build

Stand up the TabBack application foundation: a Next.js (App Router, TypeScript) project wired to Supabase (Postgres, Auth, RLS), deployed-ready for Vercel. Users can sign up / sign in with email/password or Google, and their session persists across visits. All app routes are behind an auth guard; unauthenticated visitors see only the auth pages. The protected layout renders the mobile-first shell: bottom tab bar with a center "+ Add Expense" action and a desktop sidebar variant, with empty-state placeholder routes for Dashboard, Expenses, Analytics, People, Money Owed, Budgets, Settings.

All user-scoped tables get Row-Level Security scoped to `auth.uid()` as they are created. Environment configuration (Supabase URL, anon key, redirect URLs) is documented in the repo.

## Acceptance criteria

- [ ] A new user can sign up with email/password; the session persists after page reload
- [ ] A user can sign in with Google OAuth and land on the protected app shell
- [ ] Unauthenticated visits to any app route redirect to the auth page; authenticated visits to the auth page redirect to the dashboard
- [ ] The shell renders: bottom tab bar + FAB on mobile, sidebar on desktop, with placeholder screens for each nav destination
- [ ] RLS policy example exists on one seeded demo table and is verified in tests (authenticated sees own rows, nothing else)
- [ ] README documents setup (Supabase project, env vars, migration command)
- [ ] Shell verified responsive here, not deferred: renders without horizontal overflow at 360px, 768px, and 1440px; nav targets ≥ 40px on touch

## Blocked by

None — can start immediately

## Status

Pending