# /write-prd

You are producing a minimal, clear PRD based on the full explore-feature conversation that just happened.
Your job: capture exactly what was decided — nothing more, nothing less.
Do NOT add scope that was not explicitly confirmed. Do NOT make implementation decisions that were not discussed.

---

## Input

Optional: $ARGUMENTS can be a Linear ticket ID (e.g. `MYF-7`).
If not provided, infer the ticket ID from the explore-feature conversation (it is usually stated early on).
If no ticket ID can be determined, derive a short slug from the feature name (e.g. `csv-export`).

---

## Step 1 — Synthesize the conversation

Review the entire explore-feature exchange: the original request, your analysis, and all Q&A with the user.
Extract only what was explicitly confirmed or clarified.
If something was discussed but left unresolved, do NOT include it as a task.

---

## Step 2 — Write the PRD file

If a Linear ticket ID is known (e.g. `MYF-7`), **overwrite** `.claude/backlog/<TICKET_ID>.md`.
If no ticket ID is known, save to `.claude/backlog/<slug>.md`.

Use this exact template:

```markdown
# PRD: <Feature Name>

**Ticket:** <Linear ID if known, else —>
**Status:** 🟡 In Progress
**Created:** <today's date>

---

## TL;DR
[One or two sentences. What this is and why it matters.]

---

## Problem
[What is currently broken or missing? Be concrete — describe user-visible behavior, not code.]

---

## Solution
[What will be built. High-level, plain English. No implementation details yet.]

---

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | [first small step] | ⬜ Not started |
| 2 | [second small step] | ⬜ Not started |
| ... | ... | ... |

**Status legend:**
- ⬜ Not started
- 🟡 In progress
- ✅ Done
- ❌ Blocked

---

## Out of Scope
[Anything explicitly ruled out during exploration. If nothing was ruled out, write "Nothing explicitly excluded."]

---

## Files That Will Change
[List each file path and one line describing what changes]

---

## Open Questions
[Anything still unresolved. If none, write "None."]
```

---

## Step 3 — Break tasks correctly

Tasks must be:
- Small enough to complete in one focused session
- Ordered so each one is buildable on the previous
- Scoped to exactly what was discussed — no extras

Bad task: "Implement the feature"
Good task: "Add `exportToCsv(transactions)` to `utils/storage.js`"

If you are unsure how to break a task down, write one coarser task rather than guessing at sub-tasks.

---

## Step 4 — Update the Linear issue description

If a ticket ID is known, update the Linear issue description with the full PRD content.

Read `LINEAR_API_KEY` from `.claude/linear.env`.

First, fetch the issue's internal UUID:
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ issue(id: \"<TICKET_ID>\") { id } }"}'
```

Then update the description:
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }",
    "variables": {
      "id": "<INTERNAL_UUID>",
      "input": { "description": "<FULL_PRD_MARKDOWN>" }
    }
  }'
```

---

## Step 5 — Confirm

Print:
```
✅ PRD written: .claude/backlog/<filename>.md
✅ Linear <TICKET_ID> description updated
Tasks: <N> tasks, all ⬜ Not started
Run `/execute-prd .claude/backlog/<filename>.md` to begin implementation.
```

---

## Rules

- Only include what was confirmed in the explore-feature exchange
- Do not add tasks for "nice to have" things not discussed
- Do not add error handling, tests, or refactors unless explicitly requested
- Keep each task description concrete enough that execute-prd can act on it without ambiguity
- Always overwrite the existing backlog file — never create a separate `-prd.md` file
