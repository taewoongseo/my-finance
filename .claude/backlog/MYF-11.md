# PRD: Fix Plaid Connect button broken after switch-to-manual and back

**Ticket:** MYF-11
**Status:** ✅ Complete
**Created:** 2026-05-09

---

## TL;DR
Clicking "Connect →" a second time (after switching to manual and back) does nothing. The Plaid Link widget never opens.

---

## Problem
After a user completes a Plaid connection, switches the account to manual upload, then switches back to Plaid mode and clicks "Connect →", the button is unresponsive. The `useEffect` that calls `openPlaidLink()` intentionally omits `openPlaidLink` from its dependency array (to prevent double-open on first connect). This causes the effect closure to hold a stale reference to the original `open` function — after `usePlaidLink` reinitializes with a new token, the stale reference no longer works.

---

## Solution
Store `openPlaidLink` in a ref so the `useEffect` always calls the latest version without needing to list it as a dependency. The ref is updated on every render before the effect runs.

---

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Add `openPlaidLinkRef = useRef()` in `Step1Upload`, assign `openPlaidLinkRef.current = openPlaidLink` on each render, and update the `useEffect` to call `openPlaidLinkRef.current()` instead of `openPlaidLink()` directly — remove the `eslint-disable` comment | ✅ Done |

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
- `frontend/src/components/Step1Upload.js` — add `openPlaidLinkRef`, update `useEffect`

---

## Open Questions
None.
