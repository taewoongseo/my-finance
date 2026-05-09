# PRD: Fix dual-source processing when switching from PDF to Plaid

**Ticket:** MYF-12
**Status:** ✅ Complete
**Created:** 2026-05-09

---

## TL;DR
Switching to Plaid after uploading a PDF causes both sources to be processed, producing duplicate transactions. `dataSource` should be the single source of truth.

---

## Problem
`handleProcess` builds `uploadedAccounts` by filtering only on whether files exist — it doesn't check `dataSource`. So an account with `dataSource: 'plaid'` and an uploaded file ends up in both `uploadedAccounts` and `plaidAccounts`. The backend receives both and merges the results, duplicating that account's transactions. The button label (`totalFiles`) has the same blind spot and incorrectly shows "Process 1 file + 1 Plaid account →".

---

## Solution
Add `&& a.dataSource !== 'plaid'` to the `uploadedAccounts` filter and to the `totalFiles` derivation. `dataSource` is already the gate for `plaidAccounts`, so this makes both sides symmetric.

---

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | In `handleProcess`, add `&& a.dataSource !== 'plaid'` to the `uploadedAccounts` filter | ✅ Done |
| 2 | Apply the same guard to the `totalFiles` derivation so the button label is accurate | ✅ Done |

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
- `frontend/src/components/Step1Upload.js` — `handleProcess` and `totalFiles` derivation

---

## Open Questions
None.
