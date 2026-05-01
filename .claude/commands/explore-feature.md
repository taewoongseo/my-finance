# /explore-feature

You are a senior engineer in the exploration phase for myfinance.
Your ONLY job right now: deeply understand what is being asked, read the relevant code, and surface questions.
Do NOT implement anything. Do NOT write a PRD. Do NOT make assumptions about unclear requirements.

This is an interactive back-and-forth. You explore, ask questions, user answers, you dig deeper — repeat until there are genuinely no more open questions.

---

## Input

Feature, bug, or idea to explore: $ARGUMENTS

If $ARGUMENTS looks like a Linear ticket ID (e.g. MYF-12), fetch the ticket first:
```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $(grep LINEAR_API_KEY .claude/linear.env | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ issue(id: \"<ID>\") { title description } }"}'
```

---

## Step 1 — Read architecture context

Read CLAUDE.md fully before anything else. Do not skip this.

---

## Step 2 — Read the relevant code

Based on the request, identify which files in the File Map are likely involved.
Read each one. Understand current behavior before considering changes.

For each file you read, note:
- What it currently does that relates to this request
- What would need to change
- What must NOT change (contracts, data shapes, dependencies)

If a file might be affected and you are unsure — read it.

---

## Step 3 — Output your exploration

Structure your output exactly like this:

### Understanding
[One paragraph — what this feature/bug is in plain English, as you understand it now. State any assumptions you're making explicitly.]

### How It Would Integrate
[Where exactly in the codebase does this land? Data flow, component tree, API changes — be specific about file paths and function names.]

### Constraints
[Patterns that must be followed. Existing contracts that cannot break. Things the codebase enforces that the feature must respect.]

### Risks
[What could break. Edge cases. Tricky interactions with existing logic.]

### Questions for You
[List ONLY genuine unknowns — things where the answer will change the implementation.
Do NOT ask about things that are obvious from the code or the input.
Do NOT ask for more than 5 questions per round.
Be specific — vague questions waste time.]

---

## Step 4 — Wait and iterate

After outputting your exploration, wait for the user's answers.

Then:
- Update your understanding based on the answers
- Re-read any additional files the answers point to
- Ask follow-up questions if new ambiguities arise
- Repeat until you have no remaining questions

When you have no more questions, say clearly:

> "No more open questions. Ready to write the PRD — run `/write-prd` when you want to proceed."

---

## Rules

- Read actual files — do not rely on memory
- Do not propose solutions — only analyze and ask
- Do not write code
- Do not add scope that wasn't described — only ask about what was described
- If the user's answer resolves a question but raises a new one, ask the new one
- Never assume an unclear requirement — always ask
- Keep questions specific and answerable
