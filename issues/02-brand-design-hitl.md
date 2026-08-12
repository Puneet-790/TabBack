# Issue 02 — Brand & design language

## What to build

Define and apply the shared visual language for every subsequent slice: design tokens (color palette, typography, radius, spacing, shadows), the TabBack wordmark + tagline presentation, empty states, and confirmation that all money figures render in ₹ with exactly 2 decimals and Indian grouping. Refresh the auth screens and the app shell (from issue 01) to production-polite finish — the "modern, minimal, data-focused" feel that the rest of the app inherits.

This is a human decision checkpoint: the mock reviewer must sign off on the look before features build on top of it. Deliver tokens and screenshots to be reviewed; iterate until approved.

Agreed working rule: **every subsequent slice ships its own polished, responsive UI using these tokens — polish is part of each slice, not a final cleanup pass.** Each issue records the polish criterion below.

## Acceptance criteria

- [ ] Design tokens (colors, type scale, radii, spacing) live in one place and the shell consumes them — no hardcoded colors anywhere in the shell
- [ ] Auth screens and dashboard placeholder present the TabBack wordmark and tagline
- [ ] ₹ formatting rule demonstrated: `₹` prefix, exactly 2 decimals, Indian grouping, consistent across a sample grid of money values (including 0, negative not applicable, and 3-digit inputs)
- [ ] Desktop sidebar and mobile bottom-nav styles match the approved direction
- [ ] Design review signed off (approval recorded in the issue thread)
- [ ] Tokens exported/usable by all future slices (single source, no duplicates) so each slice satisfies its own polish criterion without new decisions

## Blocked by

- 01-scaffold-auth-shell-afk.md

## Status

Approved 2026-08-09 (user sign-off via orchestrator Q&A): teal `#0f766e` accent on light `#f6f7f5` background, Geist sans, token set in `src/lib/tokens.ts` + `globals.css` `:root`. Wordmark + tagline on auth/shell. ₹ formatting via `src/lib/money.ts` (`round2` + `formatINR`, en-IN, 2 dp). HITL checkpoint closed.