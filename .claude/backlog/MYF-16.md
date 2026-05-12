# PRD: Plaid tile buttons — primary/secondary visual differentiation

**Ticket:** MYF-16
**Status:** ✅ Complete
**Created:** 2026-05-11

---

## TL;DR
The "Connect a new bank" and "Reuse a connected bank" buttons on Plaid tiles look too similar. They need clear primary/secondary styling so the user instantly understands which is the main action.

---

## Problem
Both buttons use nearly the same green-tinted border and muted color. "Reuse a connected bank" is slightly smaller and greyer but the difference isn't meaningful — a user glancing at the tile can't immediately tell which button does what or which is more important.

---

## Solution
Give "Connect a new bank" a solid, clearly visible treatment (the existing green `#8ab84a` border/text, kept as-is). Give "Reuse a connected bank" a distinctly secondary style — dimmer color, smaller font, and a text-only or underline style with no border — so it reads as a supporting option rather than a competing action.

---

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | In `AccountTile` in `Step1Upload.js`: restyle "Connect a new bank →" as the clear primary button — keep the existing green border/text, add `fontWeight: 500` | ✅ Done |
| 2 | Restyle "Reuse a connected bank →" as a plain text secondary link — remove the border, use `color: '#4a6a3a'`, `fontSize: 11`, `background: 'transparent'`, `padding: '4px 0'`, `textDecoration: 'underline'`, no border | ✅ Done |

**Status legend:**
- ⬜ Not started
- 🟡 In progress
- ✅ Done
- ❌ Blocked

---

## Out of Scope
- Hover states beyond what's already on the existing buttons
- Any layout changes outside the two buttons
- Changes to any other tiles or screens

---

## Files That Will Change
- `frontend/src/components/Step1Upload.js` — AccountTile button styles only

---

## Open Questions
None.
