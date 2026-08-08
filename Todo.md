# Flowdek Product Foundation — TODO

> Source of truth for the SaaS product-foundation corrections. Each item is
> tracked from requirement → phase → commit. Check off as work lands.

## Requirements (from review at commit `c6e1997`)

Flowdek is a **multi-user SaaS product**, not a demo project. Do not build the
full project/task backend yet — fix the foundation first.

1. **Remove the fake Prisma fallback** — `src/server/db/client.ts`. No
   Proxy/no-op. Let real failures surface. Standard dev singleton only.
2. **Production-safe demo seed** — `prisma/seed.ts` + `package.json`. Refuse
   to run when `NODE_ENV=production` or when
   `ALLOW_DESTRUCTIVE_SEED !== 'true'`. Rename script to `seed:demo`.
3. **Workspace tenant model** — add `Workspace` + `WorkspaceMember` (with
   `WorkspaceRole` enum). Add `workspaceId` to `Project`. Every project
   belongs to exactly one workspace.
4. **Separate job title from authorization roles** — `User.role` →
   `User.jobTitle` (display only). Permissions come from
   `WorkspaceMember.role` / `ProjectMember.role` (enums).
5. **Server-backed onboarding** — persist in PostgreSQL (not localStorage).
   One transaction creates Workspace + OWNER member + first project +
   preferences + completion state. Same account stays onboarded across
   devices.
6. **Authenticated user = application identity** — remove production
   dependency on `CURRENT_USER_ID = 'u5'`. Use `session.user.id` for task
   creation, comments, activity, time logs, files, notifications,
   assignments, audit events.
7. **Centralized authorization helpers** — `requireAuthenticatedUser()`,
   `requireWorkspaceMember(workspaceId)`, `requireWorkspaceRole(...)`,
   `requireProjectMember(projectId)`, `requireProjectRole(...)`. Must query
   the DB. Never trust frontend-sent userId/workspaceId/role.
8. **User-specific project favorites** — move `Project.isFavorite` to
   `ProjectMember` (or a preference model). One user favoriting must not
   affect others.
9. **Protect historical business data** — `Comment.author`, `File.uploadedBy`,
   `TimeLog.user` must not cascade-delete on user offboarding. Add user
   lifecycle (`ACTIVE`/`DISABLED`/`DELETED`) + `deletedAt`. Keep history
   attributable.
10. **Harden authentication** — stronger password policy, duplicate-email
    race handling (P2002), rate limiting on register + login, email
    verification foundation, password reset foundation, audit/security
    logging. Don't expose internal failures.
11. **Proper Prisma migrations** — commit reviewed migrations. `db:push` for
    local dev only.
12. **Backend-domain roadmap doc** — document which frontend domains still
    need persistence (Sections, Activity, Goals, KR, Saved filters,
    Notifications, Automations, Forms, Form submissions, Approvals, Budgets,
    Expenses, Timesheets, Comment reactions, Task followers, Custom fields,
    Task recurrence, Preferences, Invitations, …).
13. **Product-level auth tests** — registration (success / invalid /
    duplicate / email normalization / password hashed), credentials
    (valid / wrong password / unknown email / session contains user id / DB
    failure no fake success), destructive seed refuses production,
    onboarding owner created + persists across sessions, unauthorized
    workspace/project access rejected. Wired into `npm run test`.

## Verification gate

```bash
npm ci
npm run db:generate
npm run lint
npm run typecheck
npm run test
npm run build
npm run verify
```

Migration must apply to a clean PostgreSQL database. No disabled lint/TS
rules. No false success claims.

---

## Phased implementation plan

Each phase = one Conventional Commit after implementation + testing.

### Phase 1 — Database client + production-safe seed  (req 1, 2)
- [ ] Remove Proxy/no-op fallback from `src/server/db/client.ts`
- [ ] Add production guards to `prisma/seed.ts`
- [ ] Rename script `seed` → `seed:demo` in `package.json`
- [ ] Lint + manual run test
- **Commit:** `fix(db): remove fake prisma fallback and guard destructive seed`

### Phase 2 — Schema restructure + migration  (req 3, 4, 8, 9, 11)
- [ ] Add `Workspace`, `WorkspaceMember` models + `WorkspaceRole` enum
- [ ] Add `workspaceId` to `Project`
- [ ] `User.role` → `User.jobTitle`; add `User.status` lifecycle + `deletedAt`
- [ ] Move `Project.isFavorite` → `ProjectMember.isFavorite`
- [ ] Make `Comment.author`/`File.uploadedBy`/`TimeLog.user` `onDelete: SetNull`
      (keep attributable; add `authorName` snapshot where useful)
- [ ] Generate + commit PostgreSQL migration
- **Commit:** `feat(schema): add workspace tenant model and protect historical data`

### Phase 3 — Authorization helpers  (req 7)
- [ ] `src/server/auth/authorization.ts` with the five `require*` helpers
- [ ] Each queries the DB; throws typed `AuthError` on failure
- **Commit:** `feat(auth): add centralized workspace and project authorization helpers`

### Phase 4 — Server-backed onboarding  (req 5)
- [ ] `src/server/onboarding/service.ts` — transactional workspace+owner+project
- [ ] `POST /api/onboarding` route
- [ ] `User.onboardedAt` flag (source of truth, not localStorage)
- [ ] Rewire `useAuth.isOnboarded` to read session/server state
- **Commit:** `feat(onboarding): persist onboarding server-side in a transaction`

### Phase 5 — Authenticated user identity  (req 6)
- [ ] Remove `CURRENT_USER_ID = 'u5'` production path
- [ ] Store/derive current user from `session.user.id`
- **Commit:** `refactor(auth): use session user id instead of hard-coded current user`

### Phase 6 — Auth hardening  (req 10)
- [ ] Stronger password policy (length + class)
- [ ] P2002 unique-constraint handling on register
- [ ] Rate limiting (register + login) — simple in-memory bucket
- [ ] `emailVerifiedAt` + verification token foundation
- [ ] Password-reset token + expiry foundation
- [ ] Audit log table + helper
- [ ] Generic error messages (no internal leak)
- **Commit:** `feat(auth): harden registration and login for production`

### Phase 7 — Backend domain roadmap  (req 12)
- [ ] `docs/BACKEND_DOMAIN_ROADMAP.md`
- **Commit:** `docs: add backend domain persistence roadmap`

### Phase 8 — Auth/product tests  (req 13)
- [ ] Test file covering all listed cases
- [ ] Wired into `npm run test`
- **Commit:** `test(auth): add product-level auth and onboarding tests`

---

## Progress log

| Phase | Commit | Status |
|-------|--------|--------|
| 1 | `bd55ef4` | ✅ done |
| 2 | `bfc8f4c` | ✅ done |
| 3 | `09a7eb2` | ✅ done |
| 4 | `f6c875a` | ✅ done |
| 5 | `77d5866` | ✅ done |
| 6 | — | pending |
| 7 | — | pending |
| 8 | — | pending |
