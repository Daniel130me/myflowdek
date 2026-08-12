# Flowdek Remaining Work — TODO

> Source of truth for all remaining implementation work.
> Current head: `5c82325`
> Items 1-14 below are DONE except item 10 (Realtime WebSocket).
> This file tracks what's left to build.

## Remaining Work

### 1. Realtime Updates (WebSocket)
- [ ] Set up socket.io mini-service on a separate port (e.g. 3003)
- [ ] `mini-services/realtime/index.ts` — socket.io server
- [ ] Emit events on task mutations (status_change, assign, comment)
- [ ] Frontend listens via `io("/?XTransformPort=3003")` and updates local state
- [ ] Notification delivery in real-time (replace polling)
- [ ] Connection auth: verify NextAuth session before joining workspace room
- **Commit:** `feat(realtime): add WebSocket for live updates`

### 2. Project Status Updates UI
- [ ] Wire the DashboardView to fetch from `GET /api/projects/:id/status-updates`
- [ ] Add status update form (text + color picker: green/yellow/red)
- [ ] Delete status update (DELETE)
- **Commit:** `feat(ui): wire project status updates to real API`

### 3. Custom Fields UI
- [ ] Wire the custom fields settings page to `GET/POST /api/projects/:id/custom-fields`
- [ ] Show custom field definitions (key, label, type, options)
- [ ] Create/edit/delete custom field definitions
- [ ] Show custom field values on task detail panel
- [ ] Edit custom field values on tasks (PATCH task)
- **Commit:** `feat(ui): wire custom fields to real API`

### 4. Saved Filters UI
- [ ] Wire the search filter bar to `GET/POST /api/users/me/saved-filters`
- [ ] Save current filters with a name
- [ ] List saved filters in a dropdown
- [ ] Apply a saved filter on click
- [ ] Delete saved filters
- **Commit:** `feat(ui): wire saved filters to real API`

### 5. DELETE /api/files/:fileId Route
- [ ] Create a dedicated DELETE route for file deletion
- [ ] Verify project membership
- [ ] Call `deleteFile()` (removes DB record + R2 object)
- [ ] Wire the frontend file deletion to this route (currently uses store only)
- **Commit:** `feat(api): add dedicated file deletion route`

### 6. Onboarding Preferences UI
- [ ] Read WorkspacePreference from the API (GET endpoint or include in session)
- [ ] Show preferences in workspace settings (defaultView, theme, enableNotifications)
- [ ] Save preferences (PATCH endpoint)
- **Commit:** `feat(ui): wire workspace preferences to real API`

### 7. Notification Type Icons
- [ ] Show different icons per notification type (bell, mention, assignment, reply)
- [ ] Show unread count in document title (e.g. "(3) FlowDeck")
- **Commit:** `feat(ui): add notification type icons and document title badge`

### 8. File Link/Unlink to Tasks
- [ ] Wire file linking/unlinking to the API (PATCH task with linkedTaskId)
- [ ] Currently the store does it locally but doesn't persist
- **Commit:** `feat(ui): wire file link/unlink to tasks via API`

### 9. Mobile Responsive Improvements
- [ ] Verify all new pages (settings, admin, verify-email, reset-password, invitations) are mobile-responsive
- [ ] Fix any layout issues on small screens
- **Commit:** `fix(ui): improve mobile responsiveness for new pages`

### 10. Production Deployment Configuration
- [ ] Create `render.yaml` or Dockerfile for Render deployment
- [ ] Document required environment variables
- [ ] Test `npm ci && npm run db:generate && npm run build` from clean checkout
- [ ] Set up cron job for `/api/cron/recurrence`
- **Commit:** `feat(deploy): add production deployment configuration`

---

## Progress log

| # | Item | Commit | Status |
|---|------|--------|--------|
| 1 | Realtime (WebSocket) | — | pending |
| 2 | Project status updates UI | — | pending |
| 3 | Custom fields UI | — | pending |
| 4 | Saved filters UI | — | pending |
| 5 | DELETE /api/files/:fileId route | — | pending |
| 6 | Onboarding preferences UI | — | pending |
| 7 | Notification type icons | — | pending |
| 8 | File link/unlink to tasks | — | pending |
| 9 | Mobile responsive improvements | — | pending |
| 10 | Production deployment config | — | pending |
