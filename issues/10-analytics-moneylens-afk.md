# Issue 10 — Analytics (MoneyLens)

## What to build

The analytics experience for month / quarter / year granularity. Server-side aggregation only: SQL RPCs (RLS-scoped, receiving a client-computed local-timezone interval) power the MoneyLens tab:

- **Month**: total spend, category breakdown, daily/weekly trend, average daily spend, highest expense, comparison vs previous month.
- **Quarter**: same analyses clammered to the quarter's three months.
- **Year**: total yearly spend, monthly spending chart, average monthly spend, highest month, category trends, comparison vs previous year.

Charts should be simple to read (style per design tokens); months grouped by the device-local calendar; granularity switching is one control. RPC outputs are rounded to 2 decimals. Chart library default: Recharts (subject to change on review).

## Acceptance criteria

- [ ] All three granularities render the listed metrics correctly for seeded data
- [ ] Series bucket with the client-computed start/end boundary in the user's timezone (edge check: expense on the 1st at 00:xx local belongs to the local month, not UTC-shifted)
- [ ] Category breakdown per selected granularity matches dashboard totals for the same window
- [ ] Comparison numbers correct when prior period data exists; honest "no prior data" state otherwise
- [ ] Charts legible on a small phone screen; money formatted ₹/2 dp; no jargon labels
- [ ] Polish per slice: chart cards reflow without clipping at 360px (legend/wrapping handled, no horizontal scroll); granularity switcher thumb-friendly; no horizontal overflow

## Blocked by

- 04-expenses-crud-history-afk.md
- 09-dashboard-afk.md

## Status

Pending