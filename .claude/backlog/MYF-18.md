---
id: MYF-18
title: Add logout button to sidebar/nav
type: feature
status: backlog
linear_url: https://linear.app/myfinance/issue/MYF-18/add-logout-button-to-sidebarnav
created: 2026-05-11
---

## What
Add a logout button to a persistent sidebar or nav bar so users can sign out from anywhere in the app.

## Expected Outcome
A visible logout button (sidebar or top nav) that calls Clerk signOut and redirects to the login/home screen. Google SSO is the only auth method — no email/password needed.

## Affected Files
- `frontend/src/App.js` — add sidebar or nav layout component with logout button using Clerk `useClerk().signOut()`

## Risks / Notes
- No dedicated sidebar component exists yet — may need to create a lightweight layout wrapper
- Logout should work from any route (/upload, /review, /month/:month)
- After sign-out, user should land on the Clerk sign-in page or a public landing page
