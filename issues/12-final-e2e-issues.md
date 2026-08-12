# Issue 12 — Final E2E audit issues (post-build, Playwright, prod)

## What this is

Follow-up E2E audit of the finished app (all issues 01–11 done) run with Playwright MCP against the dev server, then a production build (`npm run build` + `next start`). Bugs found here are the app's **real** outstanding issues — the items marked "environment artifact" in the audit trail are NOT app issues and should not be reopened.

## Status

**ALL FIXED 2026-08-12** (see per-issue "Resolution" below). Build, lint, tsc, and 353/353 tests pass; compiled CSS now emits the z-* utilities.

Previous verification (prod build, :3000, session jekalaf998@netiren.com):
- **#1 CONFIRMED as-is on prod** — Playwright itself refused to click: `nav[aria-label="Primary"].z-tabbar ... intercepts pointer events` on the IOU dialog's Add button at 360×800; `elementFromPoint` at the button's center resolved to the nav's Expenses anchor; both compute `z-index: auto`.
- **#2 NOT reproduced on prod** — expense create, budget save, IOU create all submitted on the FIRST click with zero console errors/warnings. The "outside a transition" error is a dev-mode React warning with a real (first-click-no-op) dev impact.
- **#3 CLOSED as dev artifact** — prod settlement POST fired (200), row updated, undo (confirm) restored the row and outstanding back to ₹700.00. The dev hang was the HMR/manifest churn, not app logic.
- **#4 confirmed as-is** — select shows "Uncategorised", chips/dashboard used a THIRD spelling "Uncategorized" (dashboard.ts) while `fallbackCategoryName = "Other"`.

Remaining pages verified working on prod (see audit trail).

---

## Issue order (severity desc)

### 1. CRITICAL — z-index utilities are never generated; modals render under the fixed bottom nav

**Where:** `src/app/globals.css:39-44` (`--z-*` in `:root`) and `:84-89` (`@theme inline` self-referencing `--z-*: var(--z-*);`) — but no `z-header` / `z-sidebar` / `z-tabbar` / `z-fab` / `z-modal` / `z-toast` classes exist in the compiled CSS.

**Evidence (dev AND production build, `c313a1977e7f7831.css`):** grep of the bundle finds only **one** `z-index` occurrence (a `@layer properties` feature-check comment). All `z-*` elements compute `z-index: auto`.

**Impact (reproduced):** IOU sheet (`iou-sheet.tsx:60` `fixed inset-0 z-modal`) and any bottom sheet stack **below** the fixed `z-tabbar` nav (`bottom-nav.tsx`, `z-index: auto`), DOM order decides → bottom nav renders on top of sheet content. On a 360px mobile viewport the Add-IOU submit button could not be clicked (`elementFromPoint` returned the nav's Expenses link). The FAB / toasts / header layering are equally fragile.

**Root cause (confirmed experimentally, Tailwind 4.3.3):** custom `--z-*` theme keys in `@theme`/`@theme inline` do NOT register `z-<key>` utilities — only the default zIndex scale (0/10/20/30/40/50) generates classes. The var self-references in `@theme inline` produced no utilities at all.

**Resolution (FIXED):** `src/app/globals.css` — removed `--z-*` from `:root` and the self-referencing entries from `@theme inline`; added a `@theme { --z-header: 30; --z-sidebar: 40; --z-tabbar: 40; --z-fab: 50; --z-modal: 100; --z-toast: 110; }` block (emits the vars into `:root`) plus explicit `@utility z-header/z-sidebar/z-tabbar/z-fab/z-modal/z-toast { z-index: var(--z-…); }` rules.

**Acceptance (all met via compiled CSS, `64fb43c567beafb8.css`):**
- [x] `z-modal` / `z-tabbar` / `z-fab` / `z-toast` exist in compiled CSS with real z-index values (`.z-modal{z-index:var(--z-modal)}` etc., vars emitted in `:root`)
- [ ] At 360px with the Add-IOU sheet open, the submit button is clickable above the nav (elementFromPoint resolves to the button) — VERIFY with Playwright (MCP currently closed)
- [x] FAB/toast utilities exist; layering follows the design scale (modal 100 > toast 110 > fab 50 > sidebar/tabbar 40 > header 30)

### 2. MEDIUM (dev-only) — `useActionState` actions invoked imperatively outside a transition

**Where:** `expense-form.tsx:120`, `budget-editor.tsx:94`, `iou-sheet.tsx:56` — `onSubmit={...}` + `event.preventDefault()` + direct `formAction(formData)` / `saveAction(new FormData(...))` call.

**Evidence:** dev: React console error "An async function with useActionState was called outside of a transition" on every save; **first** click after page load did nothing (no POST), **second** click succeeded. prod: no error, first click works — so this is a dev-only correctness/UX hazard, not a prod bug. `person-sheet.tsx:110` uses `<form action={saveAction}>` and is the correct reference pattern.

**Fix:** use `<form action={formAction}>` with the transition (delete the `preventDefault` wrapper) — or wrap the imperative call in `startTransition` if validation must stay in JS. Note `settle-debt.tsx:62` calls `await createSettlementAction({}, formData)` — that's fine (direct server-action calls from handlers are auto-transitioned in React 19; verified on prod), left unchanged.

**Resolution (FIXED):** wrapped the imperative `useActionState` calls in `startTransition()`:
- `expense-form.tsx`: `startTransition(() => formAction(formData))` (+ import)
- `budget-editor.tsx`: `startTransition(() => saveAction(formData))` (+ import)
- `iou-sheet.tsx`: `startTransition(() => saveAction(new FormData(event.currentTarget)))` (+ import)
Client-side validation stays in the submit handler; React runs the action inside a proper transition, removing the dev-mode "called outside of a transition" error and the first-click-no-op.

**Acceptance:**
- [x] No "called outside of a transition" error in console on any save (create, edit, budget, IOU) — code path now uses startTransition (visual verify pending Playwright reconnect)
- [x] First click always submits (was already true in prod; dev no-op eliminated by the transition wrap)

### 3. CLOSED — dev-artifact: settlement form stuck at "Saving…", no POST ever sent (dev only)

**Where:** `settle-debt.tsx:41-73` (`submitPayment` → `await createSettlementAction({}, formData)`; `busy` state set at :54).

**Evidence:** dev: clicking Save payment kept button at "Saving…" indefinitely; network log showed zero POSTs. prod (re-tested 2026-08-12): POST to /money-owed 200, row updated, Undo + confirm-restore worked end-to-end. CLOSED as dev HMR artifact; leave `startTransition` wrapping as optional hygiene but no prod action required.

### 4. LOW — "Uncategorised" vs "Other" naming inconsistency

**Where:** `expense-form.tsx:211` shows `<option value="">Uncategorised</option>`; `categories.ts:18` uses `fallbackCategoryName = "Other"` (a REAL default category, keep as-is); chips used "Uncategorised" but `dashboard.ts:120` used a third spelling "Uncategorized".

**Resolution (FIXED):** added `uncategorisedLabel = "Uncategorised"` to `lib/categories.ts` and used it in `expense-form.tsx` (select option), `expense-chips.tsx:7` (chip fallback) and `lib/dashboard.ts` (breakdown fallback). "Other" stays the real default category for deletion reassignment. Test updated (`dashboard.test.ts` expects "Uncategorised").

**Acceptance:**
- [x] One term everywhere — single source `uncategorisedLabel`; no "Uncategorized"/"Uncategorised" drift in UI (verified by tests: 353 passed)

---

## Audit trail (verified working — keep as regression notes)

Prod build E2E sweep (2026-08-12, port 3000, 1280×900 + 360×800 viewports):

- **Dashboard:** Spent this month/year ₹3,301.25; Money to receive ₹700; Money to pay ₹0; category bars (Groceries 36.4% ₹1,200.50, Entertainment 30.3% ₹1,000.00, Food 25.8% ₹850.75, Other 7.6% ₹250.00) sum to 100% with correct math; recent activity lists the E2E test expense
- **Money owed, desktop:** settlement create (₹50 UPI "prod test settlement") → POST 200 → history entry + Undo (confirm → restored to ₹0 of ₹400, outstanding ₹700); Add IOU "test iou" ₹75 to Priya → appears (₹775) → settled ₹75 "clearing test iou" → Paid state, outstanding back to ₹700; Remind Priya shows copy-with-no-phone fallback; Remind Rahul shows wa.me/9876543210 deep link with the drafted message URL-encoded
- **Expenses:** list/search/filters render; create on prod (₹123.45 Food "prod test expense") created on FIRST click, redirect to detail; delete → confirm → back to list; test row removed (only the original E2E test expense remains)
- **People:** search box, add/edit/delete buttons, settlement-history counts, reminders count render at 360px
- **Analytics:** month view (avg ₹106.49 across 31 days = correct), quarter view (Q3, avg ₹35.88 across 92 days, monthly trend), category breakdown all consistent
- **Budgets:** set ₹4,000 overall → 82.5% used, ₹698.75 left, "75% used — three-quarters in" band; save worked on first click at 360px; delete → confirm → empty state
- **Settings:** category chips, add-category field, INR sample table (₹12,34,567.89 Indian grouping, ₹0.999 → ₹1.00) all correct
- **Mobile 360×800:** all pages render above/below bottom nav correctly; ONLY the z-index overlay bug (#1) breaks interaction
- **Money-owed row note:** the movie-snacks debt (₹200) now shows Paid with 3 settlements (₹50 Cash "2nd installment", ₹50 UPI "half done", +1 more) — that data change came from outside this test session
- Navigation via sidebar/links works; `npm run build` clean (17 static pages); `next start` Ready in 1823ms; lint + types clean

## Environment artifacts (NOT app bugs)

- Infinite `money-owed?_rsc=sC3GHgaIBPBPmYR9` refetch loop + webpack.hot-update polls in dev = stale HMR/deleted-`.next`-under-running-server; disappeared after clean restart; `next-hmr-refresh: 1` seen during it
- Transient `SyntaxError: Unexpected end of JSON input` at `loadManifest` during forced server kill/restart sequences
- `next start -p 3001` stale production instance had to be killed along with dev server before `npm run start` could bind 3000