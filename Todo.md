# Flowdek Production Integration & Security Correction Pass — TODO

> 34-item production stabilization pass. No new features — make existing
> implementation internally consistent, production-safe, and fully connected.
> Current head: `dc65870`

## Phased implementation plan

### Phase 1 — Package/deployment (#1)
- [ ] Fix package.json scripts (add typecheck, test, check, verify, db:deploy)
- [ ] Regenerate package-lock.json
- [ ] Verify npm ci works
- **Commit:** `fix(deploy): synchronize package.json and lockfile`

### Phase 2 — Schema additions (#2.3, #20, #22, #24, #29)
- [ ] WorkspacePreference model
- [ ] CommentMention model
- [ ] User.sessionVersion field
- [ ] ProjectStatusUpdate, SavedFilter, CustomField, TaskCustomFieldValue, TaskRecurrence models
- [ ] Fix advanced model relations (Goal→Workspace, TimesheetEntry→Task, etc.)
- [ ] Migration
- **Commit:** `feat(schema): add preferences, mentions, session version, missing domains`

### Phase 3 — Authorization system (#4, #5)
- [ ] Centralized capability matrix (PROJECT_PERMISSIONS, WORKSPACE_PERMISSIONS)
- [ ] requireProjectCapability / requireWorkspaceCapability helpers
- [ ] Enforce on all write routes
- **Commit:** `feat(auth): add centralized capability-based authorization`

### Phase 4 — Onboarding fixes (#2.1, #2.2, #2.3, #2.4)
- [ ] Idempotency check inside transaction
- [ ] JWT session update callback (trigger === "update")
- [ ] Persist preferences (WorkspacePreference)
- [ ] Persist invitedMembers as Invitation records
- **Commit:** `fix(onboarding): idempotency, session refresh, preferences, invitations`

### Phase 5 — Token & session security (#23, #24, #25, #26)
- [ ] Hashed token storage (verification, reset, invitation)
- [ ] Session version check in requireAuthenticatedUser
- [ ] Production email safety (throw if no SendGrid in production)
- [ ] Disabled/deleted user session rejection
- **Commit:** `fix(security): hash tokens, enforce session version, safe production email`

### Phase 6 — Invitation flow (#3)
- [ ] Send invitation emails via SendGrid
- [ ] Token hashing for invitations
- [ ] Remove raw token from API responses
- **Commit:** `feat(invitations): send emails and hash tokens`

### Phase 7 — Data integrity (#6, #7, #8, #9, #10)
- [ ] Task assignee/parent/section validation
- [ ] Circular dependency prevention
- [ ] Approval validation (task belongs to project, approver is member)
- [ ] Timesheet validation (task belongs to project)
- [ ] Budget/expense validation (budget belongs to project)
- **Commit:** `fix(integrity): enforce relational and tenant validation on all writes`

### Phase 8 — API completeness (#11, #12, #13)
- [ ] Goals CRUD routes (get/update/delete, KR CRUD)
- [ ] Forms CRUD routes (get/patch/delete, submissions)
- [ ] Automation CRUD routes (update/toggle/delete)
- [ ] Automation execution engine (server-side, with loop guards)
- [ ] Approval resolve route
- [ ] Timesheet submit/approve routes
- [ ] Budget/expense full CRUD routes
- **Commit:** `feat(api): complete missing CRUD and automation execution`

### Phase 9 — Frontend→Backend wiring (#14, #15, #16, #17, #18, #19)
- [ ] Task mutations via API (moveStatus, toggleComplete, update, delete, quickAdd, bulk)
- [ ] Comment mutations via API (add, reply, edit, delete, reactions)
- [ ] File upload via R2 presign flow
- [ ] R2 upload intent security
- [ ] Activity feed from API
- [ ] Notifications UI (list, badge, mark read)
- **Commit:** `feat(ui): wire all mutations to backend APIs`

### Phase 10 — Advanced frontend hooks (#21)
- [ ] useGoals, useApprovals, useForms, useAutomations, useBudgets, useTimesheets
- [ ] Replace mock store data with API hooks
- **Commit:** `feat(ui): wire advanced features to real backend`

### Phase 11 — Missing domains (#22)
- [ ] Project status updates (model + API + hook)
- [ ] Saved filters (model + API + hook)
- [ ] Custom fields (model + API + hook)
- [ ] Task recurrence (field on Task)
- **Commit:** `feat(domains): persist status updates, saved filters, custom fields`

### Phase 12 — Mention handling (#20)
- [ ] CommentMention model (structured mentions)
- [ ] API accepts mentionedUserIds array
- [ ] Notification creation from actual user IDs
- **Commit:** `fix(mentions): structured mention model and notification`

### Phase 13 — LocalStorage removal (#30)
- [ ] Remove business data from LocalStorage persistence
- [ ] Server is authoritative on reload
- **Commit:** `refactor(store): remove LocalStorage as authoritative persistence`

### Phase 14 — Testing (#31)
- [ ] Auth tests (disabled/deleted user, session version, token expiry/single-use)
- [ ] Onboarding tests (idempotency, preferences, invitations)
- [ ] Authorization tests (VIEWER/MEMBER/ADMIN/OWNER capabilities)
- [ ] Integrity tests (cross-project, circular)
- [ ] Persistence/refresh test
- **Commit:** `test: add production integration and security tests`

### Phase 15 — CI (#32)
- [ ] GitHub Actions workflow (lint, typecheck, test, build)
- **Commit:** `ci: add GitHub Actions workflow`

### Phase 16 — Documentation (#33)
- [ ] Honest status in Todo.md and BACKEND_DOMAIN_ROADMAP.md
- **Commit:** `docs: honest implementation status update`

---

## Progress log

| Phase | Commit | Status |
|-------|--------|--------|
| 1 | `c6c1d19` | ✅ done |
| 2 | `2903860` | ✅ done |
| 3 | `dbd1cd3` | ✅ done |
| 4 | `b3a9503` | ✅ done |
| 5 | `dbd1cd3` | ✅ done |
| 6 | `b3a9503` | ✅ done |
| 7 | `d8238c2` | ✅ done |
| 8 | `d362139` | ✅ done |
| 9 | `4b44d8d` | ✅ done |
| 10 | `295ce68` | ✅ done |
| 11 | `295ce68` | ✅ done |
| 12 | `295ce68` | ✅ done |
| 13 | `295ce68` | ✅ done |
| 14 | `7c85988` | ✅ done (19 new integration tests: idempotency, capability matrix, cross-project integrity, persistence, session version) |
| 15 | `7c85988` | ✅ done (CI workflow file pushed) |
| 16 | `273b2b4` | ✅ done |
