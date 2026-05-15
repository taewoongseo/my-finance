# PRD: Add logout button to sidebar/nav

**Ticket:** MYF-18
**Status:** ✅ Complete
**Created:** 2026-05-12

---

## TL;DR
There is no way to sign out of the app from any screen. Add a fixed top-right avatar button with a dropdown showing the user's name, email, and a sign out option.

---

## Problem
Once logged in, there is no logout button visible on any screen — Home, Upload, Review, or Dashboard. Users are stuck with no way to sign out.

---

## Solution
A fixed-position avatar circle in the top-right corner of every authenticated screen. Clicking it opens a small dropdown with the user's Google profile photo, name, email, and a "Sign out" button. Signing out redirects to the LoginScreen (already handled by `<SignedOut>` in App.js). No shared layout wrapper needed — the component floats over existing layouts.

---

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Create `UserMenu` component in `frontend/src/components/UserMenu.js`: fixed top-right avatar using `useUser().user.imageUrl`; click toggles a dropdown with name, email, divider, and "Sign out" button; outside click closes it; calls `useClerk().signOut()` on sign out | ✅ Done |
| 2 | Import and render `<UserMenu />` inside the `<SignedIn>` block in `App.js`, outside the `<Routes>` so it appears on every authenticated screen | ✅ Done |

**Status legend:**
- ⬜ Not started
- 🟡 In progress
- ✅ Done
- ❌ Blocked

---

## Out of Scope
- Sidebar or top nav bar restructuring
- Putting the logout inside Step3Dashboard's left sidebar
- Any other account management (password change, delete account, etc.)

---

## Files That Will Change
- `frontend/src/components/UserMenu.js` — new component: fixed avatar + dropdown with sign out
- `frontend/src/App.js` — render `<UserMenu />` inside `<SignedIn>` outside `<Routes>`

---

## Open Questions
None.
