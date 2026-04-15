from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from dotenv import load_dotenv
from pdf_parser import parse_statement, parse_venmo_csv, parse_generic_csv
from categorizer import categorize_transactions
import tempfile, os, uvicorn

load_dotenv()

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
):
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
        finally:
            os.unlink(tmp_path)

        all_transactions.extend(transactions)

    # only send non-transfer transactions to LLM categorizer
    to_categorize = [t for t in all_transactions if not t.get('is_transfer')]
    transfers = [t for t in all_transactions if t.get('is_transfer')]

    categorized = categorize_transactions(to_categorize) if to_categorize else []

    # mark transfers
    for t in transfers:
        t['category'] = 'Transfer'
        t['confidence'] = 100
        t['needs_review'] = False

    all_final = categorized + transfers
    needs_review = [t for t in all_final if t.get('needs_review')]
    auto_approved = [t for t in all_final if not t.get('needs_review')]

    return {
        "transactions": all_final,
        "needs_review": needs_review,
        "auto_approved": auto_approved,
        "count": len(all_final),
        "month": month,
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)