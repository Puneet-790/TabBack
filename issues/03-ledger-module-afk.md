# Issue 03 — Ledger module (pure)

## What to build

The pure, I/O-free money and balance engine that every other slice depends on. Encapsulated in a `ledger` module with a small, stable interface, fully unit-tested without any database or network:

- `roundMoney(amount)` — 2-decimal rounding applied at every money boundary (save, sum, display).
- `remaining(debt, settlements)` = debt.amount − Σ(settlement amounts on that debt), clamped at 0.
- `status(debt, settlements)` — derived: `pending` iff remaining > 0, else `paid`. Never stored.
- `validateSettlement(amount, remaining)` — amount must be > 0 and ≤ remaining (capped per debt).
- `net(personDebts)` — per-person net = receivable − payable across splits and IOUs.
- `grossTotals(debts)` — total receivable and total payable as separate numbers (dashboard semantics: gross, never net).
- `validateSplitDistribution(expenseAmount, shares)` — Σ participant shares ≤ expense amount.
- `overdueDays(debt, today)` — anchored to `dueDate` when set, else the expense date.

The module surface is the single source of truth for ledger math; feature slices import it rather than reimplementing arithmetic.

## Acceptance criteria

- [ ] All functions above exist with the exact stated semantics (clamping, capping, derivation)
- [ ] Rounding contract holds: a mixture of third-party and paise values never produces artifacts (e.g. 0.1 + 0.2 → 0.3 display; 1/3 splits leave consistent sums)
- [ ] Partial settlement flows: remaining decreases, status flips to paid exactly when remaining reaches 0
- [ ] Validation rejects oversettling and over-distributed splits
- [ ] Unit coverage ≥ 90% of module; tests exercise only external behavior (feed debts/settlements, assert balances) — no mocking of internals

## Blocked by

None — can start immediately (parallel with issue 01)

## Status

Pending