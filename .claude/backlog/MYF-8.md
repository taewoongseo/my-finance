---
id: MYF-8
title: Skip Plaid sub-account picker when only one account returned
type: improvement
status: done
linear_url: https://linear.app/myfinance/issue/MYF-8/skip-plaid-sub-account-picker-when-only-one-account-returned
created: 2026-04-30
---

## What
When a user completes Plaid Link and only one account comes back from `/plaid/exchange-token`, auto-select it and skip the picker modal — the modal is only needed when multiple accounts were shared.

## Expected Outcome
If `accounts.length === 1` after exchange, the account is connected immediately with no modal. If `accounts.length > 1`, the existing picker modal is shown as-is.

## Affected Files
- `frontend/src/components/Step1Upload.js` — `onPlaidSuccess` callback: add a branch that calls `handleSelectPlaidAccount` directly when `accounts.length === 1`

## Risks / Notes
- `handleSelectPlaidAccount` currently reads `connectingAccountId` and `pendingAccessToken` from outer scope via closure — both must be set before the auto-select branch runs (they are, since this happens inside `onPlaidSuccess`)
