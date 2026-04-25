from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from dotenv import load_dotenv
from pdf_parser import parse_statement, parse_venmo_csv, parse_generic_csv
from categorizer import categorize_transactions
from balancer import balance_transactions
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import asyncio
import tempfile
import os
import json
import uvicorn

load_dotenv()

executor = ThreadPoolExecutor(max_workers=4)

def filter_by_month(transactions: list[dict], month: str) -> list[dict]:
    try:
        year, mon = map(int, month.split('-'))
    except:
        return transactions

    filtered = []
    for t in transactions:
        try:
            date_str = str(t.get('date', ''))
            if '-' in date_str:
                d = datetime.strptime(date_str[:10], '%Y-%m-%d')
            elif '/' in date_str:
                d = datetime.strptime(date_str[:10], '%m/%d/%Y')
            else:
                filtered.append(t)
                continue

            if d.year == year and d.month == mon:
                filtered.append(t)
        except:
            filtered.append(t)

    return filtered

def deduplicate_transactions(transactions: list[dict]) -> list[dict]:
    seen = set()
    unique = []
    for t in transactions:
        # key = date + amount + description + account
        key = (
            str(t.get('date', '')),
            str(t.get('amount', '')),
            str(t.get('description', '')).lower().strip(),
            str(t.get('account', '')),
        )
        if key not in seen:
            seen.add(key)
            unique.append(t)
        else:
            print(f"  [dedup] Removed duplicate: {t.get('description')} ${t.get('amount')} on {t.get('date')}")
    return unique

def parse_file_sync(tmp_path: str, ext: str, account_name: str, account_type: str, month: str) -> list[dict]:
    """Synchronous parse function — runs in thread executor."""
    try:
        if ext == '.pdf':
            transactions = parse_statement(tmp_path, account_name)
        elif ext == '.csv' and account_type == 'Venmo/Cash App':
            transactions = parse_venmo_csv(tmp_path, account_name)
        elif ext == '.csv':
            transactions = parse_generic_csv(tmp_path, account_name)
        else:
            transactions = []

        print(f"[{account_name}] Parsed {len(transactions)} transactions")
        if transactions:
            print(f"[{account_name}] Sample dates: {[t.get('date') for t in transactions[:3]]}")

        transactions = filter_by_month(transactions, month)
        # debug — show all transactions that survived filter
        for t in transactions:
            if 'gusto' in t.get('description', '').lower():
                print(f"GUSTO FOUND: {t}")
        print(f"All descriptions: {[t.get('description','')[:20] for t in transactions]}")
        print(f"[{account_name}] After filter: {len(transactions)} for {month}")
        return transactions

    except Exception as e:
        print(f"[{account_name}] Parse error: {e}")
        return []
    finally:
        try:
            os.unlink(tmp_path)
        except:
            pass

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "myfinance backend running"}

@app.post("/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    account_names: List[str] = Form(...),
    account_types: List[str] = Form(...),
    month: str = Form(...),
    savings_account_names: str = Form(default='[]'),
):
    savings_names = json.loads(savings_account_names)

    # read all files first (must be done in async context)
    file_infos = []
    for i, file in enumerate(files):
        account_name = account_names[i] if i < len(account_names) else file.filename
        account_type = account_types[i] if i < len(account_types) else 'Other'
        ext = os.path.splitext(file.filename)[1].lower()

        contents = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        file_infos.append((tmp_path, ext, account_name, account_type))

    # parse all files in parallel
    loop = asyncio.get_event_loop()
    tasks = [
        loop.run_in_executor(executor, parse_file_sync, tmp_path, ext, account_name, account_type, month)
        for tmp_path, ext, account_name, account_type in file_infos
    ]
    results = await asyncio.gather(*tasks)
    all_transactions = [t for sublist in results for t in sublist]  
    all_transactions = deduplicate_transactions(all_transactions)
    print(f"After dedup: {len(all_transactions)} unique transactions")

    # categorize
    to_categorize = [t for t in all_transactions if not t.get('is_transfer')]
    transfers = [t for t in all_transactions if t.get('is_transfer')]

    categorized = categorize_transactions(to_categorize) if to_categorize else []

    for t in transfers:
        t['category'] = 'Transfer'
        t['confidence'] = 100
        t['needs_review'] = False

    all_categorized = categorized + transfers

    # balance
    balanced = balance_transactions(all_categorized, savings_names)

    clean = balanced['clean']
    flagged = balanced['flagged']
    offsets = balanced['offsets']

    needs_review = [t for t in clean if t.get('needs_review')] + flagged
    auto_approved = [t for t in clean if not t.get('needs_review')]

    return {
        'transactions': clean,
        'needs_review': needs_review,
        'auto_approved': auto_approved,
        'offsets': offsets,
        'excluded': balanced['excluded'],
        'excluded_count': balanced['excluded_count'],
        'count': len(clean),
        'month': month,
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)