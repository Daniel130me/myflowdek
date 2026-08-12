# Flowdek Remaining Work — TODO

> Source of truth for all remaining implementation work. Updated after
> the production correction pass and frontend wiring phases.
> Current head: `5e3c4c8`

## Remaining Frontend Pages & UI

### 1. Workspace Settings Page
- [ ] `/settings` route within the product layout
- [ ] Rename workspace (PATCH /api/workspaces/:id)
- [ ] Manage workspace members (list, change role, remove)
- [ ] Manage invitations (list pending, revoke, resend)
- [ ] Workspace preferences (defaultView, theme, enableNotifications)
- [ ] Danger zone: delete workspace, transfer ownership
- **Commit:** `feat(ui): add workspace settings page`

### 2. Project Member Management Panel
- [ ] Member list with roles (GET /api/projects/:id/members)
- [ ] Add member (POST — select from workspace members)
- [ ] Change role (PATCH /api/projects/:id/members/:userId)
- [ ] Remove member / leave project (DELETE)
- [ ] Only OWNER/ADMIN can manage
- **Commit:** `feat(ui): add project member management panel`

### 3. Activity Feed in Task Detail Panel
- [ ] Replace mock store activity with `useTaskActivity` hook
- [ ] Show timeline: "X created this task", "Y changed status to…"
- [ ] Auto-refresh after mutations (append new entries)
- **Commit:** `feat(ui): wire activity feed to real API in task detail`

### 4. Files View — R2 Upload Flow
- [ ] Wire the file upload UI to POST /api/projects/:id/files/presign
- [ ] Upload directly to R2 using the presigned URL
- [ ] Call POST /api/projects/:id/files/confirm after upload
- [ ] Wire file deletion to DELETE (removes DB + R2 object)
- [ ] Wire file link/unlink to tasks (PATCH task sectionId)
- [ ] Remove fake metadata creation from the store
- **Commit:** `feat(ui): wire files view to R2 upload flow`

### 5. Search Bar Integration in TopBar
- [ ] Wire the existing TopBar search input to open the GlobalSearch overlay
- [ ] Support Ctrl+K / Cmd+K keyboard shortcut
- [ ] Connect search results to navigation
- **Commit:** `feat(ui): integrate global search into TopBar`

### 6. Notification Navigation
- [ ] Click a notification → navigate to the related project/task
- [ ] Show notification type icon (bell, mention, assignment)
- [ ] Unread count in document title (e.g. "(3) FlowDeck")
- **Commit:** `feat(ui): add notification click-to-navigate`

## Remaining Backend Hardening

### 7. Invitation Token Hashing
- [ ] Hash invitation tokens with SHA-256 (same as verification/reset)
- [ ] Store hash in DB, email raw token
- [ ] Update accept/decline to hash submitted token before lookup
- [ ] Remove raw token from API responses (return only invitation details)
- **Commit:** `fix(security): hash invitation tokens`

### 8. Rate Limiting on All Mutation Endpoints
- [ ] Add rate limiting to: task create, comment create, file presign
- [ ] Reuse the existing rate-limit utility
- [ ] Document limits in a constants file
- **Commit:** `fix(security): add rate limiting to mutation endpoints`

### 9. Task Recurrence Execution
- [ ] Background job that checks for completed recurring tasks
- [ ] Creates the next occurrence based on recurrence pattern (daily/weekly/monthly)
- [ ] Uses the existing computeNextDate helper
- **Commit:** `feat(tasks): implement recurrence execution`

### 10. Realtime Updates (WebSocket)
- [ ] Set up socket.io mini-service on a separate port
- [ ] Emit events on task mutations (status_change, assign, comment)
- [ ] Frontend listens and updates local state
- [ ] Notification delivery in real-time
- **Commit:** `feat(realtime): add WebSocket for live updates`

## Remaining Testing

### 11. Frontend Integration Tests
- [ ] Test: create task → DB contains task → edit → DB updated → refresh → persists
- [ ] Test: add comment → DB contains comment → refresh → persists
- [ ] Test: file upload metadata confirmation
- [ ] Test: task status update flow
- **Commit:** `test: add frontend integration tests`

### 12. Permission Boundary Tests
- [ ] VIEWER cannot create/edit/delete tasks
- [ ] VIEWER cannot manage project settings
- [ ] MEMBER can create tasks but cannot delete project
- [ ] ADMIN can manage settings but cannot transfer ownership
- [ ] Cross-workspace access blocked
- **Commit:** `test: add permission boundary tests`

## Remaining Documentation

### 13. Update IMPLEMENTATION_STATUS.md
- [ ] Mark all completed items as ✅
- [ ] Add the new frontend pages (auth, admin, search, notifications)
- [ ] Update test count (60 tests)
- [ ] Update CI status (workflow pushed)
- **Commit:** `docs: update implementation status to reflect current state`

### 14. API Documentation
- [ ] Document all endpoints in docs/API_REFERENCE.md
- [ ] Include request/response shapes
- [ ] Document authorization requirements per endpoint
- **Commit:** `docs: add API reference documentation`

---

## Progress log

| # | Item | Commit | Status |
|---|------|--------|--------|
| 1 | Workspace settings page | — | pending |
| 2 | Project member management | — | pending |
| 3 | Activity feed in task detail | — | pending |
| 4 | Files view R2 upload flow | — | pending |
| 5 | Search bar integration | — | pending |
| 6 | Notification navigation | — | pending |
| 7 | Invitation token hashing | — | pending |
| 8 | Rate limiting on mutations | — | pending |
| 9 | Task recurrence execution | — | pending |
| 10 | Realtime (WebSocket) | — | pending |
| 11 | Frontend integration tests | — | pending |
| 12 | Permission boundary tests | — | pending |
| 13 | Update IMPLEMENTATION_STATUS | — | pending |
| 14 | API documentation | — | pending |
