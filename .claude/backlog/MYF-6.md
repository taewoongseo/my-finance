# PRD: Amazon order categorization via Gmail

**Ticket:** MYF-6
**Status:** 🟡 In Progress
**Created:** 2026-04-30

---

## TL;DR
Connect Gmail to fetch Amazon order confirmation emails so Amazon bank transactions get LLM-inferred categories (e.g., "protein powder" → Wellness) instead of always landing in Shopping.

---

## Problem
Amazon transactions always categorize as Shopping because the bank statement only shows "AMAZON.COM" — no item-level data. Amazon has no CSV export, so the only accessible source of order detail is Gmail order confirmation emails.

---

## Solution
Add a Gmail OAuth flow (read-only scope) to fetch Amazon order confirmation emails. Match each Amazon bank charge to an order by Grand Total (±$1) and order date (±2 days). Pass matched item names to the categorizer. Unmatched Amazon transactions fall back to Shopping with `needs_review: true`. Tokens stored in localStorage; backend silently refreshes on expiry.

---

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Set up Google Cloud project: enable Gmail API, create OAuth 2.0 credentials (web app), add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `backend/.env` | ⬜ Not started |
| 2 | Create `backend/amazon_gmail.py`: `get_gmail_service(access_token)` using `googleapiclient` + `google-auth`; `fetch_amazon_orders(access_token)` searches for subject:"Your Amazon.com order" from:auto-confirm@amazon.com, returns list of `{order_date, grand_total, items[]}` | ⬜ Not started |
| 3 | In `backend/amazon_gmail.py`: `parse_order_email(msg_payload)` extracts Grand Total and Order Date from email HTML body via regex; `refresh_access_token(refresh_token)` exchanges refresh token for new access token using Google token endpoint | ⬜ Not started |
| 4 | Add `GET /gmail/auth-url` in `backend/main.py`: builds Google OAuth URL with `https://www.googleapis.com/auth/gmail.readonly` scope and `access_type=offline`, returns `{auth_url}` | ⬜ Not started |
| 5 | Add `GET /gmail/callback` in `backend/main.py`: accepts `code` query param, exchanges for `{access_token, refresh_token}` via Google token endpoint, returns both to frontend | ⬜ Not started |
| 6 | Add `enrich_with_amazon_orders(transactions, access_token, refresh_token)` in `backend/amazon_gmail.py`: fetch orders (auto-refresh if needed), for each transaction where merchant contains "amazon" match to order by amount ±$1 and date ±2 days, attach `amazon_items` list to matched transactions | ⬜ Not started |
| 7 | In `backend/main.py` `/upload` route: accept optional `gmail_access_token` and `gmail_refresh_token` form fields; call `enrich_with_amazon_orders()` after parsing, before categorizing | ⬜ Not started |
| 8 | In `backend/categorizer.py`: when a transaction has `amazon_items`, include item names in the categorization prompt; mark as `needs_review: true` regardless so user can confirm the inferred category | ⬜ Not started |
| 9 | Add `saveGmailTokens(accessToken, refreshToken)` and `getGmailTokens()` to `frontend/src/utils/storage.js` using localStorage key `myfinance_gmail_tokens` | ⬜ Not started |
| 10 | In `frontend/src/components/Step1Upload.js`: add "Connect Gmail for Amazon" button in the global header area of Step 1; clicking hits `/gmail/auth-url` and redirects to the returned URL; show "Gmail connected ✓" when tokens are present in storage | ⬜ Not started |
| 11 | In `frontend/src/App.js`: on mount, detect `?code=` in URL params → `POST /gmail/callback?code=...` → save tokens via `saveGmailTokens()` → `window.history.replaceState` to clear query param | ⬜ Not started |
| 12 | In `frontend/src/components/Step1Upload.js` `handleProcess`: read tokens via `getGmailTokens()`, include `gmail_access_token` and `gmail_refresh_token` in FormData when tokens are present | ⬜ Not started |

**Status legend:**
- ⬜ Not started
- 🟡 In progress
- ✅ Done
- ❌ Blocked

---

## Out of Scope
- Re-categorizing previously saved months when Gmail is connected later (on-demand re-categorization is MYF-9)
- Handling multi-order bank charges (one charge = multiple orders) — treat as unmatched, fall back to Shopping
- Amazon Fresh / Whole Foods transactions (different merchant name, different email format)

---

## Files That Will Change
- `backend/.env` — add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `backend/main.py` — add `/gmail/auth-url` and `/gmail/callback` endpoints; call `enrich_with_amazon_orders` in `/upload`
- `backend/amazon_gmail.py` (new) — Gmail API client, order email fetcher, parser, token refresh
- `backend/categorizer.py` — use `amazon_items` in prompt when present
- `frontend/src/utils/storage.js` — `saveGmailTokens`, `getGmailTokens`
- `frontend/src/components/Step1Upload.js` — Gmail connect button, pass tokens in FormData
- `frontend/src/App.js` — OAuth return detection on mount

---

## Open Questions
- **Google Cloud OAuth redirect URI**: needs to match whatever URL the frontend is hosted at (localhost:3000 for dev, Vercel domain for prod) — must be registered in Google Cloud console before task 11 works in production
