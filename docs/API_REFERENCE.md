# Flowdeck API Reference

> Last updated: commit `47e6a8a`

## Authentication

All endpoints (except auth routes and public invitation view) require a valid NextAuth session cookie.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register a new user (sends verification email) |
| `/api/auth/verify-email` | POST | Verify email with token |
| `/api/auth/resend-verification` | POST | Resend verification email |
| `/api/auth/forgot-password` | POST | Request password reset email |
| `/api/auth/reset-password` | POST | Reset password with token |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handler (login, logout, session) |

## Workspaces

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/workspaces` | GET | Authenticated | List user's workspaces |
| `/api/workspaces` | POST | Authenticated | Create a workspace (creator = OWNER) |
| `/api/workspaces/:id` | GET | Member | Get workspace details |
| `/api/workspaces/:id` | PATCH | OWNER/ADMIN | Rename workspace |
| `/api/workspaces/:id` | DELETE | OWNER | Delete workspace (safeguard: no other members) |
| `/api/workspaces/:id/members` | GET | Member | List workspace members |
| `/api/workspaces/:id/members/:userId` | PATCH | OWNER/ADMIN | Change member role |
| `/api/workspaces/:id/members/:userId` | DELETE | OWNER/ADMIN or self | Remove member / leave |
| `/api/workspaces/:id/transfer` | POST | OWNER | Transfer ownership |
| `/api/workspaces/:id/invitations` | GET | OWNER/ADMIN | List invitations |
| `/api/workspaces/:id/invitations` | POST | OWNER/ADMIN | Create invitation + send email |
| `/api/workspaces/:id/invitations/:invId` | DELETE | OWNER/ADMIN | Revoke invitation |
| `/api/workspaces/:id/goals` | GET/POST | Member/OWNER+ADMIN | List/create goals |
| `/api/workspaces/:id/goals/:goalId` | GET/PATCH/DELETE | Member/OWNER+ADMIN | Goal CRUD |
| `/api/workspaces/:id/goals/:goalId/key-results` | POST | OWNER+ADMIN | Add key result |
| `/api/workspaces/:id/goals/:goalId/key-results/:krId` | PATCH/DELETE | OWNER+ADMIN | KR update/delete |
| `/api/workspaces/:id/reports/portfolio` | GET | Member | Portfolio report |

## Projects

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/workspaces/:wsId/projects` | GET/POST | Member | List/create projects |
| `/api/projects/:id` | GET/PATCH/DELETE | Member / OWNER+ADMIN | Project CRUD |
| `/api/projects/:id/archive` | POST | OWNER/ADMIN | Archive project |
| `/api/projects/:id/restore` | POST | OWNER/ADMIN | Restore project |
| `/api/projects/:id/members` | GET/POST | Member / OWNER+ADMIN | List/add members |
| `/api/projects/:id/members/:userId` | PATCH/DELETE | OWNER+ADMIN / self | Change role / remove |
| `/api/projects/:id/tasks` | GET/POST | Member | List/create tasks |
| `/api/projects/:id/tasks/bulk` | POST | Member/OWNER+ADMIN | Bulk operations |
| `/api/projects/:id/sections` | GET/POST | Member | List/create sections |
| `/api/projects/:id/sections/:secId` | PATCH/DELETE | Member | Update/delete section |
| `/api/projects/:id/tags` | GET/POST | Member | List/create tags |
| `/api/projects/:id/comments` | GET/POST | Member | List/create comments |
| `/api/projects/:id/files` | GET/POST | Member | List files / create metadata |
| `/api/projects/:id/files/presign` | POST | Member | Get R2 presigned upload URL |
| `/api/projects/:id/files/confirm` | POST | Member | Confirm upload + store metadata |
| `/api/projects/:id/files/:budgetId` | GET/POST/DELETE | VIEW/MANAGE | Expenses + delete budget |
| `/api/projects/:id/budgets` | GET/POST | VIEW/MANAGE | List/create budgets |
| `/api/projects/:id/forms` | GET/POST | VIEW/MANAGE | List/create forms |
| `/api/projects/:id/forms/:formId` | GET/PATCH/DELETE | VIEW/MANAGE | Form CRUD |
| `/api/projects/:id/forms/:formId/submissions` | GET/POST | VIEW/VIEW | List/submit form |
| `/api/projects/:id/automations` | GET/POST | VIEW/MANAGE | List/create automations |
| `/api/projects/:id/automations/:autoId` | PATCH/DELETE | MANAGE | Update/delete automation |
| `/api/projects/:id/approvals` | GET/POST | Member | List/create approvals |
| `/api/projects/:id/status-updates` | GET/POST | VIEW/CREATE_COMMENT | List/create status updates |
| `/api/projects/:id/custom-fields` | GET/POST | VIEW/MANAGE_PROJECT | List/create custom fields |
| `/api/projects/:id/reports/workload` | GET | VIEW | Per-member workload |

## Tasks

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/tasks/:taskId` | GET/PATCH/DELETE | Project member | Task CRUD |
| `/api/tasks/:taskId/dependencies` | GET/POST/DELETE | Project member | Manage dependencies |
| `/api/tasks/:taskId/tags` | GET/POST/DELETE | Project member | Manage task tags |
| `/api/tasks/:taskId/followers` | GET/POST/DELETE | Project member | Follow/unfollow |
| `/api/tasks/:taskId/activity` | GET | Project member | Activity feed |

## Comments

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/comments/:commentId` | PATCH/DELETE | Author/Manager | Edit/delete comment |
| `/api/comments/:commentId/reactions` | POST/DELETE | Project member | Add/remove reaction |

## Files

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/files/:fileId/download` | GET | Project member | Get presigned download URL |

## Invitations

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/invitations/:token` | GET | Public | View invitation details |
| `/api/invitations/:token/accept` | POST | Authenticated | Accept invitation |
| `/api/invitations/:token/decline` | POST | Authenticated | Decline invitation |

## Notifications

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/notifications` | GET | Authenticated | List + unread count |
| `/api/notifications/:id/read` | PATCH | Authenticated (owner) | Mark as read |
| `/api/notifications/read-all` | POST | Authenticated | Mark all as read |

## Timesheets

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/timesheets` | GET/POST | Authenticated | List/create entries |
| `/api/timesheets/submit` | POST | Authenticated | Submit for approval |
| `/api/timesheets/approve` | POST | OWNER/ADMIN | Approve entries |

## Search

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/search` | GET | Authenticated | Search across projects/tasks/people/files |

## AI

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/ai/assistant` | POST | Authenticated | AI assistant with task context |

## Admin (SUPER_ADMIN only)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/overview` | GET | SUPER_ADMIN | Platform metrics |
| `/api/admin/users` | GET | SUPER_ADMIN | All users |
| `/api/admin/workspaces` | GET | SUPER_ADMIN | All workspaces |
| `/api/admin/audit` | GET | SUPER_ADMIN | Audit events |
| `/api/admin/health` | GET | SUPER_ADMIN | System health |

## Cron

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/cron/recurrence` | POST | CRON_SECRET | Process recurring tasks |

## Health

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | Public | Database health check |
