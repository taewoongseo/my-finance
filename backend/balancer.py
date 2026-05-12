from dotenv import load_dotenv
load_dotenv()

import os
import json
from openai import OpenAI
from datetime import datetime

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

VENMO_FOOD_KEYWORDS = [
    'dinner', 'lunch', 'breakfast', 'food', 'eat', 'meal', 'pizza',
    'sushi', 'ramen', 'burger', 'restaurant', 'brunch', 'diner',
    'bbq', 'taco', 'noodle', 'korean bbq', 'hotpot',
]

VENMO_DRINKS_KEYWORDS = [
    'coffee', 'drinks', 'bar', 'boba', 'cafe', 'snack', 'snacks',
    'bubble tea', 'juice', 'latte', 'beer', 'wine',
]

VENMO_GROCERY_KEYWORDS = [
    'hmart', 'h mart', 'grocery', 'groceries', 'trader joe', 
    'whole foods', 'costco', 'supermarket',
]

CC_PAYMENT_KEYWORDS = [
    'payment thank you',
    'autopay',
    'payment to',
    'card payment',
    'online payment',
    'mobile payment',
    'balance transfer',
    'acct payment',
    'bilt payment',
]

ONE_SIDED_PAYMENT_KEYWORDS = [
    'payment to chase',
    'payment to bilt',
    'payment to amex',
    'payment to american express',
    'payment to citi',
    'payment to discover',
    'payment to capital one',
    'card ending',
    'bilt payment',
    'bps bilt',
    'rent payment',
    'bilt card',          
    'bilt rent',          
]

KNOWN_SAVINGS_KEYWORDS = [
    'robinhood', 'fidelity', 'vanguard', 'schwab',
    'wealthfront', 'betterment', 'acorns', 'stash',
    'guideline', '401k', '401(k)',
    'americanexpress',
]

def dates_within_days(date1_str: str, date2_str: str, days: int = 3) -> bool:
    try:
        d1, d2 = None, None
        for fmt in ['%Y-%m-%d', '%m/%d/%Y']:
            try:
                d1 = datetime.strptime(date1_str[:10], fmt)
                break
            except: continue
        for fmt in ['%Y-%m-%d', '%m/%d/%Y']:
            try:
                d2 = datetime.strptime(date2_str[:10], fmt)
                break
            except: continue
        if d1 and d2:
            return abs((d1 - d2).days) <= days
        return False
    except:
        return False

def amounts_match(a1: float, a2: float, tolerance: float = 1.0) -> bool:
    return abs(a1 - a2) <= tolerance

def classify_venmo_notes_batch(notes: list[str]) -> list[str]:
    """
    Classify multiple Venmo notes in ONE LLM call.
    Returns list of 'food', 'drinks', or 'unclear' for each note.
    food   → offset Dine out
    drinks → offset Drinks/snacks
    unclear → flag for human review
    """
    if not notes:
        return []

    results = []
    needs_llm = []
    needs_llm_idx = []

    # first pass — keyword matching, no API needed
    for i, note in enumerate(notes):
        if not note or note == 'nan':
            results.append('unclear')
            continue
        note_lower = note.lower()
        if any(k in note_lower for k in VENMO_FOOD_KEYWORDS):
            results.append('food')
        elif any(k in note_lower for k in VENMO_DRINKS_KEYWORDS):
            results.append('drinks')
        elif any(k in note_lower for k in VENMO_GROCERY_KEYWORDS):
            results.append('groceries')
        else:
            results.append(None)
            needs_llm.append(note)
            needs_llm_idx.append(i)

    # second pass — batch LLM for ambiguous ones
    if needs_llm:
        try:
            notes_list = "\n".join([f"{i+1}. {n}" for i, n in enumerate(needs_llm)])
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """Classify each Venmo note. Someone paid the user — what was it for?
Return ONLY a JSON array of strings, same length as input.
Each string must be exactly 'food', 'drinks', or 'unclear'.
- 'food': splitting a meal, restaurant, dining
- 'drinks': coffee, boba, bubble tea, bar drinks, snacks, cafe
- 'unclear': anything else — gifts, unclear, non-food related
Translate non-English text first, then classify.
Example: ["food", "drinks", "unclear"]"""
                    },
                    {"role": "user", "content": notes_list}
                ],
                temperature=0,
                max_tokens=200,
            )
            raw = response.choices[0].message.content.strip()
            raw = raw.replace("```json", "").replace("```", "").strip()
            llm_results = json.loads(raw)

            for i, idx in enumerate(needs_llm_idx):
                r = llm_results[i] if i < len(llm_results) else 'unclear'
                results[idx] = r if r in ['food', 'drinks', 'unclear'] else 'unclear'
        except Exception as e:
            print(f"Venmo classification error: {e}")
            for idx in needs_llm_idx:
                results[idx] = 'unclear'

    return results

def balance_transactions(transactions: list[dict], savings_account_names: list[str] = []) -> dict:
    excluded = []
    flagged = []
    offsets = []
    excluded_ids = set()

    savings_names_lower = [s.lower() for s in savings_account_names if len(s) > 3]

    # assign stable ids
    for i, t in enumerate(transactions):
        t['_id'] = i

    # ── group by account type upfront ────────────────────────
    credits = [t for t in transactions if t['type'] == 'credit']
    debits = [t for t in transactions if t['type'] == 'debit']
    venmo_transactions = [t for t in transactions if 'venmo' in t['account'].lower()]
    checking_transactions = [t for t in transactions if 'checking' in t['account'].lower()]

    # ── RULE 1: CC payment pairs ──────────────────────────────
    for credit in credits:
        if credit['_id'] in excluded_ids:
            continue
        desc_lower = credit['description'].lower()
        if not any(k in desc_lower for k in CC_PAYMENT_KEYWORDS):
            continue

        for debit in debits:
            if debit['_id'] in excluded_ids:
                continue
            if debit['account'] == credit['account']:
                continue
            if (amounts_match(credit['amount'], debit['amount']) and
                    dates_within_days(credit['date'], debit['date'], 5)):
                excluded_ids.add(credit['_id'])
                excluded_ids.add(debit['_id'])
                excluded.append({
                    'reason': 'CC payment pair',
                    'transactions': [credit, debit]
                })
                print(f"  Rule1 caught: {credit['description']} ${credit['amount']} id={credit['_id']} + {debit['description']} ${debit['amount']} id={debit['_id']}")
                break
                break

    # ── RULE 1b: One-sided CC payment from checking ───────────
    for t in checking_transactions:
        if t['_id'] in excluded_ids:
            continue
        if t['type'] != 'debit':
            continue
        desc_lower = t['description'].lower()
        if any(k in desc_lower for k in ONE_SIDED_PAYMENT_KEYWORDS):
            excluded_ids.add(t['_id'])
            excluded.append({
                'reason': 'CC payment from checking (one-sided)',
                'transactions': [t]
            })
            print(f"  1b caught: {t['description']} ${t['amount']} id={t['_id']}")
            

    # ── RULE 1c: Unpaired CC payment credits ─────────────────
    # Credits with CC_PAYMENT_KEYWORDS that had no matching debit are still auto-excluded.
    # "Payment Thank You - Web", "Payment Thank You-Mobile", etc. are always CC payments.
    for credit in credits:
        if credit['_id'] in excluded_ids:
            continue
        desc_lower = credit['description'].lower()
        if any(k in desc_lower for k in CC_PAYMENT_KEYWORDS):
            excluded_ids.add(credit['_id'])
            excluded.append({
                'reason': 'CC payment (unpaired)',
                'transactions': [credit]
            })
            print(f"  1c caught: {credit['description']} ${credit['amount']} id={credit['_id']}")

    # ── RULE 2: Venmo funding from checking ──────────────────
    for t in checking_transactions:
        if t['_id'] in excluded_ids:
            continue
        desc_lower = t['description'].lower()
        if 'venmo' in desc_lower and t['type'] == 'debit':
            excluded_ids.add(t['_id'])
            excluded.append({
                'reason': 'Venmo funding from checking',
                'transactions': [t]
            })

    # ── RULE 3: Venmo cashout to checking ────────────────────
    for t in venmo_transactions:
        if t['_id'] in excluded_ids:
            continue
        if t.get('is_transfer') or 'standard transfer' in t['description'].lower():
            excluded_ids.add(t['_id'])
            for ct in checking_transactions:
                if ct['_id'] in excluded_ids:
                    continue
                if (ct['type'] == 'credit' and
                        amounts_match(t['amount'], ct['amount']) and
                        dates_within_days(t['date'], ct['date'], 3)):
                    excluded_ids.add(ct['_id'])
                    excluded.append({
                        'reason': 'Venmo cashout pair',
                        'transactions': [t, ct]
                    })
                    break
            else:
                excluded.append({
                    'reason': 'Venmo cashout',
                    'transactions': [t]
                })

    # ── RULE 4: Venmo received → batch classify ───────────────
    venmo_credits = [
        t for t in venmo_transactions
        if t['_id'] not in excluded_ids and t['type'] == 'credit'
    ]

    if venmo_credits:
        notes = [t.get('raw_note', '') or '' for t in venmo_credits]
        classifications = classify_venmo_notes_batch(notes)

        for t, classification in zip(venmo_credits, classifications):
            excluded_ids.add(t['_id'])
            note = t.get('raw_note', '') or ''
            note_display = f" · {note}" if note and note != 'nan' else ''

            if classification == 'food':
                offsets.append({
                    **t,
                    'offset_category': 'Dine out',
                    'amount': -t['amount'],
                })
            elif classification == 'drinks':
                offsets.append({
                    **t,
                    'offset_category': 'Drinks/snacks',
                    'amount': -t['amount'],
                })
            elif classification == 'groceries':
                offsets.append({
                    **t,
                    'offset_category': 'Groceries',
                    'amount': -t['amount'],
                })
            else:
                flagged.append({
                    **t,
                    'flag_type': 'venmo_received',
                    'flag_message': f"What did they pay you for?{note_display}",
                })

    # ── RULE 5: Zelle → always flag ──────────────────────────
    for t in transactions:
        if t['_id'] in excluded_ids:
            continue
        desc_lower = t['description'].lower()
        if 'zelle' not in desc_lower:
            continue

        excluded_ids.add(t['_id'])
        is_incoming = 'from' in desc_lower or t['type'] == 'credit'

        flagged.append({
            **t,
            'flag_type': 'zelle',
            'flag_message': f"What was this Zelle {'payment you received' if is_incoming else 'payment'} for?",
        })

    # ── RULE 6: Savings/investment transfers ─────────────────
    for t in transactions:
        if t['_id'] in excluded_ids:
            continue
        if t['type'] != 'debit':
            continue

        desc_lower = t['description'].lower()
        matched_savings = any(s in desc_lower for s in savings_names_lower)
        matched_keyword = any(k in desc_lower for k in KNOWN_SAVINGS_KEYWORDS)

        if matched_savings or matched_keyword:
            excluded_ids.add(t['_id'])
            excluded.append({
                'reason': 'Savings/investment transfer',
                'transactions': [t]
            })

    # ── Debug summary ─────────────────────────────────────────
    print(f"\n=== BALANCER SUMMARY ===")
    print(f"Total in: {len(transactions)}")
    print(f"Excluded: {len(excluded_ids)}")
    for e in excluded:
        reason = e['reason']
        descs = [t['description'][:40] for t in e['transactions']]
        print(f"  [{reason}] {descs}")
    print(f"Flagged: {len(flagged)}")
    for f in flagged:
        print(f"  [{f['flag_type']}] {f['description'][:40]}")
    print(f"Offsets: {len(offsets)}")
    for o in offsets:
        print(f"  [offset → {o['offset_category']}] {o['description'][:40]} ${abs(o['amount'])}")
    print(f"Clean: {len([t for t in transactions if t['_id'] not in excluded_ids])}")
    print(f"========================\n")

    # ── Build clean list ──────────────────────────────────────
    clean = [t for t in transactions if t['_id'] not in excluded_ids]

    return {
        'clean': clean,
        'offsets': offsets,
        'excluded': excluded,
        'flagged': flagged,
        'excluded_count': len(excluded),
    }