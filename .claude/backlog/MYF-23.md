---
id: MYF-23
title: Full UI redesign + Budget & Overview screens
type: feature
status: backlog
linear_url: https://linear.app/myfinance/issue/MYF-23/full-ui-redesign-budget-and-overview-screens
created: 2026-06-01
---

## What
A full visual redesign of all existing screens plus two net-new screens (`/budget` and `/overview`) based on the design handoff in `frontend/design_handoff_budgets_redesign/`.

## Gap Analysis (current app vs. design)

### Net-new (additive, no regression risk)
- `/budget` route + `BudgetScreen.js` — global budget editor (per-subcategory targets, income + savings target)
- `/overview` route + `OverviewScreen.js` — months × categories heatmap vs budget
- `getBudget()` / `saveBudget()` storage helpers in `storage.js`
- Month-over-month % chip on HomeScreen MonthCards
- `CategoryBar` (colored segment bar) on HomeScreen MonthCards
- Sidebar nav in dashboard (All months, Reprocess, Overview, recent months mini-list)
- Hero band in dashboard (cash flow 44px stat, top category)
- DM Sans + JetBrains Mono fonts via Google Fonts
- Category → color map (`housing #c8f04a`, `food #ff8a7a`, etc.)

### Restyled (existing, regression risk)
- `App.js` HomeScreen — empty state + with-data layout
- `Step1Upload.js` — custom MonthPicker popover (replaces native `<select>`), SourceToggle (Upload / Auto sync), AccountCard redesign
- `Step3Dashboard.js` — 2-col sidebar + main layout, CategorySection/TxRow/income/savings cards

### Explicitly unchanged
- `Step2Review.js` (review step not in design scope)
- Backend, Clerk auth, Plaid flow, `config.js` categories, `storage.js` (additive only)

## Suggested Phasing
1. Fonts + design tokens (foundation, no risk)
2. HomeScreen redesign (low risk)
3. BudgetScreen — new, additive, safe to ship early
4. OverviewScreen — new, additive, safe to ship early
5. Upload screen redesign (medium risk — MonthPicker is non-trivial)
6. Dashboard redesign (highest risk — layout restructure + sidebar)

## Affected Files
- `frontend/src/App.js`
- `frontend/src/components/Step1Upload.js`
- `frontend/src/components/Step3Dashboard.js`
- `frontend/src/components/BudgetScreen.js` (new)
- `frontend/src/components/OverviewScreen.js` (new)
- `frontend/src/utils/storage.js`
- `frontend/public/index.html` (font imports)
- `frontend/src/config.js` (category color map)

## Risks / Notes
- Custom MonthPicker (24-month popover, year-grouped) is the most complex new component in the upload redesign
- Dashboard 2-col layout restructure is the highest regression risk — touches aggregation display, offset editing, income/savings editing
- Overview heatmap needs cross-month per-subcategory aggregation (new computation, but read-only)
- Design is pixel-faithful fidelity — cannot be rushed
- `Step2Review.js` is not in scope; the upload → review → dashboard flow is preserved
