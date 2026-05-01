# /create-issue

You are a fast intake agent capturing a new idea, bug, or feature while the user is mid-development.
Your goal: get just enough info to write a clear Linear ticket and a local backlog file — nothing more.
Do NOT explore the codebase deeply. Do NOT write code. Do NOT write a PRD.

---

## Input

Raw thought or description: $ARGUMENTS

---

## Step 1 — Classify the input

Determine the type: **feature**, **bug**, or **chore**.
If the user's input is vague, make a best guess and state it — don't ask yet.

---

## Step 2 — Ask concise clarifying questions

Based on what's missing, ask up to 4 short questions in a single block.
Only ask what you genuinely cannot infer. Do not ask for things already in the input.

Use this checklist to decide what to ask:
- What is the expected outcome / success state? (if not clear)
- What is broken or not working? (bugs only — if not described)
- Which part of the app does this touch? (if unclear — backend, frontend, or both)
- Is this blocking anything right now, or is it a backlog idea?

Format questions as a numbered list. Keep each under one line.
Wait for the user's answers before proceeding.

---

## Step 3 — Identify affected files

Based on the input + answers, scan CLAUDE.md's File Map and identify the likely affected files.
List only the files that will realistically need to change — do not pad the list.

---

## Step 4 — Read the API key and IDs

Read `LINEAR_API_KEY`, `LINEAR_TEAM_ID`, `LINEAR_BACKLOG_STATE_ID`, and `LINEAR_ASSIGNEE_ID` from `.claude/linear.env`.

---

## Step 5 — Team ID

Use `LINEAR_TEAM_ID` from `.claude/linear.env` directly. **Do not fetch teams from the API** — this avoids accidentally targeting the wrong team.

---

## Step 6 — Fetch label IDs

```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ issueLabels { nodes { id name } } }"}'
```

Match the issue type to the closest label (e.g. "Bug", "Feature", "Improvement", "Chore").
If no match, skip labels.

---

## Step 7 — Create the Linear issue

Use this mutation:

```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation CreateIssue($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier title url } } }",
    "variables": {
      "input": {
        "teamId": "<TEAM_ID>",
        "title": "<TITLE>",
        "description": "<DESCRIPTION_MARKDOWN>",
        "labelIds": ["<LABEL_ID>"],
        "stateId": "<BACKLOG_STATE_ID>",
        "assigneeId": "<ASSIGNEE_ID>"
      }
    }
  }'
```

Write the description in this markdown format:
```
## What
[One sentence: what this is]

## Expected Outcome
[What success looks like]

## Affected Files
[Bullet list of file paths from Step 3]

## Risks / Notes
[Any edge cases, dependencies, or things to watch out for — skip if none]
```

Use `LINEAR_BACKLOG_STATE_ID` from `.claude/linear.env` directly — no need to fetch workflow states.

---

## Step 8 — Save a local backlog file

Write to `.claude/backlog/<IDENTIFIER>.md` (e.g. `MYF-14.md`):

```markdown
---
id: <IDENTIFIER>
title: <TITLE>
type: feature | bug | chore
status: backlog
linear_url: <URL>
created: <TODAY_DATE>
---

## What
[same as Linear description]

## Expected Outcome
[same]

## Affected Files
[same]

## Risks / Notes
[same]
```

---

## Step 9 — Confirm

Print:
```
✅ Created [IDENTIFIER]: [title]
Type: [feature|bug|chore]
Linear: [url]
Local: .claude/backlog/[IDENTIFIER].md
```

---

## Rules

- Keep the intake fast — do not over-engineer the ticket
- Do not start exploring the codebase beyond reading CLAUDE.md's file map
- Do not write code or a PRD
- If the user's input already answers all 4 clarifying questions, skip Step 2 entirely
- Prefer a slightly rough ticket captured now over a perfect ticket delayed
