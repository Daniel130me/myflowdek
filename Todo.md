# Flowdek Workspace Management & Invitations — TODO

> Source of truth for the workspace-management and invitation-system work.
> Each item is tracked from requirement → phase → commit. Check off as work
> lands.
>
> Previous foundation phases (1–8, commits `bd55ef4` → `941ae10`) are complete.
> This file now tracks the next priority: letting users actually manage
> workspaces and invite teammates.

## 1. Workspace management

Flowdek's core hierarchy is now:

```
Account
   │
   ├── Workspace A
   │      ├── Team
   │      ├── Projects
   │      └── Settings
   │
   └── Workspace B
          ├── Team
          ├── Projects
          └── Settings
```

Implement:

- Create workspace
- List workspaces the authenticated user belongs to
- Get workspace details
- Rename / update workspace
- Workspace settings
- Switch between workspaces
- Leave workspace
- Delete workspace — owner only, with safeguards
- Transfer workspace ownership
- Workspace member listing
- Workspace roles: Owner, Admin, Member, Guest

Example APIs:

```
GET    /api/workspaces
POST   /api/workspaces

GET    /api/workspaces/:workspaceId
PATCH  /api/workspaces/:workspaceId
DELETE /api/workspaces/:workspaceId

GET    /api/workspaces/:workspaceId/members
PATCH  /api/workspaces/:workspaceId/members/:userId
DELETE /api/workspaces/:workspaceId/members/:userId
```

## 2. Real invitation system

```
Workspace owner/admin
        ↓
Enter email
        ↓
Choose role
        ↓
Invitation created
        ↓
Email sent
        ↓
Recipient follows token
        ↓
Existing user → join
New user → register → join
        ↓
WorkspaceMember created
```

Statuses:

- PENDING
- ACCEPTED
- DECLINED
- EXPIRED
- REVOKED

Endpoints:

```
POST   /api/workspaces/:workspaceId/invitations
GET    /api/workspaces/:workspaceId/invitations
DELETE /api/workspaces/:workspaceId/invitations/:id

GET    /api/invitations/:token
POST   /api/invitations/:token/accept
POST   /api/invitations/:token/decline
```

---

## Phased implementation plan

Each phase = one Conventional Commit after implementation + testing, then push.

### Phase 1 — Workspace CRUD APIs  (req 1a)
- [ ] `src/server/workspaces/service.ts` — create/list/get/update/delete
- [ ] `src/server/workspaces/schemas.ts` — Zod validation
- [ ] `GET/POST /api/workspaces`, `GET/PATCH/DELETE /api/workspaces/:id`
- [ ] Delete safeguard: owner-only, block if other members exist (or require transfer first)
- [ ] Use `requireAuthenticatedUser` + `requireWorkspaceRole` helpers
- [ ] Lint + typecheck + curl tests
- **Commit:** `feat(workspaces): add workspace CRUD APIs`

### Phase 2 — Workspace membership management  (req 1b)
- [ ] `GET /api/workspaces/:id/members` — list members
- [ ] `PATCH /api/workspaces/:id/members/:userId` — change role
- [ ] `DELETE /api/workspaces/:id/members/:userId` — remove member (leave = remove self)
- [ ] Transfer ownership endpoint: `POST /api/workspaces/:id/transfer`
- [ ] Role-change guards (only OWNER can change roles; can't demote the last owner)
- [ ] Switch workspace: client-side selected-workspace state + `POST /api/workspaces/:id/select` (sets a cookie/preference)
- **Commit:** `feat(workspaces): add membership management and ownership transfer`

### Phase 3 — Invitation system  (req 2)
- [ ] Add `Invitation` model + `InvitationStatus` enum to schema + migration
- [ ] `src/server/invitations/service.ts` — create/list/revoke/get-by-token/accept/decline
- [ ] `POST/GET/DELETE /api/workspaces/:id/invitations`
- [ ] `GET /api/invitations/:token`, `POST /api/invitations/:token/accept`, `/decline`
- [ ] Accept flow: existing user → create WorkspaceMember; new user → redirect to register (token preserved)
- [ ] Expiry (24h TTL), status transitions, audit logging
- [ ] Lint + typecheck + curl tests
- **Commit:** `feat(invitations): add workspace invitation system`

---

## Progress log

| Phase | Commit | Status |
|-------|--------|--------|
| 1 | `ff834bc` | ✅ done |
| 2 | `0d8a970` | ✅ done |
| 3 | — | pending |
