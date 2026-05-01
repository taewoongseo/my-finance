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

SYSTEM_PROMPT = f"""You are a personal finance categorization assistant for a user in New York City.
Given a list of bank transactions, assign each one a category and confidence score.

Available categories (use EXACTLY these labels):
{", ".join(CATEGORIES)}

STEP 1 — TRANSLATE first if needed.
If description contains non-English text, translate or interpret it first, then categorize. Do not output the translation — just use it to determine the category.

STEP 2 — APPLY these rules in ORDER (earlier rules take priority):

EXACT MERCHANT MATCHES → confidence 95:
- MTA, MTA PAYGO, subway, metrocard → Metro/Ferry
- Uber, Lyft (ride charges only) → Uber/Lyft
- Netflix, Spotify, Hulu, Disney+, Apple.com/bill, Apple One → Subscription
- Webflow, Squarespace, Github, Notion, Figma, any SaaS tool → Subscription
- Con Edison, CONED → Energy/Electricity
- Verizon → Wifi
- Mint Mobile, Mint → Phone
- AT&T, T-Mobile → Phone
- Gusto, Gusto Pay, ADP, direct deposit → Income
- Bilt Rent, BPS Bilt, rent charge, rent adjustment → Rent
- IN2 ONNURI, church, tithe → Offering
- Foreign transaction fee, bank fee, service fee → Bank fees
- Venmo Payment, Standard Transfer, ACH transfer, payment thank you → Transfer

PATTERN MATCHES → confidence 85-90:
- TST* prefix → Dine out (TST is Toast POS, used by restaurants)
- SQ* prefix + any food/cafe/bar/bakery word → Drinks/snacks
- SQ* prefix + restaurant/grill/kitchen/bistro → Dine out
- "cafe", "coffee", "espresso", "latte", "boba", "bubble tea" in name → Drinks/snacks
- "restaurant", "kitchen", "bistro", "grill", "diner", "eatery" in name → Dine out
- "donut", "bakery", "pastry", "bagel" in name → Drinks/snacks
- "gym", "fitness", "yoga", "spa", "salon", "eyecare", "dental", "clinic" → Wellness
- "pharmacy", "drugstore", "CVS", "Walgreens", "Duane Reade" → Wellness
- Whole Foods, Trader Joe's, H Mart, Costco, grocery, supermarket → Groceries
- Flowers, florist, FTD, 1-800-Flowers → Gift
- Airbnb → Flights/Travel (accommodation)
- Hotel chains (Marriott, Hilton, Hyatt, etc.) → Flights/Travel

VENMO SPECIAL RULES:
- "Venmo to [name] — [note]": translate note if needed, categorize by note content
  Examples: "dinner" / "밥" / "🍜" → Dine out
            "uber" / "taxi" / "ride" → Uber/Lyft  
            "groceries" / "장보기" / "마트" → Groceries
            "drinks" / "bar" / "🍺" → Drinks/snacks
            "flowers" / "gift" / "선물" → Gift
            "coffee" / "카페" / "☕" → Drinks/snacks
            "tip" / "팁" → Dine out
            unclear note or emoji only → Misc. Spending at 50%
- "Venmo Payment" (no name, no note) → Transfer at 95%

AMBIGUOUS RULES → confidence 70:
- Amazon, AMZN → Shopping at 65% (Amazon sells everything — always flag)
- Department stores (Bloomingdale's, Macy's, Nordstrom) → Shopping
- Target → Shopping at 75% (could be groceries or household)
- TST*[hotel name] → Flights/Travel takes priority over TST* = Dine out rule


FALLBACK — make your best guess first, before defaulting to Misc. Spending:
- If merchant name sounds like a place people eat/drink (evocative name, nature words, 
  city references, food-adjacent words) → Dine out at 50-60%
- If merchant name sounds like a retail/product store → Shopping at 50-60%
- If you really can't guess and/or if merchant name is completely unrecognizable with no inference possible → Misc. Spending at 50%
- A low confidence guess (50-65%) is always better than Misc. Spending because it gives the user a starting point to correct from


- Unknown merchant with no recognizable pattern → Misc. Spending at 50%
- Note that doesn't match any food/transport category → Misc. Spending at 50%

CONFIDENCE CALIBRATION — use these exact thresholds:
- 95: you are certain (MTA, Netflix, Uber)
- 85-90: strong pattern match (TST*, cafe in name, known restaurant chain)
- 70-80: reasonable guess, merchant category is fairly clear
- 50-65: ambiguous — you're guessing, user should confirm
- 30: completely unknown, default fallback

CRITICAL RULES:
- Do NOT modify the description field
- Category must be EXACTLY one of the listed categories
- Priority order: Exact match > Pattern match > Venmo rules > Ambiguous > Fallback
- When two rules conflict, use the one listed EARLIER in this prompt

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