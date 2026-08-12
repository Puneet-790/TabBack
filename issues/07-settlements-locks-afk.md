# Issue 07 — Settlements & expense lock rules

## What to build

The settlement journal and the integrity rules that protect it:

- A settlement **attaches to a specific debt** (split), amount any positive value ≤ remaining (capped; ledger validates). Multiple settlements per debt allowed. Each settlement records: person, debt type, debt id, amount, direction, payment method (Cash / Bank transfer / UPI / Other), date, note.
- **Split status is derived** from the journal (remaining = 0 → paid); nothing stored to drift.
- **The original expense row is never mutated by settlements** — journal is append-only for money movement.
- **Undo**: deleting a settlement (explicit two-step confirmation) removes it from history and re-derives balances.
- **Lock rules**: once any settlement exists on a split of an expense — amount, payment method, and split rows become read-only with an inline reason; description/date/notes/category stay editable. Delete of the expense is blocked while its settlements exist (user deletes settlements first, then the expense).
- Settlement history surfaces per person (amount, date, method, note) in the People page.

## Acceptance criteria

- [ ] Mark as Paid flow: settle a split partially (₹600 of ₹1,000) and fully; remaining re-derives; status flips exactly at remaining = 0
- [ ] Oversettling rejected at UI and by the ledger; direction recorded correctly
- [ ] Expense with any settlement: money fields locked with inline reason; meta fields still editable; delete blocked with clear first-step instruction
- [ ] Deleting settlements (2-step) restores exact pre-settlement numbers
- [ ] Person page shows settlement history (method, date, note) for the debt viewed
- [ ] Journal rows are append-only via API: no update path exists for money fields once written (delete is the only reversal)
- [ ] Polish per slice: lock notices read as explanatory, not hostile, on mobile (inline reason visible without scrolling); settle/undo actions keep ≥ 40px targets; no horizontal overflow

## Blocked by

- 06-splitting-hitl.md

## Status

Pending