# Flowdek Core Production Correction Pass 3 — TODO

> 74-item focused correction pass. No new features, no R2 work.
> Current head: `5c82325`

## P0 — Critical (must pass before anything else)

### Phase 1 — Restore Prisma migration history (#1-2)
- [ ] Restore 5 deleted migration directories from Git history
- [ ] Verify `prisma migrate deploy` works on clean PostgreSQL
- [ ] Do NOT reset Neon
- **Commit:** `fix(db): restore deleted prisma migration history`

### Phase 2 — Fix package.json / lockfile / Render (#3-5)
- [ ] Restore correct package.json (name=flowdeck, scripts, no db push --accept-data-loss)
- [ ] Regenerate package-lock.json via `npm install`
- [ ] Verify `npm ci` from clean state
- [ ] Document Render build/start commands
- **Commit:** `fix(deploy): correct package.json and lockfile for Render`

### Phase 3 — Fix GitHub Actions CI (#6-7)
- [ ] Replace SQLite DATABASE_URL with PostgreSQL service container
- [ ] CI sequence: npm ci → db:generate → migrate deploy → lint → typecheck → test → build
- **Commit:** `fix(ci): use PostgreSQL service container in GitHub Actions`

### Phase 4 — Enforce capabilities on HTTP routes (#8-11)
- [ ] POST /tasks: requireProjectCapability CREATE_TASK (not just membership)
- [ ] PATCH /tasks/:id: requireProjectCapability EDIT_TASK
- [ ] DELETE /tasks/:id: requireProjectCapability DELETE_TASK
- [ ] Bulk: map each action to appropriate capability
- [ ] Audit ALL write routes: replace requireProjectMember with capabilities
- **Commit:** `fix(auth): enforce capabilities on all mutation routes`

### Phase 5 — Fix nested-resource IDOR (#12-18)
- [ ] Goal routes: verify goal.workspaceId === route workspaceId
- [ ] Form routes: verify form.projectId === route projectId
- [ ] Automation routes: verify automation.projectId === route projectId
- [ ] Budget routes: verify budget.projectId === route projectId
- [ ] Expense creation: derive projectId from budget, not from request
- [ ] KeyResult routes: verify KR.goalId === goalId AND goal.workspaceId === workspaceId
- [ ] Section/tag/custom-field routes: verify parent ownership
- **Commit:** `fix(security): enforce nested-resource parent ownership validation`

### Phase 6 — Fix dependency graph (#23)
- [ ] Replace first-branch traversal with proper DFS
- [ ] Add branching cycle regression test (B→C, B→D, D→A, then A→B must be rejected)
- **Commit:** `fix(tasks): implement proper DFS for circular dependency detection`

### Phase 7 — Centralize workspace/project state (#24-27)
- [ ] Single authoritative selectedWorkspaceId (WorkspaceProvider)
- [ ] Workspace switch refreshes all consumers
- [ ] Real projects replace mock state.projects
- [ ] Direct project URL works after refresh (fetch from API, not mock 404)
- **Commit:** `feat(state): centralize workspace and project state`

### Phase 8 — Canonical server IDs + optimistic rollback (#28-31)
- [ ] API client returns server entity on create
- [ ] Task temp ID replaced with server ID after POST
- [ ] Comment/section ID reconciliation
- [ ] Optimistic rollback on API failure (task edit, delete, comment, tag, bulk)
- **Commit:** `fix(state): canonical server IDs and optimistic rollback`

### Phase 9 — Core task persistence (#32-39)
- [ ] toggleComplete: persist PATCH, no browser recurrence copy
- [ ] quickAddTask: use API, reconcile server ID
- [ ] Dependency link/unlink: use API
- [ ] Promote/demote subtask: PATCH parentId
- [ ] Task move: use backend move operation
- [ ] Duplicate: create via API or disable
- [ ] Undo/redo: disable for persisted mutations
- **Commit:** `fix(tasks): persist all core task mutations via API`

### Phase 10 — Restore automation execution (#40-42)
- [ ] Restore executeAutomations in task.service (was accidentally removed)
- [ ] Trigger: task_created, status_change, task_completed, priority_change, assignee_change
- [ ] Automation actions use domain validation (not raw db.task.update)
- **Commit:** `fix(automations): restore execution engine in task service`

### Phase 11 — Cron security + recurrence lineage (#43-44)
- [ ] CRON_SECRET fails closed in production
- [ ] Add recurrenceSourceId field (don't use parentId for recurrence)
- **Commit:** `fix(security): cron fails closed + separate recurrence lineage`

## P1 — Important

### Phase 12 — Invitation continuation (#45-46)
- [ ] Honor ?redirect=/invitations/:token after login
- [ ] Preserve redirect through registration
- **Commit:** `feat(auth): invitation redirect continuation`

### Phase 13 — Finish advanced pages (#47-50)
- [ ] Goals: KR update/delete wired, parent hierarchy validation
- [ ] Forms: update form, load submissions
- [ ] Budgets: load expenses, update budget, delete expense
- [ ] Timesheets: update entry, submit, approve
- **Commit:** `feat(ui): finish advanced page callbacks`

### Phase 14 — Project overview + task detail persistence (#51-55)
- [ ] Overview: project update, favorite, archive, members, status updates via API
- [ ] Task detail: remove mock activity fallback
- [ ] Task detail: persist reactions via API
- [ ] Task detail: persist time logs via API
- [ ] Comment thread mapping (parentId, editedAt, replies, reactions)
- **Commit:** `feat(ui): persist project overview and task detail mutations`

### Phase 15 — My Tasks / Inbox (#56-57)
- [ ] GET /api/tasks/my — tasks assigned to session.user.id across projects
- [ ] Wire My Tasks to this API
- [ ] Inbox uses /api/notifications
- **Commit:** `feat(ui): wire My Tasks and Inbox to real APIs`

### Phase 16 — Mock identity removal (#58-60)
- [ ] TopBar: use session.user data instead of TEAM/CURRENT_USER_ID
- [ ] Sidebar: remove hardcoded demo user names
- [ ] Assignee selection: use real ProjectMember data
- **Commit:** `refactor(ui): remove mock identity from production UI`

### Phase 17 — Historical business data (#61-63)
- [ ] Approval: requester/approver onDelete: SetNull
- [ ] Timesheet: userId nullable, onDelete: SetNull
- [ ] Add missing relations (Goal→Workspace, Timesheet→Task, etc.)
- [ ] One new forward migration
- **Commit:** `fix(schema): protect historical business data from user deletion`

### Phase 18 — Tests (#65-74)
- [ ] HTTP route authorization tests (VIEWER 403, MEMBER allowed, etc.)
- [ ] Nested-resource IDOR tests
- [ ] Branching dependency cycle test
- [ ] Canonical-ID integration test
- [ ] Rollback test
- [ ] Project direct-load test
- [ ] Automation regression tests
- [ ] Cron security test
- **Commit:** `test: add production correction pass 3 tests`

---

## Progress log

| Phase | Item | Commit | Status |
|-------|------|--------|--------|
| 1 | Restore migrations | — | pending |
| 2 | Fix package/lockfile | — | pending |
| 3 | Fix CI | — | pending |
| 4 | Enforce capabilities | — | pending |
| 5 | Nested-resource IDOR | — | pending |
| 6 | Dependency graph DFS | — | pending |
| 7 | Centralize state | — | pending |
| 8 | Canonical IDs + rollback | — | pending |
| 9 | Core task persistence | — | pending |
| 10 | Restore automation execution | — | pending |
| 11 | Cron security + recurrence | — | pending |
| 12 | Invitation continuation | — | pending |
| 13 | Finish advanced pages | — | pending |
| 14 | Overview + task detail | — | pending |
| 15 | My Tasks / Inbox | — | pending |
| 16 | Mock identity removal | — | pending |
| 17 | Historical data | — | pending |
| 18 | Tests | — | pending |
