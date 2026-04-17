from dotenv import load_dotenv
load_dotenv()

import os
import json
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

CONFIDENCE_THRESHOLD = 70
CHUNK_SIZE = 50

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

CATEGORY MAPPING RULES — follow strictly:
- TST* prefix = Dine out → confidence 85
- SQ* + cafe/coffee/bar/bakery = Drinks/snacks → confidence 85
- SQ* + restaurant/grill/kitchen = Dine out → confidence 85
- Any merchant with "cafe" in name = Drinks/snacks → confidence 90
- Any merchant with "restaurant/kitchen/bistro/grill/diner" = Dine out → confidence 90
- Any merchant with "donut/bakery/pastry" = Drinks/snacks → confidence 85
- Restaurants, fast food, dining = Dine out
- Coffee shops, juice bars, bubble tea = Drinks/snacks
- Uber, Lyft ride charges = Uber/Lyft → confidence 95
- MTA, MTA PAYGO, subway, metro card = Metro/Ferry → confidence 95
- Flights, hotels, airbnb, travel agencies = Flights/Travel
- Whole Foods, Trader Joes, H Mart, grocery stores = Groceries → confidence 90
- Amazon, AMZN, department stores, clothing = Shopping
- Netflix, Spotify, Apple.com/bill, Webflow, Squarespace, Github, Notion, any SaaS = Subscription → confidence 95
- Con Edison, CONED, electric, energy = Energy/Electricity → confidence 95
- Verizon, AT&T, T-Mobile, phone carrier = Phone → confidence 95
- Birthday gifts, flowers, florist = Gift
- Church, tithe, IN2 ONNURI, donation = Offering → confidence 90
- Foreign transaction fee, bank fee = Bank fees → confidence 95
- Payroll, direct deposit, salary = Income → confidence 95
- Venmo Payment, Standard Transfer, payment thank you, ACH transfer = Transfer
- "Venmo to [name]" transactions are real spending, NOT transfers
- Categorize based on the note: 
  "Venmo to Jake — dinner" = Dine out
  "Venmo to florist — flowers" = Gift
  "Venmo to friend — uber" = Uber/Lyft
- ONLY mark as Transfer if it explicitly says "Venmo Payment" or "Standard Transfer"
- Books, music, movies, museums = Hobbies
- Gym, spa, salon, skincare, eyecare, medical, dental, vision = Wellness
- Home insurance, renters insurance ONLY = Home Insurance
- Bilt Rent, BPS Bilt, rent charge, rent adjustment = Rent → confidence 95
  (these are rent payments NOT transfers, even though they say "Bilt")
- Woori Jip, Korean restaurant names = Dine out → confidence 85

CONFIDENCE SCORING:
- 95-100: exact known merchant or pattern (MTA, Netflix, Uber, Verizon)
- 85-94: clear pattern match (TST*, cafe in name, known restaurant)
- 70-84: fairly clear merchant category
- 50-69: ambiguous — unknown merchant name
- Below 50: completely unknown

CRITICAL RULES:
- Do NOT modify description field under any circumstances
- Category must be EXACTLY one of the listed categories
- If unsure, use Misc. Spending with low confidence

You will receive a JSON array where each item has an "i" index field.
Return ONLY a JSON array of the same length. Each item must have exactly three fields:
- "i": the same index number from the input
- "category": exactly one of the categories above
- "confidence": 0-100

No explanation, no markdown."""

def categorize_chunk(chunk: list[dict]) -> list[dict]:
    slim = [
        {
            'i': i,
            'description': t.get('description', ''),
            'amount': t.get('amount', 0),
            'type': t.get('type', 'debit'),
        }
        for i, t in enumerate(chunk)
    ]

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(slim)}
            ],
            temperature=0,
        )

        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        llm_results = json.loads(raw)

        # build lookup by 'i' field
        result_map = {}
        for r in llm_results:
            idx = r.get('i')
            if idx is not None:
                result_map[idx] = r

        print(f"  result_map keys: {sorted(result_map.keys())[:5]}...")

        categorized = []
        for i, original in enumerate(chunk):
            llm = result_map.get(i, {})
            category = llm.get('category', 'Misc. Spending')
            confidence = llm.get('confidence', 30)
            print(f"  {original.get('description', '')[:30]} → {category} ({confidence}%)")

            if category not in CATEGORIES:
                category = 'Misc. Spending'
                confidence = 30
            categorized.append({
                **original,
                'category': category,
                'confidence': confidence,
                'needs_review': confidence < CONFIDENCE_THRESHOLD,
            })

        return categorized

    except json.JSONDecodeError as e:
        print(f"Categorization JSON error: {e}")
        return [{**t, 'category': 'Misc. Spending', 'confidence': 30, 'needs_review': True} for t in chunk]
    except Exception as e:
        print(f"Categorization error: {e}")
        return [{**t, 'category': 'Misc. Spending', 'confidence': 30, 'needs_review': True} for t in chunk]


def categorize_transactions(transactions: list[dict]) -> list[dict]:
    if not transactions:
        return []

    all_categorized = []
    for i in range(0, len(transactions), CHUNK_SIZE):
        chunk = transactions[i:i + CHUNK_SIZE]
        print(f"Categorizing chunk {i//CHUNK_SIZE + 1} ({len(chunk)} transactions)...")
        result = categorize_chunk(chunk)
        all_categorized.extend(result)

    return all_categorized