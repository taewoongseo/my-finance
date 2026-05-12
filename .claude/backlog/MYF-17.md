---
id: MYF-17
title: Balancer misses Payment Thank You variants; emoji descriptions flagged for review
type: bug
status: backlog
linear_url: https://linear.app/myfinance/issue/MYF-17/balancer-misses-payment-thank-you-variants-emoji-descriptions-flagged
created: 2026-05-11
---

## What
Two bugs in the categorization/review pipeline: (1) "Payment Thank You - Web" and "Payment Thank You-Mobile" are not being auto-excluded by the balancer and appear in Step 2 review — they should be caught as CC payment keywords. (2) Transactions with emoji or non-ASCII in the description (e.g. 🎁, 상우선물) are flagged for manual review instead of being categorized with high confidence.

## Expected Outcome
1. Any description containing "payment thank you" (case-insensitive, with or without suffixes) is auto-excluded as a CC payment without appearing in Step 2 review.
2. Emoji-prefixed descriptions (🎁) and Korean gift descriptions (상우선물) are either stripped/normalized before LLM categorization or mapped directly to Gift without requiring manual review.
3. Apple transactions ≤ ~$20 are auto-categorized as Subscription; Apple transactions in the hundreds are categorized as Shopping (hardware).

## Affected Files
- `backend/balancer.py` — CC_PAYMENT_KEYWORDS matching logic for Payment Thank You variants
- `backend/categorizer.py` — pre-processing to strip or normalize emoji/non-ASCII from descriptions before sending to LLM

## Risks / Notes
- CC payment keyword matching may be doing exact substring match rather than contains — check case and punctuation handling
- Emoji/Korean stripping must only affect text sent to the LLM, not the stored description shown to the user
- 상우선물 = "Sangwoo gift" in Korean — the LLM should handle Korean but may not have enough context to confidently categorize it as Gift
- Apple charges ≤ ~$20 are almost certainly app/service subscriptions (e.g. $9.99, $11.97); Apple charges in the hundreds are likely hardware — the categorizer prompt or a pre-processing rule should use amount as a signal to assign Subscription vs. Shopping
