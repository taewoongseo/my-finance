# PRD: Redesign categorization pipeline to minimize LLM usage

**Ticket:** MYF-20
**Status:** ✅ Complete
**Created:** 2026-05-14

---

## TL;DR
Every transaction — including MTA swipes, Netflix charges, Uber rides — is currently sent to GPT even though they could be categorized instantly with a string match. Redesign the pipeline into three tiers so deterministic cases never touch the LLM.

---

## Problem
`categorize_transactions()` sends 100% of transactions to GPT-4o-mini regardless of source (PDF, Venmo CSV, Plaid). Deterministic rules like "MTA → Metro/Ferry" and "Netflix → Subscription" exist only as instructions inside the LLM prompt, meaning we pay GPT to execute what is effectively a dictionary lookup on every single transaction.

---

## Solution
Three-tier categorization pipeline:

**Tier 0 — description pattern match (all sources)**
Move deterministic exact-merchant and keyword rules out of the LLM prompt and into `PRE_CATEGORIZE_PATTERNS` in Python code. Applies to PDF, Venmo debit, and Plaid transactions alike. Matches exit immediately — no LLM call.

**Tier 1 — Plaid personal_finance_category (Plaid only)**
For Plaid transactions, capture `personal_finance_category.detailed` and `confidence_level` from the API response. If confidence is `HIGH` or `VERY_HIGH` and the detailed label is in our `PLAID_CATEGORY_MAP`, categorize directly without LLM.

**Tier 2 — LLM fallback (everything else)**
Transactions that don't hit Tier 0 or Tier 1 go to GPT as today. Plaid transactions that fall through carry a `plaid_hint` field (the Plaid detailed label) in the payload so the LLM can use it as a signal for accuracy.

---

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | In `fetch_plaid_transactions` in `main.py`: add `include_personal_finance_category=True` to `TransactionsGetRequestOptions`; capture `personal_finance_category.detailed` as `plaid_category_detailed` and `confidence_level` as `plaid_category_confidence` on each returned transaction dict | ✅ Done |
| 2 | In `categorizer.py`, expand `PRE_CATEGORIZE_PATTERNS` with exact merchant matches (MTA/subway/metrocard, Uber/Lyft, Netflix/Spotify/Apple.com bill/Apple One, Notion/Figma/Github/Webflow, Con Edison/CONED, Verizon, Mint Mobile/AT&T/T-Mobile, Gusto/ADP, Bilt Rent/BPS Bilt, IN2 ONNURI/church/tithe) and keyword patterns (cafe/coffee/boba/bubble tea → Drinks/snacks; restaurant/kitchen/bistro/grill/diner → Dine out; gym/fitness/yoga/spa/salon → Wellness; pharmacy/CVS/Walgreens/Duane Reade → Wellness; H Mart/Trader Joe/Whole Foods/Costco/grocery → Groceries; TST* prefix → Dine out) | ✅ Done |
| 3 | In `categorizer.py`, add `PLAID_CATEGORY_MAP` dict mapping Plaid `detailed` values to our category labels: `FOOD_AND_DRINK_RESTAURANT` → Dine out, `FOOD_AND_DRINK_COFFEE` → Drinks/snacks, `FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR` → Drinks/snacks, `FOOD_AND_DRINK_FAST_FOOD` → Dine out, `FOOD_AND_DRINK_GROCERIES` → Groceries, `FOOD_AND_DRINK_VENDING_MACHINES` → Drinks/snacks, `TRANSPORTATION_TAXIS_AND_RIDE_SHARES` → Uber/Lyft, `TRANSPORTATION_PUBLIC_TRANSIT` → Metro/Ferry, `TRAVEL_FLIGHTS` → Flights/Travel, `TRAVEL_LODGING` → Flights/Travel, `TRAVEL_RENTAL_CARS` → Flights/Travel, `RENT_AND_UTILITIES_RENT` → Rent, `RENT_AND_UTILITIES_GAS_AND_ELECTRICITY` → Energy/Electricity, `RENT_AND_UTILITIES_INTERNET_AND_CABLE` → Wifi, `RENT_AND_UTILITIES_TELEPHONE` → Phone, `INCOME_WAGES` → Income, `INCOME_TAX_REFUND` → Income, `LOAN_PAYMENTS_CREDIT_CARD_PAYMENT` → Transfer, `BANK_FEES_ATM_FEES` → Bank fees, `BANK_FEES_FOREIGN_TRANSACTION_FEES` → Bank fees, `BANK_FEES_OTHER_BANK_FEES` → Bank fees, `PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS` → Wellness, `PERSONAL_CARE_HAIR_AND_BEAUTY` → Wellness, `GOVERNMENT_AND_NON_PROFIT_DONATIONS` → Offering | ✅ Done |
| 4 | In `categorize_chunk` in `categorizer.py`, add Tier 1 pre-pass after Tier 0: if transaction has `plaid_category_detailed` in `PLAID_CATEGORY_MAP` and `plaid_category_confidence` in `['VERY_HIGH', 'HIGH']`, assign mapped category at confidence 90, mark `needs_review=False`, skip LLM | ✅ Done |
| 5 | In `categorize_chunk`, for Plaid transactions falling through to LLM (MEDIUM/LOW/UNKNOWN confidence or unmapped label), include `plaid_hint` field in the slim payload sent to GPT; add one sentence to `SYSTEM_PROMPT` instructing the LLM to use `plaid_hint` as a signal when present | ✅ Done |
| 6 | Rewrite `SYSTEM_PROMPT` in `categorizer.py`: remove all exact merchant matches and keyword pattern rules now covered by Tier 0 and Tier 1; keep only rules that apply to genuine LLM fallthrough — ambiguous merchants (Amazon, Target, department stores), Venmo note classification, the `plaid_hint` instruction, fallback/confidence calibration guidance, and the output format spec | ✅ Done |

**Status legend:**
- ⬜ Not started
- 🟡 In progress
- ✅ Done
- ❌ Blocked

---

## Out of Scope
- Changing how Venmo received credits are classified (balancer Rule 4 handles those — they never reach the categorizer)
- Any frontend changes

---

## Files That Will Change
- `backend/main.py` — `fetch_plaid_transactions`: request personal_finance_category, add two fields to returned transaction dict
- `backend/categorizer.py` — expand `PRE_CATEGORIZE_PATTERNS` (Tier 0), add `PLAID_CATEGORY_MAP` (Tier 1), update `categorize_chunk` to run both pre-passes and pass `plaid_hint` to LLM fallthrough

---

## Open Questions
None.
