# Issue 05 — People CRUD

## What to build

The People domain: the `people` table with RLS, and the People page in the shell where a user manages the list of people they split money with. Fields: name (required), phone and email (optional). The page shows each person with their contact details and edit/delete actions. This slice does NOT yet show balances — later slices (settlements, IOUs) attach balance and history to the same page. A naive quick-add twice never creates duplicates of the same numeric phone/name pair.

The apex governing rule: the People page and any future UI uses the person ID as identity; nothing name-like is ever recreated on the fly for existing persons.

## Acceptance criteria

- [ ] Create, edit (rename / phone / email), and delete a person
- [ ] Deleting a person who has no debts/settlements succeeds without residue; deleting a person referenced by any debt is refused with a deterministic rule and clear error
- [ ] People page lists all with search, sorts by name
- [ ] Person CRUD is RLS-scoped to the owner
- [ ] Polish per slice: People list rows and edit sheet follow design tokens; no horizontal overflow 360px–1440px; rows tappable with ≥ 40px hit area

## Blocked by

- 01-scaffold-auth-shell-afk.md

## Status

Pending