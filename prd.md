# Product Requirements Document — TabBack

**Product:** TabBack ("Track your spending. Split the bill. Get paid back.")
**Status:** MVP PRD
**Source:** specs.txt (PRD-ready spec) + design review decisions

---

## Problem Statement

People overspend and under-collect. Daily spend happens across cash, UPI, and cards, yet most users have no quick way to answer "how much did I spend this month, and where did it go?" Worse, shared bills — dinner with friends, cab fares, group trips — produce a web of unrecorded IOUs. No one wants to do the awkward math of "who owes what," and debts quietly expire because collecting money feels confrontational. The user is left guessing at three things at once: their spending numbers no goal, their category trends go, and how much money friends owe them.

## Solution

A single mobile-first web app where a user:

- Records any expense in under 10 seconds (amount, category, date, method; splits optional).
- Sees monthly/yearly totals, category breakdowns, trends, and budget progress at a glance.
- Splits bills with friends like GPay — equal or custom shares auto-distributed; their own share is auto-derived as the remainder.
- Gets a running ledger of who owes what to whom, without any manual math: debts from splits AND manual IOUs (both directions).
- Settlements from the ledger in seconds — partial payments, per had days, clean Append-only trail; the original expense is never mutated.
- Sends friendly WhatsApp one-tap reminders to facade outstanding debts, logs them, and marks debts paid.

The differentiator: shared-expense tracking that makes sure users **collect money they are owed** — small enough for everyday use, no financial jargon, no account-bank integration required.

---

## User Stories

1. As a user, I want to sign in with email/password or Google, so that my data is private and synced across devices.
2. As a user, I want my session to persist, so that I don't enter my password every visit.
3. As a user, I want to be signed out of protected pages when that session expires, so that my data stays private.
4. As a user, I want a dashboard showing this month's and this year's total spending, so that I instantly know my burn rate.
5. As a user, I want the dashboard to show this month's spend vs last month (and % change), so that I can spot trend changes.
6. As a user, I want a category breakdown on the dashboard, so that I know where my money goes.
7. As a user, I want recent expenses listed on the dashboard, so that I can verify entries without navigation.
8. As a user, I want the dashboard to show the total money others owe me and the total I owe others (gross numbers), so that I never forget an IOU.
9. As a user, I want the dashboard to show budget status with progress bars, so that I can see exposure at a glance.
10. As a user, I want pending split payments listed on the dashboard with quick actions (Remind / Mark as Paid), so that I can act without navigation.
11. As a user, I want a prominent "+ Add Expense" action always reachable, so that entry is fast.
12. As a user, I want to add an expense with amount, description, date, category, payment method, and optional notes, so that I record it accurately.
13. As a user, I want an accessible single expense form (mobile bottom nav / panel) that takes under 10 seconds, so that I'm not blocked by friction.
14. As a user, I want the expense date to default to today and be freely editable, so that I can backdate entries honestly.
15. As a user, I want to optionally attach a receipt (image/PDF, ≤5 MB) to an expense, so that documents stay attached.
16. As a user, I want the 12 default categories (Food, Groceries, Transport, Travel, Bills, Rent, Shopping, Entertainment, Health, Education, Work, Other), so that entry is fast.
17. As a user, I want to create, edit, and delete my own categories, so that the taxonomy matches my life.
18. As a user, I want expenses filterable/searchable in history (description, category, person), so that I can find past entries.
19. As a user, I want history filters for date range, category, amount, payment method, person, split/non-split, paid/pending, so that I can analyze precisely.
20. As a user, I want to instantiate an expense with equal shares for chosen friends, so that a lunch tab splits in one tap.
21. As a user, I want to split an expense with custom shares, auto-distributed like GPay as people are added, so that uneven bills are still quick.
22. As a user, I want my own share in any split to be auto-derived as the remainder and to be able to be ₹0, so that "I'm paying the whole round" is supported for them.
23. As a user, I want the system to reject splits where the sum of shares exceeds the expense total, so that balances never overshoot.
24. As a user, I want to quick-add a person by name (and optional phone) inside the split form, so that entry has no friction.
25. As a user, I want a People page listing each person's outstanding balances, net balance, expense history, and settlement history, so that I can see the full picture per friend.
26. As a user, I want a per-person net number (owe-style (− payable, single number), so that I know exactly where I stand.
27. As a user, I want to log a manual IOU in either direction (they owe me / I owe them), so that debts not tied to an expense are tracked.
28. As a user, I want a Money Owed page with two lists — Money to receive and Money to pay — showing person, amount, related expense, date, days pending, so that I know exactly what's pending.
29. As a user, I want a "Mark as Paid" action on any outstanding debt (full or partial), so that settlement takes seconds.
30. As a user, I want to record less than the full share as settled (₹600 of ₹1,000), so that partial reality is honored.
31. As a user, I want settlement history stored per person (amount, date, method, note) and never tied to the expense itself, so that the trail stays clean.
32. As a user, I want to undo a mistaken settlement (delete it), so that balances re-derive correctly.
33. As a user, I want an optional due date on split shares, so that "pending for X days" anchors to the due date when set (else the expense date).
34. As a user, I want a "Remind" action that drafts a friendly message and opens a WhatsApp conversation when the person's phone is saved, so that I can politely chase money without awkward math.
35. As a user, I want the reminder to also support copy-to-clipboard when no phone contact exists, and to be recorded in history, so that nothing is lost.
36. As a user, I want monthly analytics (total, category split, daily & weekly trends, average, highest expense, comparison vs last month), so that I can review a month.
37. As a user, I want quarterly analytics delivered the way the monthly view is fault, so that I can zoom out.
38. As a user, I want yearly analytics (total, monthly chart, average monthly, highest month, category trends, comparison vs last year), so that I can review a year.
39. As a user, I want to toggle month / quarter / year views, so that I control granularity.
40. As a user, I want a monthly budget (overall limit and optional per-category limits) with spent / remaining / % used and a progress bar, so that I can stay on track.
41. As a user, I want in-app warnings at 75%, 90%, and 100% budget usage, so that I am nudged before overspending.
42. As a user, I want a mobile-first layout: bottom tab bar, center add button, large touch targets, so that the app feels native on a phone.
43. As a user, I want a responsive desktop view with a sidebar, so that I can work on a laptop.
44. As a user, I want every money figure to display in ₹ with exactly 2 decimals — no floating-point artifacts — so that I can trust the numbers.
45. As a user, I want all my data (including uploaded receipts) readable only by me, so that privacy is assumed.

---

## Implementation Decisions

### Stack & project setup

- Next.js (App Router, TypeScript) single app; Supabase for Postgres, Auth, Storage, and Serverless-SQL RPCs; hosted on Vercel.
- Auth: Supabase Auth, email/password + Google OAuth; RLS on every user-scoped table (`auth.uid()`).
- Single currency (₹); no multi-currency plumbing in MVP.
- Money: Postgres `numeric(12,2)`; JS represents money as numbers rounded to 2 decimals at every boundary (a `round2` helper used at save, sum, and display — no exceptions).

### Deep modules (built independently, testable in isolation)

1. **Ledger module (deep, pure)** — all balance/money math, no I/O:
   - `remaining(debt)` = debt.amount − Σ(settlements on it), clamped ≥ 0.
   - `status(debt)` = derived: pending iff remaining > 0 else paid (never stored).
   - `net(person)` = receivable − payable per person; `gross` = sum of outstanding both directions for dashboard.
   - `validateSettlement`, `validateSplitDistribution` (Σ shares ≤ expense total), `roundMoney`.
   - `overdueDays(debt)` — anchored to dueDate when set, else expense date.
2. **SQL analytics RPC layer** — server-side functions backing every dashboard card and chart: monthTotals, categoryBreakdown, trend, comparison, budgetStatus, outstandingSummary. Each takes month/quarter/year interval computed client-side in the browser's local timezone; user-scoped by RLS.
3. **Expense + split feature** — CRUD with the agree lock rules (money-bearing fields & splits read-only once any settlement exists; meta fields remain editable; delete blocked while settlements exist — user deletes settlements first, explicit two-step undo); GPay split-form logic (see below); categories CRUD; quick-add person.
4. **People + IOU module** — people CRUD, manual IOUs (both directions), Money Owed views (toReceive/toPay), settlement actions, settlement history per person.
5. **Reminders module** — friendly message template (drafted, not stored), wa.me deep-link builder (only when phone exists), clipboard fallback, reminder records (person, debt, time).
6. **Budgets module** — pure warning thresholds (75/90/100%) + progress wiring against the same analytics RPCs.
7. **App shell** — layout, auth guard, bottom tab bar + FAB, desktop sidebar, receipt storage (private Supabase bucket, ≤5 MB, images/PDF).

### Domain model (schema, summarized)

- **expenses**: id, user_id, amount::numeric(12,2), category_id, date (calendar day), payment_method (Cash | Bank transfer | UPI | Other), notes, receipt_path, timestamps. **Expense row is never mutated by settlement activity.**
- **categories**: seeded set (12) with user_id NULL; custom rows with user_id set.
- **people**: id, user_id, name, phone (optional), email (optional).
- **splits** (debt from an expense): id, expense_id, person_id, amount::numeric(12,2), due_date (optional). Status derived from settlements — no stored status column.
- **ious** (debt not from money-sourced expense): id, person_id, amount, direction (to_receive | to_pay), date, notes. Which satisfies the "you owe Rahul ₹500" flows that splits can never produce.
- **settlements** (append-only journal): id, user_id, person_id, debt_type (split|iou), debt_id, amount, direction, payment_method (Cash/Bank transfer/UPI/Other), date, notes, created_at. Deleting a settlement = explicit undo, balances re-derive.
- **reminders**: id, person_id, debt_type, debt_id, sent_at.
- **budgets**: id, month (YYYY-MM), overall_limit, per-category limits.
- **receipts**: object in private storage; URL only surfaced on expense detail.

### Splitting semantics (GPay-style, captures the decision)

- Participants added to a split one by one; the form auto-distributes the total equally across selected participants, each row editable.
- The user's own share is never a split row: it's derived as `expense.amount − Σ(participant shares)`, shown live, allowed to be ₹0, must never be negative (validation at UI and RPC).
- Complaint scenarios "split the bill 3 ways around me" and "I paid the whole round" both fall out of the model — model change is not needed.

### Lock & undo rules (data integrity)

- Money-affecting edits (amount, payment method, splits) are disabled once a settlement exists; the UI shows an inline reason; metadata edits always allowed.
- Delete of the expense requires prior deletion of all its settlements (two explicit steps; every step visible to the user).
- Everything re-derives from the journal; verified/supported abstractions never fight.

### Analytics & environment

- All aggregation on the server via SQL RPCs; the browser sends a pre-computed local-tz interval (month/quarter/year) and receives ready-to-render totals/series/percentDrivers.
- Expense date is a user-chosen calendar date (not a timestamp), so month bucketing is unambiguous.

---

## Testing Decisions

What makes a good test here: **tests exercise external behavior, not implementation details** — feed money amounts and settle events, assert the resulting debts, nets, and statuses; never mock internals. Pure modules are tested without Supabase I/O; RPC behavior is tested with bounded seed fixtures.

Modules with unit test coverage (agreed with the user):

- **Ledger module** — remaining math, status derivation, net/gross, partial settlements with rounding correctness, validation caps, due-day anchoring.
- **Split distribution** — equal auto-distribute with an arbitrary person count, custom override, remainder (0 or positive) math, sum ≤ total enforcement, rounding artifacts over ₹.
- **Budgets** — warning thresholds at 75/90/100% across boundary conditions.
- **Reminders** — template rendering (person name, amount formatted ₹/2 dp, message copy correctness).

RPC-contract tests: seeded fixture DB, asserting returned values are rounded and month-interval-bucketed per contract.

E2E/browser rendering: deferred until after MVP — manual QA during development; screens kept simple specifically so this gap never becomes camouflaged.

---

## Out of Scope

Receipt OCR, bank integrations, automatic transaction imports, UPI push services, WhatsApp Business/email/push integrations, a notification center, recurring expenses, advanced budgets beyond 75/90/100, multiple currencies, group/trip management, tags, AI insights, multi-user/shared personal accounts, analytics exports (CSV/PDF).

## Further Notes

- The Analytics tab is internally labeled "MoneyLens".
- Budgets reuse the analytics RPC aggregation — built once, consumed twice.
- Reminder tone is a product feature: messages must be friendly and non-aggressive; template copy is part of the deliverable (preserve the tone quirk in review).
- Adding an expense in a normal case must stay ≤ 10 seconds — this figure is a product-boundary, track it across form iterations.
- Watch out for the known UX traps: the 2-step delete/undo flow needs a clear cancellation path; the split form's auto-distribute must surface "your share is ₹0" visibly so users don't wonder who pays.