# PRD: Plaid Integration as Alternative to PDF/CSV Upload

**Ticket:** MYF-7
**Status:** ✅ Complete
**Created:** 2026-04-30

---

## TL;DR
Add Plaid as a per-account data source in Step 1 so users can connect bank accounts and pull transactions for a selected month, coexisting with the existing PDF/CSV upload flow.

---

## Problem
Users must manually download and upload PDF/CSV bank statements every month. There is no way to pull transaction data directly from a bank. This is friction-heavy and error-prone.

---

## Solution
Each account tile in Step 1 gets a toggle between "manual upload" and "connect via Plaid". Plaid connection is established once per account (user completes Plaid Link, picks which sub-account maps to that tile), and the access token persists in localStorage. On subsequent months, hitting Process automatically fetches transactions for that month from Plaid — no re-authentication required. If a connection goes stale, the tile shows an inline error with a "Reconnect" button. All Plaid transactions flow through the same categorizer → balancer → Step 2 → Step 3 pipeline as file-based transactions.

---

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Install `plaid-python`; create `backend/plaid_client.py` with env var loading (`PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`) and an initialized Plaid `ApiClient` + `PlaidApi` instance | ✅ Done |
| 2 | Add `POST /plaid/link-token` to `main.py` — calls `LinkTokenCreate` with a static `client_user_id` and `products: ["transactions"]`; returns `{ link_token }` | ✅ Done |
| 3 | Add `POST /plaid/exchange-token` to `main.py` — accepts `{ public_token }`, calls `ItemPublicTokenExchange`, then `AccountsGet`; returns `{ access_token, accounts: [{account_id, name, official_name, type, subtype}] }` | ✅ Done |
| 4 | Extend `POST /upload` in `main.py` to accept an optional `plaid_accounts` JSON field (array of `{ access_token, account_id, account_name, account_type, month }`); for each, call `TransactionsGet` filtered by that `account_id` and date range, normalize to `{ date, description, amount, account, account_type }`, and merge with file-parsed transactions before categorization | ✅ Done |
| 5 | Add `updateAccount(id, fields)` to `frontend/src/utils/storage.js` — merges `fields` onto an existing account object and re-saves to localStorage | ✅ Done |
| 6 | Update `AccountTile` in `Step1Upload.js` to support a `dataSource` prop: when `'manual'` show current file drop UI; when `'plaid'` show "Connect via Plaid" button (unconnected) or a green "Connected — Chase Freedom CC" indicator (connected); when `'plaid-error'` show inline red error + "Reconnect" button | ✅ Done |
| 7 | Wire up Plaid Link in `Step1Upload.js`: on "Connect via Plaid" click, call `/plaid/link-token`, open Plaid Link widget (via `react-plaid-link`), on `onSuccess` call `/plaid/exchange-token`, show a sub-account picker modal with the returned accounts list, on selection call `updateAccount` to store `{ dataSource: 'plaid', plaidAccessToken, plaidAccountId, plaidAccountName }` | ✅ Done |
| 8 | Update `handleProcess` in `Step1Upload.js` (line 145) to include Plaid-connected accounts: collect accounts where `dataSource === 'plaid'` as `plaidAccounts`; pass both `uploadedAccounts` and `plaidAccounts` to `onProcess`; enable the Process button when there is at least one ready account (file uploaded OR Plaid connected) | ✅ Done |
| 9 | Update `UploadScreen.handleProcess` in `App.js` (line 109) to serialize `plaidAccounts` into the FormData as `plaid_accounts` JSON alongside any file uploads before posting to `/upload` | ✅ Done |

**Status legend:**
- ⬜ Not started
- 🟡 In progress
- ✅ Done
- ❌ Blocked

---

## Out of Scope
- 401k and investment account tracking (deferred until Plaid integration is stable)
- Venmo via Plaid (Plaid does not expose Venmo memo fields needed for offset logic — stays manual)
- Server-side token storage (backend is stateless; access tokens live in localStorage)
- Automatic token refresh or background re-auth (MVP: stale connection shows error, user manually reconnects)

---

## Files That Will Change
- `backend/plaid_client.py` (new) — Plaid SDK client setup and initialized API instance
- `backend/main.py` — three new routes (`/plaid/link-token`, `/plaid/exchange-token`); `/upload` extended to accept and process `plaid_accounts`
- `frontend/src/utils/storage.js` — new `updateAccount` function
- `frontend/src/components/Step1Upload.js` — `AccountTile` Plaid mode + Plaid Link wiring + updated `handleProcess`
- `frontend/src/App.js` — `UploadScreen.handleProcess` serializes Plaid credentials into FormData

---

## Open Questions
None.
