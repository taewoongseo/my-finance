# PRD: Deploy to production with Plaid production credentials

**Ticket:** MYF-13
**Status:** 🟡 In Progress
**Created:** 2026-05-09

---

## TL;DR
Deploy the app to a hosted environment and wire it to Plaid production credentials. Localhost stays on sandbox indefinitely — production Plaid is only used on the hosted app.

---

## Problem
The app only runs on localhost with sandbox (fake) Plaid data. To connect real bank accounts, the app needs to be hosted at a stable URL and configured with production Plaid credentials. Doing this on localhost would waste the 10-connection limit every time local state is cleared.

---

## Solution
Host the frontend on Vercel and the backend on a Python-compatible host (TBD — Railway, Render, or Fly.io). Set production env vars (`PLAID_ENV=production`, production secret, `PLAID_REDIRECT_URI`) only on the hosted environment. Localhost stays pointed at sandbox with no changes. Add OAuth redirect handling in the frontend so major banks work on production.

---

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Deploy frontend to Vercel (connect GitHub repo, set build dir to `frontend`, set `REACT_APP_API_URL` env var pointing to the hosted backend URL) | ⬜ Not started |
| 2 | Deploy backend to a Python host (Railway / Render / Fly.io — TBD); set env vars: `PLAID_ENV=production`, `PLAID_SECRET=<production secret>`, `PLAID_CLIENT_ID`, `OPENAI_API_KEY`, `PLAID_REDIRECT_URI=https://<vercel-domain>/upload` | ⬜ Not started |
| 3 | Update CORS in `backend/main.py` to allow the Vercel domain in addition to localhost | ⬜ Not started |
| 4 | Replace hardcoded `http://localhost:8000` API calls in the frontend with `process.env.REACT_APP_API_URL` (falls back to `http://localhost:8000` for local dev) | ⬜ Not started |
| 5 | In `backend/main.py` `create_link_token`: read `PLAID_REDIRECT_URI` from `os.getenv` and add it to `LinkTokenCreateRequest` kwargs when set | ⬜ Not started |
| 6 | In `Step1Upload.js` `handleConnect`: save `connectingAccountId` to `sessionStorage` under key `plaid_connecting_id` before setting `linkToken` | ⬜ Not started |
| 7 | In `Step1Upload.js`: add `receivedRedirectUri` state; pass it to `usePlaidLink` as `receivedRedirectUri` option when set | ⬜ Not started |
| 8 | In `Step1Upload.js` mount `useEffect`: detect `oauth_state_id` in URL params → restore `connectingAccountId` from sessionStorage, fetch new link token, set `receivedRedirectUri` to `window.location.href`, clear query param via `window.history.replaceState` | ⬜ Not started |
| 9 | Register the Vercel domain (`https://<domain>/upload`) as an allowed redirect URI in the Plaid dashboard | ⬜ Not started |

**Status legend:**
- ⬜ Not started
- 🟡 In progress
- ✅ Done
- ❌ Blocked

---

## Out of Scope
- Changing localhost setup — stays on sandbox, no env changes locally
- User offboarding / account unlinking
- Full Plaid production checklist (webhooks, product-specific workflows)
- User accounts / auth — app remains single-user

---

## Files That Will Change
- `backend/main.py` — CORS update, `redirect_uri` in `create_link_token`
- `frontend/src/components/Step1Upload.js` — OAuth return handling, sessionStorage save
- `frontend/src/App.js` — possibly if a dedicated OAuth return route is needed
- All frontend files with hardcoded `http://localhost:8000` — replace with `REACT_APP_API_URL`

---

## Open Questions
- **Backend host**: Railway, Render, or Fly.io? All support FastAPI. Railway is the simplest to set up from a GitHub repo.
- **Vercel domain**: Not known yet — needed before task 9 and before setting `PLAID_REDIRECT_URI`.
