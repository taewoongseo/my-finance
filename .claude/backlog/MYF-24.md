# PRD: Look-and-feel pass — fonts, MonthPicker, brand mark, Home + AccountTile restyling

**Ticket:** MYF-24 (Phase 0 of MYF-23)
**Status:** ✅ Complete
**Created:** 2026-06-01

---

## TL;DR
Pure visual/styling pass over the existing app — no new computation, no new screens, no backend changes. Gets the app to the design system baseline before the heavier redesign phases.

---

## Problem
The app uses system fonts, a native month `<select>`, inline brand marks with no hover/navigation, and mismatched visual language across screens. The `AccountTile` has no visual account-type cues. The `HomeScreen` has no proper empty state and MonthCards have no visual hierarchy.

---

## Solution
Load DM Sans + JetBrains Mono from Google Fonts. Add `CATEGORY_COLORS` and `ACCOUNT_TINTS` to `config.js`. Restyle `HomeScreen` (empty state card, MonthCard layout, layout tweaks). Replace the native month `<select>` with the custom `MonthPicker` popover. Update brand marks on Upload and Dashboard to use JetBrains Mono and navigate → home on click. Restyle `AccountTile` with left color rail, type chip, and SourceToggle — no logic changes.

---

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Add DM Sans + JetBrains Mono `<link>` tags to `frontend/public/index.html` | ✅ Done |
| 2 | Add `CATEGORY_COLORS` and `ACCOUNT_TINTS` exports to `frontend/src/config.js` | ✅ Done |
| 3 | Restyle `HomeScreen` in `App.js`: empty state card (dashed border, upload icon, "No months yet" headline, CTA, "PDF · CSV · Auto sync" footer); MonthCard layout (month name 22px dominant, year muted, "Open →" pill, no subline); max-width 620; ghost "+ New month" in header row; dashed "+ Process new month" at bottom; brand mark → JetBrains Mono | ✅ Done |
| 4 | Port `MonthPicker` component (from `design_handoff_budgets_redesign/shared.jsx`) into `Step1Upload.js`; replace the native `<select>` block with `<MonthPicker value={selectedMonth} onChange={setSelectedMonth} />`; reuse existing `MONTHS` array | ✅ Done |
| 5 | Update `Step1Upload.js` brand mark: JetBrains Mono, add `useNavigate`, make clickable → `/`; update H1 to "Process a new month"; add `/ upload` eyebrow mono tag | ✅ Done |
| 6 | Restyle `AccountTile` in `Step1Upload.js`: left 2px color rail keyed to `ACCOUNT_TINTS`; type chip (account type label, tint fill + border); replace "Use Plaid instead →" / "← Switch to manual" text links with a segmented `SourceToggle` (two segments: "Upload file" / "Auto sync") — same `onSwitchToPlaid`/`onSwitchToManual` callbacks, purely cosmetic | ✅ Done |
| 7 | Add static brand mark to `Step3Dashboard.js` (top-left of the screen, JetBrains Mono, clickable → `/` via `useNavigate`) | ✅ Done |

**Status legend:**
- ⬜ Not started
- 🟡 In progress
- ✅ Done
- ❌ Blocked

---

## Out of Scope
- CategoryBar on MonthCards (requires per-month spending aggregation)
- Expenses figure and MoM chip on MonthCards (requires aggregation)
- Full AccountCard redesign beyond color rail + type chip (DropZone redesign, StatusPill)
- `/budget` and `/overview` screens
- Dashboard sidebar / layout restructure
- Step2Review.js changes
- Backend changes

---

## Files That Will Change
- `frontend/public/index.html` — add Google Fonts link tags
- `frontend/src/config.js` — add `CATEGORY_COLORS`, `ACCOUNT_TINTS` exports
- `frontend/src/App.js` — HomeScreen empty state + MonthCard restyle
- `frontend/src/components/Step1Upload.js` — MonthPicker, brand mark, H1 copy, AccountTile restyle
- `frontend/src/components/Step3Dashboard.js` — static brand mark added

---

## Open Questions
None.
