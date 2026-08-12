# Issue 04 — Expenses CRUD, history, search & receipts

## What to build

The first full expense path end-to-end: schema (expenses, categories, RLS), UI to add/edit/delete, and the history screen with search and filters, plus receipt attachments.

Create an expense with amount, description, date (calendar day, default today), payment method (enum: Cash / Bank transfer / UPI / Other), category, notes. Twelve seeded default categories; users can create, edit, rename, and delete their own categories. History screen lists expenses (newest first, paginated) with search (description, category, person) and all filters: date range, category, amount, payment method, person, split/non-split, paid/pending. The split/paid/pending filters are effective once later slices add splits — until then, a stable filter is rendered and all rows satisfy it. Receipts: upload an image/PDF (≤ 5 MB) to the private storage bucket scoped to the owner; the file is downloadable from the expense detail view. Money fields round via the ledger module.

Target: a normal expense creation flow under 10 seconds (one screen, minimal taps).

## Acceptance criteria

- [ ] Create expense persists with all fields; display shows ₹ with 2 decimals and correct currency symbol
- [ ] Edit (all fields editable, since no settlements can exist yet) and delete mirror the record
- [ ] 12 seeded categories visible from create/edit; custom category CRUD works; deleting a custom category leaves its expenses intact (fallback to "Other" or unassigned handling is documented)
- [ ] History list renders with search + all six filters acting as declared; pagination works
- [ ] Receipt upload validates size/type, uploads to a private bucket, and only the owner can open/ view it
- [ ] All money writes go through the ledger module functions
- [ ] Polish in this slice: form/history follow design tokens; no horizontal overflow at 360px–1440px; touch targets ≥ 40px on mobile; date picker and amount input usable one-handed

## Blocked by

- 01-scaffold-auth-shell-afk.md
- 03-ledger-module-afk.md

## Status

Pending