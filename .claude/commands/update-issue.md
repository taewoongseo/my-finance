# /update-issue

You are updating a Linear ticket status for myfinance.
This command is used after completing a phase of work (exploration done, PRD written, code complete, etc.)

---

## Input

Format: $ARGUMENTS should be: [ticket-id] [new-status]

Examples:
  /update-issue MYF-12 in-progress
  /update-issue MYF-12 done
  /update-issue MYF-12 cancelled

Valid statuses: backlog, todo, in-progress, in-review, done, cancelled

---

## Step 1 — Read API key

Read LINEAR_API_KEY from `.claude/linear.env`.

---

## Step 2 — Get workflow states

Fetch available states for the team:
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ workflowStates { nodes { id name type } } }"}'
```

Match the requested status to the closest workflow state ID.

---

## Step 3 — Update the ticket

```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success issue { id identifier title state { name } } } }",
    "variables": {
      "id": "<ISSUE_ID>",
      "input": {
        "stateId": "<STATE_ID>"
      }
    }
  }'
```

---

## Step 4 — Update local backlog file

Find the corresponding file in `.claude/backlog/` and update the status field.

---

## Step 5 — Confirm

Print:
```
✅ Updated [ticket-id]: [title] → [new status]
[Linear URL]
```

---

## Rules

- Only update the status field — do not modify ticket title or description
- If ticket ID is not found, say so clearly and stop
- If status is invalid, list the valid options and stop