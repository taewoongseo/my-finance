---
id: MYF-9
title: User-configurable categorization rules and prompt injection
type: feature
status: backlog
linear_url: https://linear.app/myfinance/issue/MYF-9/user-configurable-categorization-rules-and-prompt-injection
created: 2026-04-30
---

## What
Allow users to define custom categorization rules (e.g. "Verizon = Internet", "Amazon = Household goods") that get injected into the LLM prompt alongside a base system prompt, with a UI to manage and edit them globally.

## Expected Outcome
Users can add, edit, and remove categorization rules from a UI. Rules persist globally in localStorage. On demand, existing transactions for the current month can be re-categorized using the updated rules. The base system prompt handles general logic; user rules layer on top.

## Affected Files
- `backend/categorizer.py` — accept and inject user rules into the prompt
- `backend/main.py` — accept user rules as a request field on `/upload` and a new `/recategorize` endpoint
- `frontend/src/utils/storage.js` — persist/read user categorization rules in localStorage
- `frontend/src/components/Step3Dashboard.js` or new settings UI — rule management interface
- `frontend/src/App.js` — wire up recategorize call if it lives in the review/dashboard flow

## Risks / Notes
- Rule format (free-text vs structured) is unresolved — needs exploration before PRD
- UI placement (settings page vs inline) is unresolved — needs exploration before PRD
- Re-categorization on demand must not overwrite manual user corrections from Step 2
