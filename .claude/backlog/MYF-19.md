---
id: MYF-19
title: Replace default React favicon with custom app icon
type: chore
status: backlog
linear_url: https://linear.app/myfinance/issue/MYF-19/replace-default-react-favicon-with-custom-app-icon
created: 2026-05-11
---

## What
Swap out the default Create React App favicon with a custom icon for myfinance.

## Expected Outcome
Browser tab shows a custom favicon instead of the React logo. Works in both local dev and prod (Vercel).

## Affected Files
- `frontend/public/favicon.ico` — replace with new icon file
- `frontend/public/index.html` — update `<link rel="icon">` if format changes (e.g. PNG instead of ICO)

## Risks / Notes
- Favicon is set in the codebase, not in Vercel — no Vercel config needed
- Browser caches favicons aggressively; hard-refresh or incognito may be needed to see the change
