# Issue 09 — Dashboard

## What to build

The dashboard assembles the app into a single glance: this month's total, this year's total, month-over-month comparison with % change; spending by category; recent expenses; and the IOU snapshot — gross "money to receive" and gross "money to pay" totals (separate numbers, never net), pending payments list with quick actions (Remind / Mark as Paid) that reuse the Issue 07/08 flows.

Cards are served by the SQL RPC layer (server-side aggregation, user-scoped via RLS): month totals, category breakdown, recent items, outstanding summary. The dashboard renders an empty state with a fast path to the first expense when no data exists yet. Budget cards and charts that arrive in later slices (11, 12) are NOT part of this slice — this is the dashboard's first demoable version.

## Acceptance criteria

- [ ] Month/year totals render the RPC-computed sums (₹/2 dp); MoM % shown only when previous month's data exists
- [ ] Category breakdown chart via RPC totals
- [ ] Gross to-receive / to-pay figures appear as separate cards matching ledger `personaTotals`
- [ ] Pending payments list up to date, with Remind & Mark as Paid actions that land in the corresponding flows
- [ ] Empty state with a one-tap "add first expense" path
- [ ] All values user-scoped (RLS); month boundary follows the device-local timezone rule
- [ ] Polish per slice: card grid reflows cleanly 360px–1440px (1-col → multi-col), no horizontal overflow, quick-action row stays tappable; dashboard feels complete, not assembled

## Blocked by

- 04-expenses-crud-history-afk.md
- 08-money-owed-reminders-afk.md

## Status

Pending