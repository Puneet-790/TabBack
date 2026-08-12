# Issue 08 — Money Owed lists & reminders

## What to build

The IOU home: the Money Owed page with two lists — **Money to receive** and **Money to pay**, and the reminder flow on debts.

- **Manual IOUs**: create a debt not tied to an expense (person, amount, direction: they-owe-me / I-owe-them, optional note, date). Settleable exactly like splits (reuses Issue 07's Mark-as-Paid), which is the only way the "you owe Rahul ₹500" state can exist (splits alone never produce user-owes).
- Books from both lists: person, amount, related expense description (for splits) / note (for IOUs), date, **days pending** (anchored to due date when set, else expense date), status.
- **Reminders**: on any outstanding debt — drafts a friendly, non-aggressive message ("Hi {name}! Just a gentle nudge on ₹{amount} from {expense} — let me know when it's on its way 🙂"), **copies the text to clipboard**, and if the person's phone is stored, opens a `wa.me` deep link prefilled with the draft. Delivery is manual — no scheduled/auto sends. Each reminder is recorded (person, debt, time) and shown in the People page history area.

## Acceptance criteria

- [ ] Manual IOU created in either direction shows in the correct list with remaining/days pending
- [ ] A manual IOU settles via the same Mark-as-Paid action as splits (paid status reaches the lists, remaining accounted)
- [ ] Settling an IOU cancels none of the underlying debts incorrectly; both directions live simultaneously for the same person
- [ ] Remind: correct draft with formatted ₹; clipboard works; phone stored → wa.me link with encoded text; no phone → clipboard-only path clear to the user
- [ ] Reminder log visible per person; message tone approved (no aggressive words)
- [ ] Lists show accurate "days pending" using the anchor rule
- [ ] Polish per slice: prose wrapped/truncated gracefully at 360px (copy-to-clipboard affordance always reachable); lists and actions styled per tokens; no horizontal overflow

## Blocked by

- 07-settlements-locks-afk.md

## Status

Pending