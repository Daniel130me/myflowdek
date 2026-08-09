# Flowdek Advanced Features — TODO

> Source of truth for the advanced feature backend implementation.
> Previous work (admin system — commit `cd0f0b6`) is complete.

## Advanced features to implement

1. Goals / OKRs
2. Approvals
3. Forms (intake + submissions)
4. Automations (trigger-action rules)
5. Timesheets
6. Budgets + Expenses
7. Advanced dashboards (workload/capacity, portfolio reporting)
8. AI assistant

---

## Phased implementation plan

### Phase 1 — Schema: add all advanced models + migration
- [ ] Goal, KeyResult
- [ ] ApprovalRequest
- [ ] Form, FormSubmission
- [ ] AutomationRule
- [ ] TimesheetEntry
- [ ] Budget, Expense
- [ ] Back-relations on User + Project
- [ ] Generate + apply migration
- **Commit:** `feat(schema): add goals, approvals, forms, automations, timesheets, budgets`

### Phase 2 — Goals / OKRs API
- [ ] service + routes (CRUD for goals + key results)
- **Commit:** `feat(goals): add goals and key results CRUD APIs`

### Phase 3 — Approvals API
- [ ] service + routes (create, list, approve/reject)
- **Commit:** `feat(approvals): add approval request APIs`

### Phase 4 — Forms API
- [ ] service + routes (CRUD for forms + submissions)
- **Commit:** `feat(forms): add form and submission APIs`

### Phase 5 — Automations API
- [ ] service + routes (CRUD for rules)
- **Commit:** `feat(automations): add automation rule APIs`

### Phase 6 — Timesheets API
- [ ] service + routes (CRUD for entries)
- **Commit:** `feat(timesheets): add timesheet entry APIs`

### Phase 7 — Budgets + Expenses API
- [ ] service + routes (CRUD for budgets + expenses)
- **Commit:** `feat(budgets): add budget and expense APIs`

### Phase 8 — Advanced dashboards (workload, portfolio, AI assistant)
- [ ] Workload/capacity endpoint
- [ ] Portfolio reporting endpoint
- [ ] AI assistant endpoint (uses z-ai-web-dev-sdk)
- **Commit:** `feat(dashboards): add workload, portfolio, and AI assistant endpoints`

---

## Progress log

| Phase | Commit | Status |
|-------|--------|--------|
| 1 | — | pending |
| 2 | — | pending |
| 3 | — | pending |
| 4 | — | pending |
| 5 | — | pending |
| 6 | — | pending |
| 7 | — | pending |
| 8 | — | pending |
