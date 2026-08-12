# Issue 06 — GPay-style splitting

## Type

HITL (lightweight design checkpoint)

## What to build

The split form inside the expense flow, modeled on the GPay bill-split interaction. Behavioral contract, from the PRD:

- Participants added one by one (from existing people or quick-add inline: name + optional phone → borrowed from Issue 05 flows).
- As participants are added, the remaining total is auto-distributed equally across the current set; each participant row is independently editable.
- The user's own share is **derived** as `expense.amount − Σ(participant shares)`, displayed live, and allowed to be ₹0 ("I paid the whole round"). It must never go negative — validation at UI and writes (ledger.validateSplitDistribution).
- Only other people become split rows (never the user).
- A split can be set to any coin at signing: adjust per-person amounts freely, optional per-split due date.

The split form is embedded in the expense creation/edit flow; creating a split creates `splits` rows (expense_id, person_id, amount, due_date) with RLS. The expense amount itself is never changed by split entries. This is a lightweight HITL checkpoint: the interaction must be reviewed for the 10-second entry target and the auto-distribute behavior before it ships.

## Acceptance criteria

- [ ] Adding persons auto-distributes equally; editing one row does not clobber others; removing empties correctly
- [ ] Derived user share shown live, update on every change, never negative; blocked input at 0
- [ ] Split sum validation: Σ shares > expense total is rejected with a clear error
- [ ] Cross-check: 3-way ₹3,000 dinner → each ₹1,000, user share ₹0 optional; custom ₹1,500/₹500/₹1,000 works
- [ ] Split rows persist and are listed on the expense detail (person, share, due date, status pending)
- [ ] Human design review of the form's interplay passes (speed) and auto-distribution clarity
- [ ] Polish per slice: split rows show shares and derived remainder at 360px legibly (amounts aligned, no truncation); keyboard/mobile worth flow verified on a phone-width viewport

## Blocked by

- 04-expenses-crud-history-afk.md
- 05-people-crud-afk.md

## Status

Pending