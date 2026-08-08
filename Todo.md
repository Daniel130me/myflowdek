# Flowdek Real Project Backend & Frontend Migration — TODO

> Source of truth for the project-backend and mock-to-real frontend migration.
> Each item is tracked from requirement → phase → commit.
>
> Previous work (foundation + workspace/invitation management, commits up to
> `ff02c14`) is complete.

## 3. Real Project backend

Implement:

```
GET    /api/workspaces/:workspaceId/projects
POST   /api/workspaces/:workspaceId/projects

GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
DELETE /api/projects/:projectId

POST   /api/projects/:projectId/archive
POST   /api/projects/:projectId/restore
```

And member management:

```
GET    /api/projects/:projectId/members
POST   /api/projects/:projectId/members
PATCH  /api/projects/:projectId/members/:userId
DELETE /api/projects/:projectId/members/:userId
```

All routes must use the authorization helpers (`requireAuthenticatedUser`,
`requireWorkspaceRole`, `requireProjectMember`, `requireProjectRole`).

Create project flow:
```
requireAuthenticatedUser()
    ↓
requireWorkspaceRole(OWNER | ADMIN | MEMBER)
    ↓
create Project (ownerId = session user, NOT from browser)
    ↓
create ProjectMember (OWNER)
```

**Do not accept an arbitrary `ownerId` from the browser.**

## 4. Replace mock portfolio data with real projects

Target:
```
Login
 ↓
PostgreSQL user
 ↓
Workspace
 ↓
GET /api/workspaces/:id/projects
 ↓
Real projects
```

Migrate feature-by-feature (not a big-bang rewrite), in this order:

1. Workspace selector
2. Project portfolio / list
3. Project overview
4. Tasks
5. Tags / sections
6. Comments / activity
7. Files

---

## Phased implementation plan

Each phase = one Conventional Commit after implementation + testing, then push.

### Phase 1 — Project backend APIs  (req 3)
- [ ] `src/server/projects/workspace-projects.service.ts` — list/create by workspace
- [ ] `src/server/projects/project.service.ts` — get/update/delete/archive/restore
- [ ] `src/server/projects/project-members.service.ts` — list/add/update/remove
- [ ] API routes for all endpoints above
- [ ] ownerId from session only; all routes use authorization helpers
- [ ] Lint + typecheck + curl tests
- **Commit:** `feat(projects): add project CRUD and member management APIs`

### Phase 2 — Workspace selector  (req 4a)
- [ ] Fetch workspaces from `GET /api/workspaces`
- [ ] Workspace switcher UI (dropdown in sidebar/topbar)
- [ ] Persist selected workspace (cookie or localStorage + URL param)
- [ ] Redirect to selected workspace's projects
- **Commit:** `feat(ui): add workspace selector backed by real API`

### Phase 3 — Project portfolio/list  (req 4b)
- [ ] Replace mock `INITIAL_PROJECTS` with `GET /api/workspaces/:id/projects`
- [ ] PortfolioView reads real projects
- [ ] Create project via `POST /api/workspaces/:id/projects`
- **Commit:** `feat(ui): replace mock portfolio with real projects API`

### Phase 4 — Project overview  (req 4c)
- [ ] DashboardView reads real project + task data
- **Commit:** `feat(ui): wire project overview to real backend data`

### Phase 5 — Tasks  (req 4d)
- [ ] Task list/sheet/board views use real tasks
- **Commit:** `feat(ui): wire task views to real backend data`

### Phase 6 — Tags/sections  (req 4e)
- [ ] Tags and sections from real data
- **Commit:** `feat(ui): wire tags and sections to real backend data`

### Phase 7 — Comments/activity  (req 4f)
- [ ] Comments and activity from real data
- **Commit:** `feat(ui): wire comments and activity to real backend data`

### Phase 8 — Files  (req 4g)
- [ ] Files from real data
- **Commit:** `feat(ui): wire files to real backend data`

---

## Progress log

| Phase | Commit | Status |
|-------|--------|--------|
| 1 | `eef035b` | ✅ done |
| 2 | `81acf1d` | ✅ done |
| 3 | `34cf8cb` | ✅ done |
| 4 | `28ea07f` | ✅ done |
| 5 | `5d27425` | ✅ done |
| 6 | — | pending |
| 7 | — | pending |
| 8 | — | pending |
