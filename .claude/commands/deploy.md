# /deploy

You are deploying myfinance to production.

- **Frontend** → Vercel (auto-deploys on push to `main`)
- **Backend** → Google Cloud Run (`myfinance-backend`, `us-central1`, project `myfinance-496100`)

---

## Input

Optional scope: $ARGUMENTS

- If empty → detect which layers changed and deploy only those
- `frontend` → push only (skip backend deploy)
- `backend` → gcloud deploy only (skip push)
- `all` → push + gcloud deploy regardless of what changed

---

## Step 1 — Check for uncommitted changes

Run:
```bash
git status
```

If there are uncommitted changes, print:
```
⚠️  You have uncommitted changes. Run `/commit` first.
```
And stop.

---

## Step 2 — Detect what changed since last deploy

Run:
```bash
git diff origin/main..HEAD --name-only
```

Classify changed files:
- Any file under `frontend/` → **frontend changed**
- Any file under `backend/` → **backend changed**

If $ARGUMENTS overrides detection, use the override instead.

---

## Step 3 — Push to main (frontend deploy)

If frontend changed (or scope is `all`):

```bash
git push origin main
```

Print:
```
✅ Pushed to main — Vercel will auto-deploy frontend.
   Track at: https://vercel.com/taewoongseo/myfinance-ai-app
```

---

## Step 4 — Deploy backend to Cloud Run

If backend changed (or scope is `all`):

```bash
cd backend && gcloud run deploy myfinance-backend \
  --source . \
  --region us-central1 \
  --project myfinance-496100
```

This takes ~2–3 minutes. Wait for it to complete.

On success, print:
```
✅ Backend deployed to Cloud Run.
   Service URL: https://myfinance-backend-647353833439.us-central1.run.app
```

On failure, print the gcloud error and stop — do not retry automatically.

---

## Step 5 — Summary

Print a final summary of what was deployed:

```
## Deploy Summary

Frontend: ✅ Pushed (Vercel deploying) | ⏭️  Skipped (no frontend changes)
Backend:  ✅ Cloud Run deployed        | ⏭️  Skipped (no backend changes)
```

---

## Rules

- NEVER force-push (`--force`)
- NEVER push to a branch other than `main` without asking the user
- If there are no changes to push (already up to date), say so and stop
- If gcloud is not authenticated, print: `Run: gcloud auth login` and stop
