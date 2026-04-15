import pdfplumber
import json
import os
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
- Skip balance summaries, headers, totals — only individual transactions
- Return ONLY the JSON array, no explanation, no markdown
"""

def extract_text_from_pdf(pdf_path: str) -> str:
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
            text += "\n"
    return text

def parse_statement(pdf_path: str, account_name: str) -> list[dict]:
    raw_text = extract_text_from_pdf(pdf_path)

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


import pandas as pd

def parse_venmo_csv(csv_path: str, account_name: str) -> list[dict]:
    # skip first 2 header rows venmo adds
    df = pd.read_csv(csv_path, skiprows=2)
    df.columns = df.columns.str.strip()
    
    transactions = []
    for _, row in df.iterrows():
        amount_str = str(row.get('Amount (total)', '')).strip()
        if not amount_str or amount_str == 'nan':
            continue
            
        # parse amount — venmo uses "+ $21.00" or "- $21.00"
        amount_str = amount_str.replace('$', '').replace(',', '').strip()
        try:
            amount = float(amount_str.replace(' ', '').replace('+', '').replace('-', ''))
        except:
            continue
            
        is_credit = '+' in str(row.get('Amount (total)', ''))
        transaction_type = 'credit' if is_credit else 'debit'
        
        # get date
        datetime_str = str(row.get('Datetime', ''))
        try:
            date = datetime_str[:10]  # just YYYY-MM-DD
        except:
            date = ''
            
        # note is the memo
        note = str(row.get('Note', '')).strip()
        sender = str(row.get('From', '')).strip()
        receiver = str(row.get('To', '')).strip()
        
        # build description
        if transaction_type == 'credit':
            description = f"Venmo from {sender}" + (f" — {note}" if note and note != 'nan' else '')
        else:
            description = f"Venmo to {receiver}" + (f" — {note}" if note and note != 'nan' else '')
        
        # flag standard transfers for auto-exclusion
        venmo_type = str(row.get('Type', '')).strip()
        is_transfer = venmo_type == 'Standard Transfer'
        
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
    """For bank CSVs like Chase — tries to auto-detect columns."""
    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.strip().str.lower()
    
    transactions = []
    for _, row in df.iterrows():
        # try common column names
        date = str(row.get('transaction date') or row.get('date') or row.get('posting date') or '').strip()
        description = str(row.get('description') or row.get('merchant') or row.get('details') or '').strip()
        amount_raw = row.get('amount') or row.get('debit') or 0
        
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