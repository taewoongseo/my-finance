from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from dotenv import load_dotenv
from pdf_parser import parse_statement, parse_venmo_csv, parse_generic_csv
from categorizer import categorize_transactions
from balancer import balance_transactions
from plaid_client import client as plaid_client
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from pydantic import BaseModel
from datetime import datetime, date
import calendar
from concurrent.futures import ThreadPoolExecutor
import asyncio
import tempfile
import os
import json
import uvicorn
import hashlib

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

def fetch_plaid_transactions(access_token: str, account_id: str, account_name: str, account_type: str, month: str) -> list[dict]:
    try:
        year, mon = map(int, month.split('-'))
        start = date(year, mon, 1)
        end = date(year, mon, calendar.monthrange(year, mon)[1])
        options = TransactionsGetRequestOptions(account_ids=[account_id])
        response = plaid_client.transactions_get(
            TransactionsGetRequest(access_token=access_token, start_date=start, end_date=end, options=options)
        )
        result = []
        for t in response["transactions"]:
            raw_amount = float(t["amount"])
            result.append({
                '_id': t["transaction_id"],
                'date': str(t["date"]),
                'description': t.get("merchant_name") or t["name"],
                'amount': abs(raw_amount),
                'type': 'debit' if raw_amount >= 0 else 'credit',
                'account': account_name,
                'account_type': account_type,
            })
        return result
    except Exception as e:
        print(f"[{account_name}] Plaid fetch error: {e}")
        return []


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LinkTokenRequest(BaseModel):
    access_token: Optional[str] = None

class ExchangeTokenRequest(BaseModel):
    public_token: str


@app.get("/")
def root():
    return {"status": "myfinance backend running"}


@app.post("/plaid/link-token")
async def create_link_token(body: LinkTokenRequest = None):
    try:
        kwargs = dict(
            client_name="myfinance",
            country_codes=[CountryCode("US")],
            language="en",
            user=LinkTokenCreateRequestUser(client_user_id="myfinance-user"),
        )
        if body and body.access_token:
            kwargs["access_token"] = body.access_token
        else:
            kwargs["products"] = [Products("transactions")]
        request = LinkTokenCreateRequest(**kwargs)
        response = plaid_client.link_token_create(request)
        return {"link_token": response["link_token"]}
    except Exception as e:
        return {"error": str(e)}, 502


@app.post("/plaid/exchange-token")
async def exchange_token(body: ExchangeTokenRequest):
    try:
        exchange_response = plaid_client.item_public_token_exchange(
            ItemPublicTokenExchangeRequest(public_token=body.public_token)
        )
        access_token = exchange_response["access_token"]

        accounts_response = plaid_client.accounts_get(
            AccountsGetRequest(access_token=access_token)
        )
        accounts = [
            {
                "account_id": a["account_id"],
                "name": a["name"],
                "official_name": a.get("official_name"),
                "type": str(a["type"]),
                "subtype": str(a["subtype"]),
            }
            for a in accounts_response["accounts"]
        ]
        return {"access_token": access_token, "accounts": accounts}
    except Exception as e:
        return {"error": str(e)}, 502


@app.post("/upload")
async def upload_files(
    files: Optional[List[UploadFile]] = File(default=None),
    account_names: Optional[List[str]] = Form(default=None),
    account_types: Optional[List[str]] = Form(default=None),
    month: str = Form(...),
    savings_account_names: str = Form(default='[]'),
    plaid_accounts: str = Form(default='[]'),
):
    savings_names = json.loads(savings_account_names)
    plaid_account_list = json.loads(plaid_accounts)
    files = files or []
    account_names = account_names or []
    account_types = account_types or []
    seen_file_hashes = set()

    # read all files first (must be done in async context)
    file_infos = []
    for i, file in enumerate(files):
        account_name = account_names[i] if i < len(account_names) else file.filename
        account_type = account_types[i] if i < len(account_types) else 'Other'
        ext = os.path.splitext(file.filename)[1].lower()

        contents = await file.read()

        file_hash = hashlib.md5(contents).hexdigest()
        if file_hash in seen_file_hashes:
            print(f"  [dedup] Skipping duplicate file: {file.filename}")
            continue
        seen_file_hashes.add(file_hash)

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

    # fetch Plaid transactions for connected accounts (parallel, non-blocking)
    if plaid_account_list:
        plaid_tasks = [
            loop.run_in_executor(executor, fetch_plaid_transactions,
                pa['access_token'], pa['account_id'], pa['account_name'], pa['account_type'], month)
            for pa in plaid_account_list
        ]
        plaid_results = await asyncio.gather(*plaid_tasks)
        for txns in plaid_results:
            all_transactions.extend(txns)

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

    rent_transactions = [t for t in clean if 'rent' in t.get('description', '').lower() or t.get('category') == 'Rent']
    print(f"RENT DEBUG: {rent_transactions}")

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