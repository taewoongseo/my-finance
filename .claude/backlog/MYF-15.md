# PRD: Reuse existing Plaid connection for second account from same bank

**Ticket:** MYF-15
**Status:** ✅ Complete
**Created:** 2026-05-11

---

## TL;DR
When a user has already connected a bank via Plaid, linking a second account from that same bank forces a full re-authentication. Since the access token covering all authorized accounts is already stored in the DB, the app should surface those unused accounts directly without reopening Plaid Link.

---

## Problem
A user connects Chase and authorizes both CC and Checking. The app maps CC to tile 1. When they add a Chase Checking tile and click Connect, Plaid Link opens and asks them to log into Chase again — even though the Checking access token is already sitting in the DB unused.

---

## Solution
Store account metadata (name, type) alongside access tokens in `plaid_connections` at exchange time. Add a `GET /plaid/accounts` endpoint. In `Step1Upload.js`, when a tile is in Plaid mode, check if any stored accounts are not yet mapped to any tile — if so, show a secondary **"Reuse a connected bank →"** button that opens the existing account picker populated from the DB, skipping Plaid Link entirely.

---

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Run schema migration on Neon: `ALTER TABLE plaid_connections ADD COLUMN account_name TEXT, ADD COLUMN account_type TEXT` | ✅ Done |
| 2 | Update `set_plaid_token` in `database.py` to accept and store `account_name` and `account_type`; add `get_all_plaid_accounts(user_id)` returning `[{account_id, account_name, account_type}]` | ✅ Done |
| 3 | Update `POST /plaid/exchange-token` in `main.py` to pass `account_name` and `account_type` to `set_plaid_token` for each account | ✅ Done |
| 4 | Add `GET /plaid/accounts` endpoint in `main.py` that returns all stored plaid accounts for the authenticated user via `db.get_all_plaid_accounts(user_id)` | ✅ Done |
| 5 | In `Step1Upload.js`, fetch `GET /plaid/accounts` on mount alongside `getAccounts`; store result in `storedPlaidAccounts` state; derive `unmappedAccounts` by filtering out `account_id`s already used as `plaidAccountId` in any existing tile | ✅ Done |
| 6 | In `AccountTile`, rename the existing "Connect →" button to **"Connect a new bank →"** | ✅ Done |
| 7 | In `AccountTile`, when the tile is in Plaid mode (not yet connected) and `unmappedAccounts.length > 0`, render a secondary **"Reuse a connected bank →"** button below "Connect a new bank →" | ✅ Done |
| 8 | Wire "Reuse a connected bank →" click to set `plaidPickerAccounts` to `unmappedAccounts` — reusing the existing picker modal, no Plaid Link opened | ✅ Done |

**Status legend:**
- ⬜ Not started
- 🟡 In progress
- ✅ Done
- ❌ Blocked

---

## Out of Scope
- Opening Plaid Link in update mode or any Plaid-modal-based reuse flow
- Detecting which bank the unmapped accounts belong to (account name from Plaid is sufficient)
- Handling stale/revoked access tokens in the reuse flow

---

## Files That Will Change
- `backend/database.py` — update `set_plaid_token`, add `get_all_plaid_accounts`
- `backend/main.py` — update `exchange_public_token`, add `GET /plaid/accounts`
- `frontend/src/components/Step1Upload.js` — fetch stored accounts on mount, derive unmapped list, add "Reuse a connected bank →" button to `AccountTile`

---

## Open Questions
None.
