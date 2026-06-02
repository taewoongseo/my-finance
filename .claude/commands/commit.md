# /commit

You are committing staged and unstaged changes in myfinance with a well-formed git commit message.

---

## Input

Optional commit message: $ARGUMENTS

---

## Step 1 — Check there is something to commit

Run:
```bash
git status
git diff HEAD
```

If there are no changes (clean working tree), print:
```
Nothing to commit — working tree is clean.
```
And stop.

---

## Step 2 — Determine the commit message

If $ARGUMENTS is provided, use it as the commit message subject.

If $ARGUMENTS is empty, read the diff carefully and write a concise conventional-commit message:
- Format: `<type>: <short description>` where type is one of: feat, fix, chore, refactor, style, docs
- Subject line ≤ 72 characters
- Focus on WHY, not WHAT

Print the proposed message and ask the user to confirm or edit before committing.

---

## Step 3 — Stage and commit

Stage all modified, added, and deleted files by name (do NOT use `git add -A` — stage specific files to avoid accidentally including `.env` or other sensitive files).

This includes deleted files — `git add <path>` stages deletions too:

```bash
git add <specific files from the diff>
```

Commit using a HEREDOC to preserve formatting:
```bash
git commit -m "$(cat <<'EOF'
<commit message>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Step 4 — Confirm

Print:
```
✅ Committed: <short hash> — <commit message subject>
Run `/deploy` when ready to push and deploy.
```

---

## Rules

- NEVER amend a previous commit — always create a new one
- NEVER skip hooks (--no-verify)
- Do NOT push — that is `/deploy`'s job
- Do NOT commit `.env` files, `linear.env`, or files with secrets
- If a pre-commit hook fails, report the error and stop — do not retry with --no-verify
