# myfinance — Architecture Context

This file is loaded automatically by Claude Code every session.
Read this before doing anything else.

---

## What this app does

Personal finance app: upload bank statements (PDF/CSV) → LLM categorizes transactions → user reviews → dashboard with spending breakdown.

---

## Stack

- **Backend**: Python, FastAPI, OpenAI GPT-4o-mini, pdfplumber
- **Frontend**: React, React Router, localStorage
- **No database** — all data stored in localStorage

---

## File Map

### Backend (`/backend/`)
| File | Purpose |
|------|---------|
| `main.py` | FastAPI server, upload route, orchestration pipeline |
| `pdf_parser.py` | pdfplumber extracts PDF text → OpenAI structures into JSON transactions |
| `categorizer.py` | OpenAI GPT-4o-mini categorizes transactions in chunks of 50 |
| `balancer.py` | 6 rules: CC payment pairs, Venmo funding, Venmo cashout, Venmo received, Zelle flag, savings transfers |

### Frontend (`/frontend/src/`)
| File | Purpose |
|------|---------|
| `App.js` | React Router with routes: / (HomeScreen), /upload, /review, /month/:month |
| `config.js` | CATEGORY_HIERARCHY, ACCOUNT_TYPES, TRANSFER_KEYWORDS, CONFIDENCE_THRESHOLD |
| `components/Step1Upload.js` | Multi-file per account, drag-drop, month picker |
| `components/Step2Review.js` | FlipCard (uncertain categories), FlagCard (Venmo/Zelle), transfer detection |
| `components/Step3Dashboard.js` | Category drill-down, transaction reshuffle, manual entry, savings, income |
| `utils/storage.js` | localStorage: accounts, months, savings accounts, income |

---

## Data Flow

```
PDF/CSV upload (Step1Upload.js)
    ↓
POST /upload (main.py)
    ↓
parse_file_sync() → pdf_parser.py or parse_venmo_csv()
    ↓
filter_by_month() → deduplicate by file hash
    ↓
categorize_transactions() → categorizer.py (GPT-4o-mini, chunks of 50)
    ↓
balance_transactions() → balancer.py
    ↓
Returns: { transactions, needs_review, offsets, excluded }
    ↓
Step2Review.js → FlipCard + FlagCard
    ↓
handleDone() → onDone(cleanTransactions, newOffsets)
    ↓
saveMonthData() → localStorage
    ↓
Step3Dashboard.js → aggregateByCategory()
```

---

## Category System

Categories are defined in `frontend/src/config.js` as `CATEGORY_HIERARCHY`.
**Category labels must match EXACTLY** between backend categorizer and frontend config.

```
Housing: Rent, Home Insurance
Food: Groceries, Dine out, Drinks/snacks
Transportation: Uber/Lyft, Metro/Ferry, Flights/Travel
Utilities: Energy/Electricity, Wifi, Phone, Household misc., Subscription
Personal: Shopping, Hobbies, Wellness
Giving: Offering, Gift
Other: Misc. Spending, Bank fees
Special: Income, Transfer (never shown in spending dashboard)
```

---

## Balancer Rules (balancer.py)

Rules run in this order — earlier rules take priority:
1. CC payment pairs (matched by amount ±$1, within 5 days)
2. Venmo funding from checking (`venmo` in checking debit)
3. Venmo cashout to checking (Standard Transfer)
4. Venmo received → batch LLM classify → offset or FlagCard
5. Zelle → always FlagCard
6. Savings/investment transfers (KNOWN_SAVINGS_KEYWORDS + user savings names)

---

## Key Constants

```python
# backend/categorizer.py
CONFIDENCE_THRESHOLD = 70  # below this → needs_review = True → FlipCard
CHUNK_SIZE = 50

# backend/balancer.py
ONE_SIDED_PAYMENT_KEYWORDS = ['payment to chase', 'bilt card', 'wells fargo', ...]
CC_PAYMENT_KEYWORDS = ['payment thank you', 'balance transfer', ...]
KNOWN_SAVINGS_KEYWORDS = ['robinhood', 'fidelity', 'americanexpress', ...]
```

---

## Architecture Rules — NEVER violate these

1. **Category labels** must match `config.js` CATEGORY_HIERARCHY exactly — both frontend and backend
2. **Backend returns** always include: `transactions`, `needs_review`, `offsets`, `excluded`
3. **Balancer runs after categorizer** — never before
4. **Venmo CSV** stays as manual upload — Plaid does not have Venmo memo field
5. **localStorage keys**: `myfinance_accounts`, `myfinance_months`, `myfinance_savings_accounts`, `myfinance_income`
6. **Never change balancer rules** without checking impact on Venmo offset logic
7. **aggregateByCategory** in Step3Dashboard.js: credits are skipped EXCEPT Rent (Bilt shows rent as credit)
8. **Transaction IDs**: backend uses `_id`, frontend sometimes uses `id` — always handle both

---

## Linear Integration

- Workspace: MyFinance
- API Key: stored in `.claude/linear.env` (never commit)
- Backlog items: `.claude/backlog/`
- PRDs: `.claude/prds/`

---

## Current Known Limitations

- Amazon transactions all categorized as Shopping (no item-level data)
- Unknown restaurant names (BKK, Land to Sea) default to 50% Misc. Spending
- Zelle always requires manual review (no memo available)
- No Plaid integration yet (manual PDF upload required)
- 401k not tracked (deferred until Plaid integration)