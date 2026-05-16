import pdfplumber
import json
import os
import pandas as pd
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """You are a financial data extraction assistant.
Extract ALL transactions from this bank statement text and return ONLY a JSON array.

Each transaction must have exactly these fields:
{
  "date": "YYYY-MM-DD",
  "description": "merchant or transaction name, cleaned up",
  "amount": 12.34,
  "type": "debit" or "credit"
}

Rules:
- amount is always a positive number
- type is "debit" if money left the account, "credit" if money came in
- INCLUDE all deposits, direct deposits, payroll, ACH credits — these are real transactions
- INCLUDE Gusto, ADP, payroll deposits even if they are large amounts
- SKIP transactions in "Payments and credits" sections — these are card payments not spending
- SKIP any transaction described only as "PAYMENT", "payment", or "balance transfer" with no merchant name
- Skip balance summaries, headers, totals — only individual transactions
- Return ONLY the JSON array, no explanation, no markdown
"""

def extract_text_from_pdf(pdf_path: str) -> str:
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text += page_text + "\n"

    # remove blank lines and strip whitespace — reduces token count
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    return '\n'.join(lines)

def parse_statement(pdf_path: str, account_name: str) -> list[dict]:
    raw_text = extract_text_from_pdf(pdf_path)

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Bank: {account_name}\n\n{raw_text}"}
            ],
            temperature=0,
        )

        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        transactions = json.loads(raw)

        for t in transactions:
            t["account"] = account_name

        return transactions

    except json.JSONDecodeError as e:
        print(f"[{account_name}] JSON parse error: {e}")
        return []
    except Exception as e:
        print(f"[{account_name}] Parse error: {e}")
        return []


def parse_venmo_csv(csv_path: str, account_name: str) -> list[dict]:
    df = pd.read_csv(
        csv_path,
        skiprows=2,  # skip first 2 junk rows
        quotechar='"',
        on_bad_lines='skip',
        engine='python',
    )
    df.columns = df.columns.str.strip()
    df = df.dropna(how='all')

    # drop the blank balance row (row where all transaction fields are empty)
    df = df[df['Datetime'].notna()]

    print(f"[Venmo] Columns: {list(df.columns)}")
    print(f"[Venmo] Shape: {df.shape}")

    transactions = []
    for _, row in df.iterrows():
        amount_str = str(row.get('Amount (total)', '')).strip()
        if not amount_str or amount_str == 'nan':
            continue

        is_credit = '+' in amount_str
        try:
            amount = float(
                amount_str.replace('$', '').replace(',', '')
                .replace('+', '').replace('-', '').strip()
            )
        except:
            continue

        if amount == 0:
            continue

        transaction_type = 'credit' if is_credit else 'debit'

        datetime_str = str(row.get('Datetime', ''))
        date = datetime_str[:10] if len(datetime_str) >= 10 else ''

        # first line only for multiline notes
        note = str(row.get('Note', '')).strip().split('\n')[0]
        if note == 'nan':
            note = ''

        sender = str(row.get('From', '')).strip()
        receiver = str(row.get('To', '')).strip()
        venmo_type = str(row.get('Type', '')).strip()
        is_transfer = venmo_type == 'Standard Transfer'

        if transaction_type == 'credit':
            description = f"Venmo from {sender}" + (f" — {note}" if note else '')
        elif venmo_type == 'Charge':
            # For charges, From/To are flipped: From = requester (money receiver), To = payer (account holder)
            description = f"Venmo to {sender}" + (f" — {note}" if note else '')
        else:
            description = f"Venmo to {receiver}" + (f" — {note}" if note else '')

        transactions.append({
            'date': date,
            'description': description,
            'amount': amount,
            'type': transaction_type,
            'account': account_name,
            'is_transfer': is_transfer,
            'raw_note': note,
        })

    return transactions


def parse_generic_csv(csv_path: str, account_name: str) -> list[dict]:
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        print(f"[{account_name}] CSV parse error: {e}")
        return []

    df.columns = df.columns.str.strip().str.lower()

    transactions = []
    for _, row in df.iterrows():
        date = str(
            row.get('transaction date') or
            row.get('date') or
            row.get('posting date') or ''
        ).strip()

        description = str(
            row.get('description') or
            row.get('merchant') or
            row.get('details') or ''
        ).strip()

        # safe amount extraction
        amount_raw = None
        for col in ['amount', 'debit', 'credit']:
            val = row.get(col)
            if val is not None and str(val).strip() not in ['', 'nan']:
                amount_raw = val
                break

        if amount_raw is None:
            continue

        try:
            amount = float(str(amount_raw).replace('$', '').replace(',', '').strip())
        except:
            continue

        if not description or description == 'nan':
            continue

        transaction_type = 'credit' if amount > 0 else 'debit'

        transactions.append({
            'date': date,
            'description': description,
            'amount': abs(amount),
            'type': transaction_type,
            'account': account_name,
            'is_transfer': False,
        })

    return transactions