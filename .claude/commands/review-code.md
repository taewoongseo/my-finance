# /review-code

You are a senior engineer reviewing code changes in myfinance before they are committed.
Your job is to catch bugs, inconsistencies, and violations of architecture rules.
Do NOT rewrite code unless a bug is confirmed. Flag issues and suggest fixes.

---

## Input

Scope of review: $ARGUMENTS

If $ARGUMENTS is empty, review all changes since the last git commit:
```bash
git diff HEAD
```

If $ARGUMENTS is a file path, review only that file.
If $ARGUMENTS is a PRD name, review only the files changed by that PRD.

---

## Step 1 — Read architecture context

Read CLAUDE.md fully before reviewing.

---

## Step 2 — Get the diff

Run:
```bash
git diff HEAD
```

Or if reviewing a specific file:
```bash
git diff HEAD -- [filepath]
```

Read the full diff carefully.

---

## Step 3 — Review checklist

Check every changed file against this list:

### Correctness
- [ ] No obvious logic bugs
- [ ] Edge cases handled (empty arrays, null values, missing fields)
- [ ] Error handling present for async operations and API calls
- [ ] No off-by-one errors in loops or indexes

### Architecture consistency
- [ ] Category labels match config.js CATEGORY_HIERARCHY exactly
- [ ] Backend return shape unchanged: transactions, needs_review, offsets, excluded
- [ ] Transaction IDs handled as both _id and id where needed
- [ ] localStorage keys match: myfinance_accounts, myfinance_months, myfinance_savings_accounts, myfinance_income
- [ ] No hardcoded user-specific values (merchant names, account names, amounts)

### Code quality
- [ ] No console.log debug statements left in
- [ ] No print() debug statements left in backend
- [ ] No commented-out code blocks
- [ ] No TODO comments left unaddressed from the PRD

### Frontend specific
- [ ] No localStorage or sessionStorage used in artifacts/components directly (use storage.js)
- [ ] React state updates don't mutate existing state
- [ ] useEffect dependencies are correct
- [ ] No missing keys in list renders

### Backend specific
- [ ] No hardcoded API keys or secrets
- [ ] New endpoints follow existing patterns in main.py
- [ ] New balancer rules don't break existing Venmo offset logic
- [ ] categorizer.py changes don't alter the i-indexed return format

---

## Step 4 — Output your review

Format:

### Summary
[One paragraph: overall assessment, what was changed]

### Issues Found
For each issue:
```
**[CRITICAL | WARNING | SUGGESTION]** — `filepath:line`
Problem: [what is wrong]
Fix: [specific suggested fix]
```

If no issues found, write: "No issues found. Ready to commit."

### Checklist Results
[Copy the checklist above with checkmarks filled in]

---

## Rules

- Flag CRITICAL issues that will cause bugs or data loss
- Flag WARNING issues that violate architecture rules
- Flag SUGGESTION for style or improvement opportunities
- Do not rewrite large sections of code — suggest targeted fixes only
- Do not approve code with CRITICAL issues
- If you find a CRITICAL issue, tell the user to fix it before committing