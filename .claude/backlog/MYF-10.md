---
id: MYF-10
title: Polish account tile UI in Step 1 — alignment, sizing, density
type: improvement
status: done
linear_url: https://linear.app/myfinance/issue/MYF-10/polish-account-tile-ui-in-step-1-alignment-sizing-density
created: 2026-04-30
---

## TL;DR
The account tiles feel unfinished — small buttons, a dangling "Use Plaid instead" link that creates empty space, and no clear visual hierarchy. Restructure to a two-row layout that fills the tile and makes the primary action prominent.

---

## Problem
The current tile has a single flex row (account name + small button side by side) with a "Use Plaid instead →" link always rendered below it via `marginTop: 8`. This makes every tile taller than it needs to be with dead space at the bottom. Buttons use `padding: 7px 14px / fontSize: 12` — too small to feel intentional. The account name and type text are in the same flex row as the button but don't feel centered relative to the tile as a whole.

---

## Solution
Restructure `AccountTile` into a two-row layout:
- **Row 1**: account name (left, larger) + `×` delete (top-right corner)
- **Row 2**: full-width primary action button ("+ Add PDF" or "Connect via Plaid"), sized to feel substantial
- Account type label sits below the name in row 1 (unchanged)
- "Switch to Plaid / Switch to manual" moves to a small secondary line below row 2 — same text, smaller, right-aligned, only shown when relevant
- Connected state (green ✓) and error state (red Reconnect) follow the same row 2 slot

---

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Restructure AccountTile's top row: account name + type on the left (vertically centered), `×` delete pinned to top-right via `position: absolute` or `alignSelf: flex-start` on the delete span | ✅ Done |
| 2 | Move the primary action ("+ Add PDF", "Connect via Plaid", "✓ connected", "Reconnect") to a second row below the name/type, full-width, with `padding: '10px 16px'` and `fontSize: 13` | ✅ Done |
| 3 | Move "Use Plaid instead →" and "← Switch to manual upload" to a small `fontSize: 11` line below the action row, right-aligned — remove the separate `marginTop: 8` section | ✅ Done |
| 4 | For the connected state, replace the bare `✓ accountName` span in the action slot with a properly sized pill/badge that matches the tile's width rhythm | ✅ Done |

---

## Out of Scope
- Logic changes — this is style and layout only
- Changes to file list rendering (files appear below the action row, same as now)
- Changes to the Plaid picker modal

---

## Files That Will Change
- `frontend/src/components/Step1Upload.js` — `AccountTile` component JSX and inline styles only

---

## Open Questions
None.
