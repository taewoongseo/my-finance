from dotenv import load_dotenv
load_dotenv()

import os
from openai import OpenAI
from datetime import datetime

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

VENMO_FOOD_KEYWORDS = [
    'dinner', 'lunch', 'breakfast', 'food', 'eat', 'meal', 'pizza',
    'sushi', 'ramen', 'burger', 'coffee', 'drinks', 'bar', 'restaurant',
    'brunch', 'snack', 'boba', 'cafe', 'diner', 'bbq', 'taco', 'noodle',
]

VENMO_INCOME_KEYWORDS = [
    'rent', 'salary', 'paycheck', 'allowance', 'refund', 'reimbursement',
    'pay you back', 'owe', 'deposit',
]

CC_PAYMENT_KEYWORDS = [
    'payment thank you',
    'autopay',
    'payment to',
    'card payment',
    'online payment',
    'mobile payment',
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
    'card payment',
    'bilt payment',
]

KNOWN_SAVINGS_KEYWORDS = [
    'robinhood', 'fidelity', 'vanguard', 'schwab',
    'wealthfront', 'betterment', 'acorns', 'stash',
    'wirebarley', 'wise', 'guideline', '401k', '401(k)',
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

def classify_venmo_note_with_llm(note: str) -> str:
    if not note or note == 'nan':
        return 'unclear'

    note_lower = note.lower()
    if any(k in note_lower for k in VENMO_FOOD_KEYWORDS):
        return 'food'
    if any(k in note_lower for k in VENMO_INCOME_KEYWORDS):
        return 'income'

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": """You classify Venmo payment notes.
Return ONLY one word: 'food', 'income', or 'unclear'.
- 'food': note suggests splitting a meal, drinks, food, restaurant
- 'income': note suggests rent, salary, gift, general reimbursement
- 'unclear': cannot determine from note alone
Translate non-English text first, then classify."""
                },
                {"role": "user", "content": f"Venmo note: {note}"}
            ],
            temperature=0,
            max_tokens=10,
        )
        result = response.choices[0].message.content.strip().lower()
        if result in ['food', 'income', 'unclear']:
            return result
        return 'unclear'
    except:
        return 'unclear'

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
            print(f"  ONE-SIDED CC PAYMENT: {t['description']} ${t['amount']}")

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

    # ── RULE 4: Venmo received → offset or flag ──────────────
    for t in venmo_transactions:
        if t['_id'] in excluded_ids:
            continue
        if t['type'] != 'credit':
            continue

        note = t.get('raw_note', '') or t.get('description', '')
        classification = classify_venmo_note_with_llm(note)

        if classification == 'food':
            excluded_ids.add(t['_id'])
            offsets.append({
                **t,
                'offset_category': 'Dine out',
                'amount': -t['amount'],
            })
        elif classification == 'income':
            pass
        else:
            excluded_ids.add(t['_id'])
            flagged.append({
                **t,
                'flag_type': 'venmo_received',
                'flag_message': 'What was this Venmo payment for?',
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