from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from dotenv import load_dotenv
from pdf_parser import parse_statement, parse_venmo_csv, parse_generic_csv
from categorizer import categorize_transactions
from balancer import balance_transactions
from datetime import datetime
import tempfile, os, uvicorn

load_dotenv()

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
    import json as _json
    savings_names = _json.loads(savings_account_names)

    all_transactions = []

    for i, file in enumerate(files):
        ext = os.path.splitext(file.filename)[1].lower()
        account_name = account_names[i] if i < len(account_names) else file.filename
        account_type = account_types[i] if i < len(account_types) else 'Other'

        suffix = ext
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

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
                print(f"[{account_name}] Sample dates: {[t.get('date') for t in transactions[:5]]}")

            transactions = filter_by_month(transactions, month)
            print(f"[{account_name}] After filter: {len(transactions)} for month {month}")
        finally:
            os.unlink(tmp_path)

        all_transactions.extend(transactions)

    to_categorize = [t for t in all_transactions if not t.get('is_transfer')]
    transfers = [t for t in all_transactions if t.get('is_transfer')]

    categorized = categorize_transactions(to_categorize) if to_categorize else []

    for t in transfers:
        t['category'] = 'Transfer'
        t['confidence'] = 100
        t['needs_review'] = False

    all_categorized = categorized + transfers

    # balance with savings account names
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

    