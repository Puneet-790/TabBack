# Issue 11 — Budgets & warnings

## What to build

Monthly budgets with progress and in-app warnings. User sets, per month, an overall limit and optional per-category limits. Spent amounts come from the same RPC aggregation layer that powers analytics — build once, consume twice. Budget card on the dashboard shows spent / remaining / % used with a progress bar; the Budgets screen manages limits and shows per-category progress.

Warning thresholds — pure function — fire at **75%, 90%, 100%** of usage (in-app only; dashboard card + budget row visually states the band). Threshold evaluation is a pure ledger-style function with unit tests; every assessment benefits a fresh month retroactively (budgets set mid-month count spend from the 1st).

## Acceptance criteria

- [ ] Budgets page: create/edit/delete overall + per-category monthly limits; undefined limits behave as no-budget
- [ ] Dashboard card + Budgets page show correct spent, remaining, % used vs the RPC-computed spend for the active local month
- [ ] Warning renders exactly at the 75% / 90% / 100% crossing, updates mid-month (a single expense crossing a band is visible in that month)
- [ ] Retroactive assessment: budget created on the 15th counts spend from the 1st
- [ ] Zero-spend state shows 0% with no bars/warnings, no division errors at any limit value (incl. 0 / unset)
- [ ] All computed off RPC + pure thresholds — no client-side total recomputation
- [ ] Polish per slice: budget rows and progress bars scaled correctly at 360px (progress bar with label never overflows); warning states visibly distinct but calm; no horizontal overflow

## Blocked by

- 04-expenses-crud-history-afk.md
- 09-dashboard-afk.md
- 10-analytics-moneylens-afk.md

## Status

Pending