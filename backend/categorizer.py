from dotenv import load_dotenv
load_dotenv()

import os
import json
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

CONFIDENCE_THRESHOLD = 70
CHUNK_SIZE = 50

# Patterns applied before LLM — (substring, category, confidence)
# Matched case-insensitively against description. Order matters: first match wins.
PRE_CATEGORIZE_PATTERNS = [
    # ── Emoji / Korean (case-sensitive) ──────────────────────
    ('🎁', 'Gift', 95),
    ('선물', 'Gift', 95),

    # ── Transit ───────────────────────────────────────────────
    ('mta', 'Metro/Ferry', 95),
    ('metrocard', 'Metro/Ferry', 95),

    # ── Ride share ────────────────────────────────────────────
    ('uber', 'Uber/Lyft', 95),
    ('lyft', 'Uber/Lyft', 95),

    # ── Subscriptions ─────────────────────────────────────────
    ('netflix', 'Subscription', 95),
    ('spotify', 'Subscription', 95),
    ('hulu', 'Subscription', 95),
    ('disney+', 'Subscription', 95),
    ('apple.com/bill', 'Subscription', 95),
    ('apple one', 'Subscription', 95),
    ('notion', 'Subscription', 95),
    ('figma', 'Subscription', 95),
    ('github', 'Subscription', 95),
    ('webflow', 'Subscription', 95),
    ('squarespace', 'Subscription', 95),

    # ── Utilities ─────────────────────────────────────────────
    ('con edison', 'Energy/Electricity', 95),
    ('coned', 'Energy/Electricity', 95),
    ('verizon', 'Wifi', 95),
    ('mint mobile', 'Phone', 95),
    ('at&t', 'Phone', 95),
    ('t-mobile', 'Phone', 95),

    # ── Income ────────────────────────────────────────────────
    ('gusto', 'Income', 95),
    ('adp', 'Income', 95),

    # ── Rent ──────────────────────────────────────────────────
    ('bilt rent', 'Rent', 95),
    ('bps bilt', 'Rent', 95),

    # ── Gift (occasions) ──────────────────────────────────────
    ('birthday', 'Gift', 90),
    ('bday', 'Gift', 90),
    ('housewarming', 'Gift', 90),
    ('anniversary', 'Gift', 88),
    ('wedding', 'Gift', 90),
    ('graduation', 'Gift', 90),
    ('baby shower', 'Gift', 90),
    ('생일', 'Gift', 90),   # birthday
    ('결혼', 'Gift', 90),   # wedding
    ('졸업', 'Gift', 90),   # graduation
    ('새집', 'Gift', 90),   # housewarming

    # ── Offering ──────────────────────────────────────────────
    ('in2 onnuri', 'Offering', 95),
    ('church', 'Offering', 90),
    ('tithe', 'Offering', 95),

    # ── Groceries ─────────────────────────────────────────────
    ('h mart', 'Groceries', 90),
    ('hmart', 'Groceries', 90),
    ('trader joe', 'Groceries', 90),
    ('whole foods', 'Groceries', 90),
    ('costco', 'Groceries', 90),
    ('grocery', 'Groceries', 85),
    ('groceries', 'Groceries', 85),
    ('supermarket', 'Groceries', 85),

    # ── Dine out (keyword patterns) ───────────────────────────
    ('tst*', 'Dine out', 90),
    ('restaurant', 'Dine out', 85),
    ('kitchen', 'Dine out', 85),
    ('bistro', 'Dine out', 85),
    ('grill', 'Dine out', 85),
    ('diner', 'Dine out', 85),
    ('eatery', 'Dine out', 85),
    ('trattoria', 'Dine out', 85),
    ('steakhouse', 'Dine out', 85),

    # ── Drinks/snacks (keyword patterns) ─────────────────────
    ('cafe', 'Drinks/snacks', 85),
    ('coffee', 'Drinks/snacks', 85),
    ('espresso', 'Drinks/snacks', 85),
    ('latte', 'Drinks/snacks', 85),
    ('boba', 'Drinks/snacks', 85),
    ('bubble tea', 'Drinks/snacks', 85),
    ('donut', 'Drinks/snacks', 85),
    ('bakery', 'Drinks/snacks', 85),
    ('bagel', 'Drinks/snacks', 85),

    # ── Wellness ──────────────────────────────────────────────
    ('gym', 'Wellness', 85),
    ('fitness', 'Wellness', 85),
    ('yoga', 'Wellness', 85),
    (' spa', 'Wellness', 85),
    ('salon', 'Wellness', 85),
    ('pharmacy', 'Wellness', 85),
    ('cvs', 'Wellness', 85),
    ('walgreens', 'Wellness', 85),
    ('duane reade', 'Wellness', 85),
]


# Plaid personal_finance_category.detailed → our category (Tier 1)
# Only unambiguous mappings. Anything not listed falls through to LLM.
PLAID_CATEGORY_MAP = {
    'FOOD_AND_DRINK_RESTAURANT':            'Dine out',
    'FOOD_AND_DRINK_FAST_FOOD':             'Dine out',
    'FOOD_AND_DRINK_COFFEE':                'Drinks/snacks',
    'FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR':  'Drinks/snacks',
    'FOOD_AND_DRINK_VENDING_MACHINES':      'Drinks/snacks',
    'FOOD_AND_DRINK_GROCERIES':             'Groceries',
    'TRANSPORTATION_TAXIS_AND_RIDE_SHARES': 'Uber/Lyft',
    'TRANSPORTATION_PUBLIC_TRANSIT':        'Metro/Ferry',
    'TRAVEL_FLIGHTS':                       'Flights/Travel',
    'TRAVEL_LODGING':                       'Flights/Travel',
    'TRAVEL_RENTAL_CARS':                   'Flights/Travel',
    'RENT_AND_UTILITIES_RENT':              'Rent',
    'RENT_AND_UTILITIES_GAS_AND_ELECTRICITY': 'Energy/Electricity',
    'RENT_AND_UTILITIES_INTERNET_AND_CABLE':  'Wifi',
    'RENT_AND_UTILITIES_TELEPHONE':         'Phone',
    'INCOME_WAGES':                         'Income',
    'INCOME_TAX_REFUND':                    'Income',
    'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT':    'Transfer',
    'BANK_FEES_ATM_FEES':                   'Bank fees',
    'BANK_FEES_FOREIGN_TRANSACTION_FEES':   'Bank fees',
    'BANK_FEES_OTHER_BANK_FEES':            'Bank fees',
    'PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS': 'Wellness',
    'PERSONAL_CARE_HAIR_AND_BEAUTY':        'Wellness',
    'GOVERNMENT_AND_NON_PROFIT_DONATIONS':  'Offering',
}

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
Transactions reaching you have already been filtered — common merchants and obvious keyword matches are pre-categorized. You only see ambiguous or unrecognized transactions.

Available categories (use EXACTLY these labels):
{", ".join(CATEGORIES)}

TRANSLATE first if needed.
If any part of the description is non-English, translate it to English internally before applying any rule below. Do not output the translation.

RULES (apply in order, first match wins):

SQ* PREFIX (Square POS) → confidence 85:
- SQ* + any food/cafe/bar/bakery/drink word → Drinks/snacks
- SQ* + restaurant/grill/kitchen/bistro → Dine out
- SQ* with no recognizable food word → Shopping at 70%

REMAINING PATTERN MATCHES → confidence 85-90:
- "eyecare", "dental", "clinic", "urgent care", "drugstore" → Wellness
- "pastry" → Drinks/snacks
- Flowers, florist, FTD, 1-800-Flowers → Gift
- Airbnb → Flights/Travel
- Hotel chains (Marriott, Hilton, Hyatt, Sheraton, etc.) → Flights/Travel
- Foreign transaction fee, bank fee, service fee → Bank fees
- Venmo Payment, Standard Transfer, ACH transfer → Transfer
- A description that is exactly or nearly "Payment" or "Online Payment" with no merchant context → Transfer at 90%

VENMO DEBIT NOTES — the note follows the last dash in the description. Translate first, then match:
- dinner, lunch, meal, food, eating → Dine out
- uber, taxi, cab, ride → Uber/Lyft
- groceries, grocery, supermarket, market → Groceries
- drinks, bar, alcohol, beer, wine → Drinks/snacks
- coffee, cafe, boba, tea → Drinks/snacks
- gift, present, flowers, birthday, bday, housewarming, anniversary, wedding, graduation, baby shower → Gift
- tip → Dine out
- rent, bill split → Rent
- unclear note or emoji only → Misc. Spending at 50%
- "Venmo Payment" with no name or note → Transfer at 95%

AMBIGUOUS MERCHANTS:
- Amazon, AMZN → Shopping at 65% (sells everything — always flag)
- Target → Shopping at 75%
- Department stores (Bloomingdale's, Macy's, Nordstrom) → Shopping at 80%
- Any SaaS/software tool not already categorized → Subscription at 75%

PLAID HINT:
- If a "plaid_hint" field is present, use it as a strong signal. Apply your own judgment if it seems too broad.

FALLBACK — always make a best guess before using Misc. Spending:
- Name evokes eating/drinking (nature words, city names, food-adjacent) → Dine out at 55%
- Name evokes retail/products → Shopping at 55%
- Completely unrecognizable → Misc. Spending at 50%
- A low-confidence guess is always better than Misc. Spending — it gives the user a starting point

CONFIDENCE CALIBRATION:
- 90-95: strong pattern or known merchant type
- 70-85: reasonable inference, category is fairly clear
- 50-65: ambiguous — user should confirm
- 30: truly unknown

CRITICAL:
- Do NOT modify the description field
- Category must be EXACTLY one of the listed categories

You will receive a JSON array where each item has an "i" index field.
Return ONLY a JSON array of the same length. Each item must have exactly three fields:
- "i": the same index number from the input
- "category": exactly one of the categories above
- "confidence": 0-100

No explanation, no markdown."""

def categorize_chunk(chunk: list[dict]) -> list[dict]:
    pre_results = {}
    llm_indices = []

    for i, t in enumerate(chunk):
        desc = t.get('description', '')
        desc_lower = desc.lower()
        matched = False
        for pattern, category, confidence in PRE_CATEGORIZE_PATTERNS:
            if pattern in desc_lower:
                pre_results[i] = (category, confidence)
                print(f"  [T0] {desc[:30]} → {category} ({confidence}%)")
                matched = True
                break
        if not matched:
            # Tier 1: Plaid personal_finance_category
            plaid_detailed = t.get('plaid_category_detailed')
            plaid_confidence = t.get('plaid_category_confidence')
            if (plaid_detailed and
                    plaid_confidence in ('VERY_HIGH', 'HIGH') and
                    plaid_detailed in PLAID_CATEGORY_MAP):
                category = PLAID_CATEGORY_MAP[plaid_detailed]
                pre_results[i] = (category, 90)
                print(f"  [T1] {desc[:30]} → {category} (plaid: {plaid_detailed})")
            else:
                llm_indices.append(i)

    def _slim_entry(i):
        t = chunk[i]
        entry = {
            'i': i,
            'description': t.get('description', ''),
            'amount': t.get('amount', 0),
            'type': t.get('type', 'debit'),
        }
        plaid_hint = t.get('plaid_category_detailed')
        if plaid_hint:
            entry['plaid_hint'] = plaid_hint
        return entry

    slim = [_slim_entry(i) for i in llm_indices]

    llm_result_map = {}
    if slim:
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

            for r in llm_results:
                idx = r.get('i')
                if idx is not None:
                    llm_result_map[idx] = r

            print(f"  llm result_map keys: {sorted(llm_result_map.keys())[:5]}...")

        except json.JSONDecodeError as e:
            print(f"Categorization JSON error: {e}")
        except Exception as e:
            print(f"Categorization error: {e}")

    categorized = []
    for i, original in enumerate(chunk):
        if i in pre_results:
            category, confidence = pre_results[i]
        else:
            llm = llm_result_map.get(i, {})
            category = llm.get('category', 'Misc. Spending')
            confidence = llm.get('confidence', 30)
            if category not in CATEGORIES:
                category = 'Misc. Spending'
                confidence = 30
        print(f"  {original.get('description', '')[:30]} → {category} ({confidence}%)")
        categorized.append({
            **original,
            'category': category,
            'confidence': confidence,
            'needs_review': confidence < CONFIDENCE_THRESHOLD,
        })

    return categorized


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