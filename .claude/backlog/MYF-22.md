---
id: MYF-22
title: Improve LLM cafe vs restaurant disambiguation for ambiguous Plaid merchants
type: bug
status: backlog
linear_url: https://linear.app/myfinance/issue/MYF-22/fix-plaid-mis-categorizations-cafes-classified-as-offering-churches-as
created: 2026-05-16
---

## What
Merchants that are actually cafes (Slow Bite, Land To Sea, Humble Donkey) get inconsistent or wrong classifications when Plaid returns `FOOD_AND_DRINK_RESTAURANT (LOW)`. "Slow Bite" was classified as "Offering" in one transaction and "Drinks/snacks" in another — same merchant, same Plaid data.

## Root Cause (confirmed from DB)
Verified from March 2026 DB data:
- All three merchants have `plaid_category_detailed = FOOD_AND_DRINK_RESTAURANT` at `LOW` confidence
- "In2 Onnuri Ch." and "Land To Sea" are actually fine — "Onnuri" is caught by `('in2 onnuri', 'Offering', 95)` Tier 0 pattern, and "Land To Sea" got "Drinks/snacks" correctly
- The real bug: "Slow Bite" appeared twice, got "Drinks/snacks" once and "Offering" once — pure LLM non-determinism / hallucination

**Why it happened:** Before commit `0ff50a3`, `FOOD_AND_DRINK_RESTAURANT (LOW)` was not trusted and went to LLM. The old prompt told LLM to use `plaid_hint` as a "strong signal" but the LLM still hallucinated "Offering" for "Slow Bite" in one batch. No logical path from "Slow Bite" + `FOOD_AND_DRINK_RESTAURANT` to "Offering" — it's a hallucination.

**Current state after `0ff50a3`:** `FOOD_AND_DRINK_RESTAURANT` is now in `PLAID_TRUSTED_AT_ANY_CONFIDENCE`, so LOW → "Dine out" deterministically. This fixes the hallucination but means ambiguous cafes always become "Dine out".

## The Hard Problem
`FOOD_AND_DRINK_RESTAURANT (LOW)` means Plaid doesn't have merchant-level data — it's guessing from signals. For genuinely ambiguous cafe names (no "cafe", "coffee", "boba", etc. in the description), there's no reliable text signal. The LLM must infer from name alone, and it will get maybe 70–80% right.

## Proposed Fix
Two changes to the LLM prompt in `categorizer.py`:

**1. Guardrail against hallucination** (high priority — prevents "Slow Bite → Offering"):
```
CRITICAL: if plaid_hint is FOOD_AND_DRINK_RESTAURANT or FOOD_AND_DRINK_FAST_FOOD,
the result MUST be Dine out or Drinks/snacks. Never Offering, Gift, Misc. Spending, etc.
```

**2. Amount-based disambiguation** (helps with cafe vs restaurant):
```
CAFE vs RESTAURANT (when plaid_hint is FOOD_AND_DRINK_RESTAURANT):
Use BOTH merchant name and transaction amount:
- Amount ≤ $15 → lean Drinks/snacks unless name is clearly a restaurant
- Amount ≥ $30 → lean Dine out unless name contains coffee/cafe/boba
- Amount $15–$30 → use name judgment
```

To enable this: remove `FOOD_AND_DRINK_RESTAURANT` and `FOOD_AND_DRINK_FAST_FOOD` from `PLAID_TRUSTED_AT_ANY_CONFIDENCE` so LOW confidence goes back to LLM (with the new guardrail + amount signal).

## Expected Outcome
- "Slow Bite" → never "Offering" again; likely "Drinks/snacks" if small amount, "Dine out" if larger
- Cafes with ambiguous names get ~70–80% accuracy (accept residual error, user corrects in dashboard)
- No hallucinations into unrelated categories (Offering, Gift, etc.) for food merchants

## Affected Files
- `backend/categorizer.py` — LLM prompt (add guardrail + amount hint), `PLAID_TRUSTED_AT_ANY_CONFIDENCE` (remove `FOOD_AND_DRINK_RESTAURANT`, `FOOD_AND_DRINK_FAST_FOOD`)
