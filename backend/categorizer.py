from dotenv import load_dotenv
load_dotenv()

import os
import json
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

CATEGORIES = [
    "Rent", "Home Insurance",
    "Groceries", "Dine out", "Drinks/snacks",
    "Uber/Lyft", "Metro/Ferry", "Flights/Travel",
    "Energy/Electricity", "Wifi", "Phone", "Household misc.", "Subscription",
    "Shopping", "Hobbies", "Wellness",
    "Offering", "Gift",
    "Misc. Spending", "Bank fees",
    "Income", "Transfer"
]

SYSTEM_PROMPT = f"""You are a personal finance categorization assistant.
Given a list of bank transactions, assign each one a category and confidence score.

Available categories (use EXACTLY these labels):
{", ".join(CATEGORIES)}

CATEGORY MAPPING RULES:
- Restaurants, fast food, dining, TST*, Sunday* = Dine out
- Coffee shops, juice bars, bubble tea, SQ* cafe = Drinks/snacks
- Uber, Lyft ride charges = Uber/Lyft
- MTA, subway, metro, ferry = Metro/Ferry
- Flights, hotels, airbnb, travel = Flights/Travel
- Whole Foods, Trader Joes, H Mart, grocery stores = Groceries
- Amazon, AMZN, department stores = Shopping
- Netflix, Spotify, Apple.com/bill, subscriptions = Subscription
- Con Edison, electric, energy bills = Energy/Electricity
- Birthday gifts, flowers, florist, presents = Gift
- Church, tithe, donation = Offering
- Foreign transaction fee, bank fee, service fee = Bank fees
- Payroll, direct deposit, salary = Income
- Venmo transfer, zelle, payment thank you = Transfer
- Books, music, movies, museums = Hobbies
- Gym, spa, salon, skincare, eyecare, medical, dental, vision = Wellness
- Home insurance, renters insurance ONLY = Home Insurance
  (NOT medical/vision/dental — those are Wellness)

CONFIDENCE SCORING — be conservative:
- 90-100: extremely obvious (Netflix, Uber, MTA)
- 75-89: fairly clear merchant name
- 50-74: ambiguous — use for TST*, SQ*, foreign text, unclear merchants
- Below 50: unknown merchant

CRITICAL RULES:
- Do NOT modify description field under any circumstances
- Category must be EXACTLY one of the listed categories
- If unsure, use Misc. Spending with low confidence

Return ONLY a JSON array with all original fields plus:
- "category": exactly one of the categories above
- "confidence": 0-100

No explanation, no markdown."""

def categorize_transactions(transactions: list[dict]) -> list[dict]:
    if not transactions:
        return []

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(transactions)}
        ],
        temperature=0,
    )

    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    llm_results = json.loads(raw)

    # merge: original data wins for everything except category + confidence
    categorized = []
    for i, original in enumerate(transactions):
        llm = llm_results[i] if i < len(llm_results) else {}
        category = llm.get('category', 'Misc. Spending')
        confidence = llm.get('confidence', 30)
        if category not in CATEGORIES:
            category = 'Misc. Spending'
            confidence = 30
        categorized.append({
            **original,          # ← original always wins, Korean preserved
            'category': category,
            'confidence': confidence,
            'needs_review': confidence < 85,
        })

    return categorized