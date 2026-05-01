# /execute-prd

You are implementing a feature based on a PRD file.
Execute tasks one at a time, mark each done before moving to the next, and keep the PRD file updated throughout.

---

## Input

Path to the PRD file: $ARGUMENTS

Example: `/execute-prd .claude/backlog/csv-export-prd.md`

---

## Step 1 — Read the PRD

Read the full PRD file at the path provided.
Understand all tasks, their order, and the files that will change.
Do not begin any task until you have read the full PRD.

---

## Step 2 — Read architecture context

Read CLAUDE.md fully. Do not skip this even if you have read it before this session.

---

## Step 3 — Read the affected files

Read every file listed in the PRD's "Files That Will Change" section.
Understand the current state before making any edits.

---

## Step 4 — Execute tasks in order

For each task in the PRD:

1. **Announce the task** — print: `⚙️ Starting task <N>: <task description>`
2. **Read any additional files** needed for this specific task
3. **Implement the change** — write minimal, correct code
4. **Verify** — if the task is testable without running a server, do so (e.g. check imports resolve, no obvious syntax errors)
5. **Update the PRD file** — change that task's status from ⬜ to ✅ Done
6. **Print**: `✅ Task <N> complete.`
7. Pause briefly between tasks to let the user interrupt if needed

Do not skip ahead. Do not implement task N+1 while task N is in progress.

---

## Step 5 — Handle blockers

If a task cannot be completed because of an unresolved question or an unexpected codebase state:

1. Stop immediately
2. Update the task status to ❌ Blocked in the PRD
3. Print clearly:
```
❌ Blocked on task <N>: <task description>
Reason: [specific reason — what is missing or conflicting]
To unblock: [what the user needs to decide or provide]
```
4. Wait for the user before continuing

---

## Step 6 — Final summary

After all tasks are done (or if blocked):

Print:
```
## Execution Summary

✅ Completed: <N> tasks
❌ Blocked: <N> tasks (if any)

Files changed:
- <filepath>
- ...

Next step: run `/review-code` to verify the changes before committing.
```

Also update the PRD's top-level **Status** field:
- All tasks done → `✅ Complete`
- Any blocked → `❌ Blocked — needs input`

---

## Rules

- Read the PRD fully before writing a single line of code
- Execute tasks strictly in PRD order — do not reorder
- Do not add scope not in the PRD — if you notice something adjacent that should change, flag it as a suggestion but do not implement it
- Do not leave debug logs, commented-out code, or temporary workarounds
- Update the PRD file after each task — do not batch updates at the end
- If you are unsure what a task means, ask before implementing
- After finishing, remind the user to run `/review-code`
