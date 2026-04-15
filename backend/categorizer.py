import os
import json
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

CATEGORIES = [
    "Rent", "Insurance", "Groceries", "Dine out", "Drinks/snacks",
    "Uber", "Metro/Ferry", "Energy/Electricity", "Wifi", "Phone",
    "Household misc.", "Subscription", "Hobbies", "Shopping",
    "Offering", "Misc. Spending", "Income", "Savings", "Transfer", "Other"
]

SYSTEM_PROMPT = f"""You are a personal finance categorization assistant.
Given a list of bank transactions, assign each one a category and confidence score.

Available categories: {", ".join(CATEGORIES)}

Special rules:
- Venmo credits (money coming IN) = reduce spending in that category, mark type as "offset"
- Venmo debits with notes like "dinner", "food", or specific food name = Dine out
- AMZN/Amazon = Shopping unless description suggests otherwise
- Uber = Differentiate Uber Eats -> Dine out, Uber ride -> Uber
- Payroll/direct deposit = Income
- Transfers between own accounts = Transfer
- Zelle = will need to have human-in-the-loop unless the note is clear 

Return ONLY a JSON array with the same transactions plus two new fields:
- "category": one of the categories above
- "confidence": number 0-100

Return ONLY the JSON array, no explanation, no markdown."""

def categorize_transactions(transactions: list[dict]) -> list[dict]:
    # batch them all in one API call to save cost
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(transactions)}
        ],
        temperature=0,
    )

    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    categorized = json.loads(raw)

    # split into auto-approved and needs review
    for t in categorized:
        t["needs_review"] = t["confidence"] < 75

    return categorized