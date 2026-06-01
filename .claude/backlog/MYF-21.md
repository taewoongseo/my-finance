# PRD: Allow category editing on offset transactions in dashboard

**Ticket:** MYF-21
**Status:** ✅ Complete
**Created:** 2026-05-16

---

## TL;DR
Offset transactions in the monthly dashboard cannot have their category changed. They should behave identically to regular transactions — same dropdown, same immediate re-grouping.

---

## Problem
In `Step3Dashboard`, `TransactionRow` has an early return for `isOffset` rows that renders a stripped-down layout with no category dropdown. Users cannot recategorize an offset after it appears in the dashboard, even though the same action is available for all regular transactions.

---

## Solution
Remove the early-return offset path in `TransactionRow` and give offset rows the same category dropdown as regular transactions. Add a handler in `Step3Dashboard` for offsets stored in `localOffsets` (balancer offsets) that updates `offset_category`. Manual offsets already in the `transactions` array are handled by the existing `handleCategoryChange`. Thread the new handler down through `CategoryRow` → `TransactionRow`.

---

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | In `Step3Dashboard`, add `handleOffsetCategoryChange(offsetId, newCategory)` that updates `offset_category` on the matching entry in `localOffsets` state | ✅ Done |
| 2 | In `TransactionRow`, replace the early-return offset block with a full row (same layout as regular rows) that shows `transaction.offset_category ?? transaction.category` in the category dropdown and calls `onOffsetCategoryChange` on selection | ✅ Done |
| 3 | Thread `onOffsetCategoryChange` prop from `Step3Dashboard` → `CategoryRow` → `TransactionRow` | ✅ Done |

**Status legend:**
- ⬜ Not started
- 🟡 In progress
- ✅ Done
- ❌ Blocked

---

## Out of Scope
Nothing explicitly excluded.

---

## Files That Will Change
- `frontend/src/components/Step3Dashboard.js` — add `handleOffsetCategoryChange`, thread new prop through `CategoryRow`, update `TransactionRow` offset render path

---

## Open Questions
None.
