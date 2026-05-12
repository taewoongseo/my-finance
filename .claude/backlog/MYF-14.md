# PRD: User auth + cloud persistence (Google OAuth, Neon Postgres, Cloud Run)

**Ticket:** MYF-14
**Status:** ✅ Complete
**Created:** 2026-05-09

---

## TL;DR
Add Google OAuth login and replace localStorage with Neon Postgres so user data persists across devices and browser sessions. Total infra cost: $0/month.

---

## Problem
All data lives in localStorage — clearing the browser or switching devices loses everything. There is no login, so the app can only ever be used by one person on one machine.

---

## Solution
Deploy frontend to Vercel, backend to Cloud Run (GCP), add Clerk for Google OAuth, and store all user data in Neon (serverless Postgres). Frontend talks to the backend via authenticated API calls; the backend owns all database reads/writes. Plaid access tokens move out of frontend state and into the database.

**Stack:**
- Frontend: Vercel (free)
- Backend: Cloud Run, GCP (pay-per-request, ~$0 for personal use)
- Auth: Clerk (free under 10k MAU, Google OAuth built-in)
- Database: Neon serverless Postgres (free tier, never pauses)

---

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Create Neon project; run schema: `users (id, clerk_user_id, email)`, `months (user_id, month_key, data JSONB)`, `accounts (user_id, data JSONB)`, `income (user_id, data JSONB)`, `savings_accounts (user_id, data JSONB)`, `plaid_connections (user_id, account_id, access_token)` | ✅ Done |
| 2 | Create `backend/database.py`: psycopg2 connection from `NEON_DATABASE_URL` env var; helpers `get_user_data(user_id, table)`, `set_user_data(user_id, table, data)`, `get_plaid_token(user_id, account_id)`, `set_plaid_token(user_id, account_id, access_token)` | ✅ Done |
| 3 | Add Clerk JWT middleware to `backend/main.py`: verify `Authorization: Bearer <token>` header on every request using `CLERK_SECRET_KEY`; attach `user_id` to request state; return 401 if missing or invalid | ✅ Done |
| 4 | Add data CRUD endpoints in `backend/main.py`: `GET /data/{table}` and `POST /data/{table}` for tables accounts, months, income, savings_accounts — scoped to authenticated user_id | ✅ Done |
| 5 | Update `POST /upload` in `backend/main.py`: write processed month result to Neon `months` table (keyed by user_id + month_key) instead of just returning it; still return the result to frontend for Step 2 review | ✅ Done |
| 6 | Update Plaid endpoints in `backend/main.py`: `exchange_public_token` writes access_token to `plaid_connections` table; Plaid data-fetch endpoints read access_token from DB by (user_id, account_id) — access_token never returned to frontend | ✅ Done |
| 7 | Set up Clerk project: enable Google OAuth provider, add `http://localhost:3000` and Vercel domain to allowed origins; note `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` | ✅ Done |
| 8 | Add `frontend/src/utils/auth.js`: initialize Clerk client with `REACT_APP_CLERK_PUBLISHABLE_KEY`; export `getToken()` helper that returns the current session JWT for attaching to API requests | ✅ Done |
| 9 | Add `frontend/src/components/LoginScreen.js`: centered "Sign in with Google" button using Clerk's `SignIn` component or `useSignIn` hook | ✅ Done |
| 10 | Wrap `frontend/src/App.js` with `<ClerkProvider>`; use `<SignedIn>` / `<SignedOut>` to show LoginScreen when unauthenticated and existing routes when authenticated | ✅ Done |
| 11 | Replace `frontend/src/utils/storage.js`: keep the same exported function names (`saveMonthData`, `loadMonthData`, `saveAccounts`, `loadAccounts`, `saveIncome`, `loadIncome`, `saveSavingsAccounts`, `loadSavingsAccounts`) but implement each as a fetch call to `GET /data/{table}` or `POST /data/{table}` with the Clerk JWT attached | ✅ Done |
| 12 | Create `backend/Dockerfile`: Python 3.11 slim image, install requirements, `CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]` | ✅ Done |
| 13 | Deploy backend to Cloud Run: `gcloud run deploy` from backend directory; set env vars `NEON_DATABASE_URL`, `CLERK_SECRET_KEY`, `OPENAI_API_KEY`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` | ✅ Done |
| 14 | Deploy frontend to Vercel: connect GitHub repo, set build root to `frontend`, set env vars `REACT_APP_API_URL` (Cloud Run URL) and `REACT_APP_CLERK_PUBLISHABLE_KEY` | ✅ Done |

**Status legend:**
- ⬜ Not started
- 🟡 In progress
- ✅ Done
- ❌ Blocked

---

## Out of Scope
- Multi-user sharing or collaboration
- Data migration from localStorage to Neon (single user, can re-upload)
- Supabase (free tier pauses after 7 days inactivity)
- Railway (flat $5/month for low-traffic personal app)
- Firebase/Firestore (NoSQL, worse fit for structured financial data)

---

## Files That Will Change
- `backend/main.py` — Clerk JWT middleware, CRUD endpoints, update /upload and Plaid endpoints to use DB
- `backend/database.py` (new) — Neon connection, CRUD helpers, Plaid token helpers
- `backend/Dockerfile` (new) — containerize FastAPI for Cloud Run
- `frontend/src/utils/storage.js` — replace localStorage with backend API calls, keep same function signatures
- `frontend/src/utils/auth.js` (new) — Clerk client init, `getToken()` helper
- `frontend/src/App.js` — add ClerkProvider, SignedIn/SignedOut guards
- `frontend/src/components/LoginScreen.js` (new) — Google OAuth login screen

---

## Open Questions
- None.
