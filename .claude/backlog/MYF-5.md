---
id: MYF-5
title: Amazon order history CSV upload for item-level transaction categorization
type: feature
status: backlog
linear_url: https://linear.app/myfinance/issue/MYF-5/amazon-order-history-csv-upload-for-item-level-transaction
created: 2026-04-30
---

## What
Allow users to upload their Amazon order history CSV so that Amazon bank transactions are categorized by actual item type (via LLM) rather than defaulting to Shopping.

## Expected Outcome
Amazon transactions matched to order history get LLM-inferred categories (e.g., "protein powder" → Wellness, "HDMI cable" → Hobbies) instead of always landing in Shopping. Step1Upload shows Amazon CSV as an optional upload alongside Venmo CSV in the empty state.

## Affected Files
- `backend/main.py` — cross-reference Amazon orders with bank transactions before categorization
- `backend/categorizer.py` — new LLM function to infer category from Amazon item names
- `backend/amazon_parser.py` (new) — parse Amazon order history CSV format
- `frontend/src/components/Step1Upload.js` — add Amazon CSV upload option in empty/hint state

## Risks / Notes
- Amazon order history CSV format may change; parser needs to be resilient to column variations
- One bank transaction may map to multiple Amazon order items (partial shipments, multi-item orders); need aggregation strategy
- Cross-referencing by date + amount may be ambiguous if multiple Amazon orders share the same charge amount in a month
